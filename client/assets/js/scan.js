// ./js/scan.js

function initScanPage() {
    console.log("Page Scanner chargée (Moteur Unifié)");

    // Éléments HTML
    var form = document.getElementById('entry-form');
    var userIdInput = document.getElementById('current-user-id');
    var btnValider = document.getElementById('btn-valider');
    var msgBox = document.getElementById('scan-message');
    var autoModeToggle = document.getElementById('auto-mode-toggle');
    var manualSearch = document.getElementById('manual-search');
    var datalist = document.getElementById('users-list');

    // Panneau Gauche
    var panelCard = document.getElementById('user-panel');
    var panelName = document.getElementById('panel-name');
    var panelStatutDetail = document.getElementById('panel-statut-detail');
    var panelSolde = document.getElementById('panel-solde');
    var panelRfid = document.getElementById('panel-rfid');
    var panelCertifList = document.getElementById('panel-certifications-list');
    
    var champCommentaire = document.getElementById('commentaire');
    var champMotif = document.getElementById('motif'); 
    var champZone = document.getElementById('zone');   
    var listeCertificationsConfig = [];
    
    // Gestion du throttling pour éviter les doubles scans
    var lastAutoEntryTime = 0;
    var AUTO_ENTRY_THROTTLE_MS = 3000; // 3 secondes minimum entre deux entrées auto

    // ==========================================
    // 0. CHARGEMENT DE LA CONFIGURATION (Avec gestion d'échec)
    // ==========================================
    fetch('/api/config')
    .then(function(res) { 
        if (!res.ok) throw new Error("Erreur serveur");
        return res.json(); 
    })
    .then(function(resultat) {
        if (resultat.success) {
            var config = resultat.data;
            listeCertificationsConfig = config.certifications || [];
            champMotif.innerHTML = "";
            config.motifs.forEach(function(m) { champMotif.innerHTML += `<option value="${m}">${m}</option>`; });
            champZone.innerHTML = "";
            config.zones.forEach(function(z) { champZone.innerHTML += `<option value="${z}">${z}</option>`; });
        } else {
            throw new Error(resultat.error || "Données invalides");
        }
    })
    .catch(function(err) {
        console.error("Échec du chargement de la config:", err);
        msgBox.style.color = "var(--danger)";
        msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Erreur de configuration. Veuillez recharger la page.";
        champMotif.innerHTML = "<option value=''>Erreur de chargement</option>";
        champZone.innerHTML = "<option value=''>Erreur de chargement</option>";
    });

    // ==========================================
    // 1. GESTION VISUELLE DU MODE AUTOMATIQUE
    // ==========================================
    // Restaurer l'état du mode auto depuis localStorage
    if (localStorage.getItem('fablabAutoMode') === 'true') { 
        window.fablabAutoMode = true;
        autoModeToggle.checked = true; 
        activerModeAutoUI(); 
    }
    
    autoModeToggle.addEventListener('change', function() {
        window.fablabAutoMode = this.checked;
        // Persévérer l'état dans localStorage
        localStorage.setItem('fablabAutoMode', this.checked);
        this.checked ? activerModeAutoUI() : desactiverModeAutoUI();
    });

    function activerModeAutoUI() {
        form.style.opacity = "0.5"; manualSearch.disabled = true; champCommentaire.disabled = true;
        champMotif.disabled = true; champZone.disabled = true; btnValider.style.display = "none";
        msgBox.style.color = "var(--primary)"; msgBox.innerHTML = "<i class='fa-solid fa-robot'></i> Mode Auto actif...";
    }
    
    function desactiverModeAutoUI() {
        form.style.opacity = "1"; manualSearch.disabled = false; champCommentaire.disabled = false;
        champMotif.disabled = false; champZone.disabled = false; btnValider.style.display = "flex"; msgBox.innerHTML = "";
    }

    // ==========================================
    // 2. RÉINITIALISATION ET AFFICHAGE DU PROFIL
    // ==========================================
    function resetUI() {
        form.reset(); userIdInput.value = ""; btnValider.disabled = true;
        panelName.textContent = "En attente de scan...";
        if (panelStatutDetail) panelStatutDetail.textContent = "-";
        if (panelSolde) { panelSolde.textContent = "-"; panelSolde.className = ""; }
        panelRfid.textContent = "-"; panelCard.style.borderTopColor = "var(--gray)";
        msgBox.innerHTML = window.fablabAutoMode ? "<i class='fa-solid fa-robot'></i> Mode Auto actif..." : "";
    }

    function afficherProfil(user) {
        userIdInput.value = user.id;
        panelName.textContent = user.prenom + " " + user.nom;
        if (panelStatutDetail) panelStatutDetail.textContent = user.statut || "-";
        
        if (panelSolde) {
            var solde = user.montant || 0.0;
            panelSolde.textContent = solde.toFixed(2) + " €";
            panelSolde.className = solde >= 0 ? "text-success" : "text-danger";
        }
        
        if (user.id_carte && user.id_carte.trim() !== "") {
            panelRfid.innerHTML = "<span style='color:var(--success);'><i class=\"fa-solid fa-check\"></i> Oui (" + user.id_carte + ")</span>";
        } else {
            panelRfid.innerHTML = "<span style='color:var(--danger);'><i class=\"fa-solid fa-xmark\"></i> Non</span>";
        }
        
        var valid = "<span style='color:var(--success);'><i class='fa-solid fa-check'></i></span>";
        var invalid = "<span style='color:var(--danger);'><i class='fa-solid fa-xmark'></i></span>";
        
        panelCertifList.innerHTML = "";
        listeCertificationsConfig.forEach(function(c) {
            var ok = user.certifications && user.certifications.includes(c);
            panelCertifList.innerHTML += `<div class="flex-between"><span><i class="fa-solid fa-certificate"></i> ${c}</span><strong>${ok ? valid : invalid}</strong></div>`;
        });
        
        panelCard.style.borderTopColor = "var(--primary)";
        btnValider.disabled = false;
        if (!window.fablabAutoMode) msgBox.innerHTML = "";
    }

   // ==========================================
    // 3. TRAITEMENT DE L'IDENTIFICATION (RFID / QR / RECHERCHE)
    // ==========================================
    function gererUtilisateurIdentifie(idScanne, source) {
        if (!idScanne) return;
        
        // Vérifier la visibilité AVANT de faire le fetch
        var visible = document.body.contains(panelName);
        if (!visible) return;
        
        fetch('/api/user_info?id=' + encodeURIComponent(idScanne))
        .then(function(res) { return res.json(); })
        .then(function(userData) {
            var stillVisible = document.body.contains(panelName);
            if (userData.success) {
                if (stillVisible) afficherProfil(userData.data);
                
                // Si le mode automatique/robot est coché, on valide l'entrée sans intervention humaine
                if (window.fablabAutoMode && stillVisible) {
                    // Appliquer le throttling pour éviter les doubles scans rapides
                    var now = Date.now();
                    if (now - lastAutoEntryTime < AUTO_ENTRY_THROTTLE_MS) {
                        console.warn("Double scan évité - throttling actif");
                        return;
                    }
                    lastAutoEntryTime = now;
                    
                    // Détection d'anomalie de certification (sans bloquer l'accès)
                    var aUnProblemeCertif = !userData.data.certifications || userData.data.certifications.length === 0;
                    
                    fetch('/api/add_entry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            user_id: userData.data.id, 
                            type_projet: "N/A", 
                            zone_travail: "N/A", 
                            commentaire: "Mode Auto (" + source + ")" 
                        })
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(resData) {
                        var finalVisible = document.body.contains(panelName);
                        if (finalVisible) {
                            if (resData.success) {
                                // Si pas de certif, on affiche un point d'exclamation jaune de secours
                                if (aUnProblemeCertif) {
                                    msgBox.style.color = "var(--warning)";
                                    msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Entrée validée pour " + resData.prenom + " (⚠️ Certifications manquantes !)";
                                } else {
                                    msgBox.style.color = "var(--success)";
                                    msgBox.innerHTML = "<i class='fa-solid fa-check'></i> Entrée Auto validée pour " + resData.prenom + " !";
                                }
                                setTimeout(resetUI, 2500);
                            } else {
                                msgBox.style.color = "var(--danger)";
                                msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Erreur d'enregistrement !";
                                setTimeout(resetUI, 3000);
                            }
                        }
                    })
                    .catch(function(err) {
                        console.error("Erreur lors de l'enregistrement auto:", err);
                        if (stillVisible) {
                            msgBox.style.color = "var(--danger)";
                            msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Problème de connexion avec le serveur !";
                            setTimeout(resetUI, 3000);
                        }
                    });
                }
            } else if (stillVisible) {
                msgBox.style.color = "var(--danger)"; 
                msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Utilisateur ou Badge Inconnu !";
            }
        })
        .catch(function(err) {
            console.error("Erreur lors de la recherche utilisateur:", err);
            if (document.body.contains(panelName)) {
                msgBox.style.color = "var(--danger)";
                msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Erreur serveur !";
                setTimeout(resetUI, 3000);
            }
        });
    }

    // Validation manuelle du formulaire d'entrée
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        if (!userIdInput.value) {
            msgBox.style.color = "var(--danger)";
            msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Veuillez scanner ou sélectionner un utilisateur !";
            return;
        }
        
        fetch('/api/add_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userIdInput.value, type_projet: champMotif.value, zone_travail: champZone.value, commentaire: champCommentaire.value })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                msgBox.style.color = "var(--success)"; 
                msgBox.innerHTML = "<i class='fa-solid fa-check'></i> Entrée validée !";
                setTimeout(resetUI, 3000);
            } else {
                msgBox.style.color = "var(--danger)";
                msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Erreur : " + (data.error || "Utilisateur invalide");
                setTimeout(resetUI, 3000);
            }
        })
        .catch(function(err) {
            console.error("Erreur lors de la validation manuelle:", err);
            msgBox.style.color = "var(--danger)";
            msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Problème de connexion serveur !";
            setTimeout(resetUI, 3000);
        });
    });

    // ==========================================
    // 4. BRANCHEMENT UNIQUE AU MOTEUR CENTRALISÉ
    // ==========================================
    MoteurScan.ecouter({
        inputRecherche: manualSearch,
        datalist: datalist,
        onUserFound: gererUtilisateurIdentifie
    });
}