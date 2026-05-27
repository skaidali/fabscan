// ./js/scan.js

function initScanPage() {
    console.log("Page Scanner chargée !");

    // Éléments HTML
    var form = document.getElementById('entry-form');
    var userIdInput = document.getElementById('current-user-id');
    var btnValider = document.getElementById('btn-valider');
    var msgBox = document.getElementById('scan-message');
    var autoModeToggle = document.getElementById('auto-mode-toggle');
    var manualSearch = document.getElementById('manual-search');
    var datalist = document.getElementById('users-list');

    // Éléments du Panneau Gauche
    var panelCard = document.getElementById('user-panel');
    var panelName = document.getElementById('panel-name');
    var panelStatus = document.getElementById('panel-status');
    var panelEmail = document.getElementById('panel-email');
    var panelRfid = document.getElementById('panel-rfid');

    // Chronomètre pour le scan
    var chronometreScan = null;
    
	// ==========================================
    // 0. GESTION VISUELLE DU MODE AUTOMATIQUE
    // ==========================================
    autoModeToggle.addEventListener('change', function() {
        var champCommentaire = document.getElementById('commentaire');
        
        if (this.checked) {
            // MODE AUTO ACTIVÉ
            
            // On grise l'opacité de tout le formulaire
            form.style.opacity = "0.5";
            
            // On désactive les champs inutiles en mode auto
            manualSearch.disabled = true;
            champCommentaire.disabled = true;
            
            // On cache le bouton de validation manuel
            btnValider.style.display = "none"; 
            
            // On affiche un petit message rassurant
            msgBox.style.color = "var(--primary)";
            msgBox.innerHTML = "<i class='fa-solid fa-robot'></i> Mode Automatique en cours d'écoute...";
        } else {
            // MODE AUTO DÉSACTIVÉ (Retour à la normale)
            
            form.style.opacity = "1";
            
            manualSearch.disabled = false;
            champCommentaire.disabled = false;
            btnValider.style.display = "flex"; 
            
            msgBox.innerHTML = "";
        }
    });

    // ==========================================
    // 1. AFFICHAGE DES INFOS UTILISATEUR
    // ==========================================
    function afficherProfil(user) {
        userIdInput.value = user.id;
        
        panelName.textContent = user.prenom + " " + user.nom;
        panelStatus.textContent = user.statut;
        panelEmail.textContent = user.email || "Non renseigné";
        
        if (user.has_rfid) {
            panelRfid.innerHTML = "<span style='color:var(--success);'><i class='fa-solid fa-check'></i> Oui</span>";
        } else {
            panelRfid.innerHTML = "<span style='color:var(--danger);'><i class='fa-solid fa-xmark'></i> Non</span>";
        }

        // On change la couleur de la bordure du haut pour faire joli
        panelCard.style.borderTopColor = "var(--primary)";
        
        // On active le bouton de validation
        btnValider.disabled = false;
        msgBox.innerHTML = "";
    }

    // ==========================================
    // 2. SOUMISSION DE L'ENTRÉE (Manuel ou Auto)
    // ==========================================
    function enregistrerEntree(motif, zone, commentaire) {
        var id = userIdInput.value;
        if (!id) return;

        fetch('/api/add_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: id,
                type_projet: motif,
                zone_travail: zone,
                commentaire: commentaire
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                msgBox.style.color = "var(--success)";
                msgBox.innerHTML = "<i class='fa-solid fa-check'></i> Entrée validée pour " + data.prenom + " !";
                
                // Nettoyage après 3 secondes
                setTimeout(function() {
                    form.reset();
                    userIdInput.value = "";
                    btnValider.disabled = true;
                    panelName.textContent = "En attente de scan...";
                    panelStatus.textContent = "-";
                    panelEmail.textContent = "-";
                    panelRfid.textContent = "-";
                    panelCard.style.borderTopColor = "var(--gray)";
                    msgBox.innerHTML = "";
                }, 3000);
            }
        });
    }

    // Soumission Manuelle
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var motif = document.getElementById('motif').value;
        var zone = document.getElementById('zone').value;
        var commentaire = document.getElementById('commentaire').value;
        enregistrerEntree(motif, zone, commentaire);
    });


    // ==========================================
    // 3. ÉCOUTE PERMANENTE DU LECTEUR RFID/QR
    // ==========================================
    function verifierDernierScan() {
        // Si on a changé de page, on coupe l'écoute (Kill Switch)
        if (!document.body.contains(panelName)) {
            clearInterval(chronometreScan);
            return;
        }

        fetch('/api/get_last_scan')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            // SI on a détecté une carte !
            if (data.success && data.id_carte) {
                
                // On va chercher qui c'est
                fetch('/api/user_info?id=' + data.id_carte)
                .then(function(resUser) { return resUser.json(); })
                .then(function(userData) {
                    if (userData.success) {
                        afficherProfil(userData.data);

                        // MAGIE DU MODE AUTO : On valide direct sans cliquer !
                        if (autoModeToggle.checked) {
                            var motifAuto = document.getElementById('motif').value;
                            var zoneAuto = document.getElementById('zone').value;
                            enregistrerEntree(motifAuto, zoneAuto, "Mode Auto");
                        }
                    } else {
                        // Carte inconnue
                        msgBox.style.color = "var(--danger)";
                        msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Carte Inconnue ! Allez dans 'Inscription'.";
                    }
                });
            }
        });
    }
    
    // On lance la boucle d'écoute toutes les secondes
    chronometreScan = setInterval(verifierDernierScan, 1000);

    // ==========================================
    // 4. RECHERCHE MANUELLE (Sans badge)
    // ==========================================
    // Quand on tape dans la barre de recherche
    manualSearch.addEventListener('input', function(e) {
        var texte = e.target.value;
        
        // On demande au serveur uniquement si on a tapé au moins 3 lettres
        if (texte.length >= 3) {
            fetch('/api/search_users?q=' + encodeURIComponent(texte))
            .then(function(res) { return res.json(); })
            .then(function(data) {
                datalist.innerHTML = ""; // On vide la liste
                if (data.success) {
                    data.items.forEach(function(u) {
                        var option = document.createElement('option');
                        option.value = u.id; // L'id technique
                        option.textContent = u.texte; // Le joli nom affiché
                        datalist.appendChild(option);
                    });
                }
            });
        }
    });

    // Quand l'utilisateur a fini de taper ou a sélectionné quelqu'un
    manualSearch.addEventListener('change', function(e) {
        var idChoisi = e.target.value;
        if (idChoisi.length > 5) { // Un ID système fait plus de 5 caractères
            fetch('/api/user_info?id=' + idChoisi)
            .then(function(res) { return res.json(); })
            .then(function(userData) {
                if (userData.success) {
                    afficherProfil(userData.data);
                    manualSearch.value = ""; // On vide la barre de recherche
                }
            });
        }
    });
}