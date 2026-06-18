// ./js/scan.js

function initScanPage() {
    console.log("Page Scanner chargée");

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
    var panelStatutDetail = document.getElementById('panel-statut-detail');
    var panelSolde = document.getElementById('panel-solde');
    var panelRfid = document.getElementById('panel-rfid');
    var panelCertifList = document.getElementById('panel-certifications-list');
    
    var champCommentaire = document.getElementById('commentaire');
    var champMotif = document.getElementById('motif'); 
    var champZone = document.getElementById('zone');   

    var listeCertificationsConfig = [];

    // ==========================================
    // 0. CHARGEMENT DE LA CONFIGURATION (Fichier JSON)
    // ==========================================
    fetch('/api/config')
        .then(function(res) { return res.json(); })
        .then(function(resultat) {
            if (resultat.success) {
                var config = resultat.data;
                listeCertificationsConfig = config.certifications || [];

                champMotif.innerHTML = "";
                config.motifs.forEach(function(m) {
                    var option = document.createElement('option');
                    option.value = m;
                    option.textContent = m;
                    champMotif.appendChild(option);
                });

                champZone.innerHTML = "";
                config.zones.forEach(function(z) {
                    var option = document.createElement('option');
                    option.value = z;
                    option.textContent = z;
                    champZone.appendChild(option);
                });
            }
        });

    // ==========================================
    // 1. GESTION VISUELLE DU MODE AUTOMATIQUE
    // ==========================================
    function activerModeAutoUI() {
        form.style.opacity = "0.5";
        manualSearch.disabled = true;
        champCommentaire.disabled = true;
        champMotif.disabled = true; 
        champZone.disabled = true;  
        btnValider.style.display = "none"; 
        msgBox.style.color = "var(--primary)";
        msgBox.innerHTML = "<i class='fa-solid fa-robot'></i> Mode Automatique actif (RFID & QR en arrière-plan)...";
    }

    function desactiverModeAutoUI() {
        form.style.opacity = "1";
        manualSearch.disabled = false;
        champCommentaire.disabled = false;
        champMotif.disabled = false; 
        champZone.disabled = false;  
        btnValider.style.display = "flex"; 
        msgBox.innerHTML = "";
    }

    if (window.fablabAutoMode) {
        autoModeToggle.checked = true;
        activerModeAutoUI();
    }

    autoModeToggle.addEventListener('change', function() {
        window.fablabAutoMode = this.checked;
        if (this.checked) {
            activerModeAutoUI();
        } else {
            desactiverModeAutoUI();
        }
    });

    // ==========================================
    // 2. AFFICHAGE DES INFOS UTILISATEUR
    // ==========================================
    function resetUI() {
        form.reset();
        userIdInput.value = "";
        btnValider.disabled = true;
        panelName.textContent = "En attente de scan...";
        panelStatus.textContent = "-";
        if (panelStatutDetail) panelStatutDetail.textContent = "-";
        if (panelSolde) {
            panelSolde.textContent = "-";
            panelSolde.className = ""; 
        }
        panelRfid.textContent = "-";
        panelCard.style.borderTopColor = "var(--gray)";
        
        msgBox.innerHTML = window.fablabAutoMode ? "<i class='fa-solid fa-robot'></i> Mode Automatique actif (RFID & QR en arrière-plan)..." : "";
    }

    function afficherProfil(user) {
        userIdInput.value = user.id;
        panelName.textContent = user.prenom + " " + user.nom;
        panelStatus.textContent = user.statut; 
        
        if (panelStatutDetail) panelStatutDetail.textContent = user.statut || "Non renseigné";
        
        if (panelSolde) {
            var solde = user.montant || 0.0;
            panelSolde.textContent = solde.toFixed(2) + " €";
            panelSolde.className = solde >= 0 ? "text-success" : "text-danger"; 
        }
        
        
        // FIX : On vérifie si id_carte existe et n'est pas vide
        if (user.id_carte && user.id_carte.trim() !== "") {
            panelRfid.innerHTML = "<span style='color:var(--success);'><i class='fa-solid fa-check'></i> Oui (" + user.id_carte + ")</span>";
        } else {
            panelRfid.innerHTML = "<span style='color:var(--danger);'><i class='fa-solid fa-xmark'></i> Non</span>";
        }
        var valid = "<span style='color:var(--success);'><i class='fa-solid fa-check'></i></span>";
        var invalid = "<span style='color:var(--danger);'><i class='fa-solid fa-xmark'></i></span>";
        
        panelCertifList.innerHTML = "";
        listeCertificationsConfig.forEach(function(certifName) {
            var aLeDroit = user.certifications && user.certifications.includes(certifName);
            var icone = aLeDroit ? valid : invalid;
            var div = document.createElement('div');
            div.className = "flex-between";
            div.innerHTML = `<span><i class="fa-solid fa-certificate"></i> ${certifName}</span><strong>${icone}</strong>`;
            panelCertifList.appendChild(div);
        });
        
        panelCard.style.borderTopColor = "var(--primary)";
        btnValider.disabled = false;
        if(!window.fablabAutoMode) msgBox.innerHTML = "";
    }

    // ==========================================
    // 3. SOUMISSION DE L'ENTRÉE MANUELLE
    // ==========================================
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var id = userIdInput.value;
        if (!id) return;

        fetch('/api/add_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: id,
                type_projet: champMotif.value,
                zone_travail: champZone.value,
                commentaire: champCommentaire.value
            })
        })
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success) {
                msgBox.style.color = "var(--success)";
                msgBox.innerHTML = "<i class='fa-solid fa-check'></i> Entrée validée pour " + data.prenom + " !";
                setTimeout(resetUI, 3000);
            }
        });
    });

    // ==========================================
    // 4. MOTEUR DE TRAITEMENT (RFID + SCANETTE)
    // ==========================================
    // Cette fonction universelle gère l'arrivée d'un ID (RFID, QR, ou Manuel)
    function traiterScan(idScanne, source) {
        fetch('/api/user_info?id=' + encodeURIComponent(idScanne))
        .then(function(res) { return res.json(); })
        .then(function(userData) {
            var isOnScanPage = document.body.contains(panelName);
            
            if (userData.success) {
                var user = userData.data;
                
                if (isOnScanPage) {
                    afficherProfil(user);
                }

                if (window.fablabAutoMode) {
                    fetch('/api/add_entry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: user.id,
                            type_projet: "N/A",
                            zone_travail: "N/A",
                            commentaire: "Mode Auto (" + source + ")"
                        })
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(resData) {
                        if (resData.success && isOnScanPage) {
                            msgBox.style.color = "var(--success)";
                            msgBox.innerHTML = "<i class='fa-solid fa-check'></i> Entrée Auto validée pour " + resData.prenom + " !";
                            setTimeout(function() {
                                if(window.fablabAutoMode) {
                                    msgBox.style.color = "var(--primary)";
                                    msgBox.innerHTML = "<i class='fa-solid fa-robot'></i> Mode Automatique actif (RFID & QR en arrière-plan)...";
                                } else {
                                    resetUI();
                                }
                            }, 2500);
                        }
                    });
                }
            } else {
                if (isOnScanPage) {
                    msgBox.style.color = "var(--danger)";
                    msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Utilisateur ou Badge Inconnu !";
                }
            }
        });
    }

    // ==========================================
    // 5. ÉCOUTE PERMANENTE RFID
    // ==========================================
    if (window.fablabScanInterval) clearInterval(window.fablabScanInterval);

    window.fablabScanInterval = setInterval(function() {
        var isOnScanPage = document.body.contains(panelName);
        if (!isOnScanPage && !window.fablabAutoMode) {
            clearInterval(window.fablabScanInterval);
            return;
        }

        fetch('/api/get_last_scan')
        .then(function(res) { return res.json(); })
        .then(function(data) {
            if (data.success && data.id_carte) {
                traiterScan(data.id_carte, "RFID");
            }
        });
    }, 1000);

    // ==========================================
    // 6. ÉCOUTE PERMANENTE SCANETTE (QR)
    // ==========================================
    // On nettoie l'ancien écouteur si on navigue entre les pages
    if (window.fablabBarcodeListener) {
        document.removeEventListener('keydown', window.fablabBarcodeListener);
    }

    let barcodeBuffer = "";
    let barcodeTimeout = null;

    let barcodeBuffer = "";
    let barcodeTimeout = null;

    window.fablabBarcodeListener = function(e) {
        var isOnScanPage = document.body.contains(panelName);
        
        // On n'écoute la scanette que si on est sur la page Scan OU si le mode Auto est activé globalement
        if (!isOnScanPage && !window.fablabAutoMode) return;

        // La scanette envoie la touche "Entrée" à la fin de sa lecture
        if (e.key === 'Enter') {
            if (barcodeBuffer.length > 2) {
                // Si c'est une entrée venant d'un champ texte normal (pas la recherche manuelle)
                // et que ce n'était pas une vitesse de scanette, on laisse le comportement normal du site
                if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target.id !== 'manual-search' && barcodeBuffer === "") {
                    return; 
                }

                // C'est bien la scanette ! On bloque la validation naturelle du formulaire ou du champ
                e.preventDefault();

                // Si le curseur était dans un INPUT, on nettoie les quelques caractères parasites que le clavier aurait pu écrire avant le blocage
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    if (e.target.id !== 'manual-search') {
                        // On retire le code du QR code de la valeur du champ
                        var val = e.target.value;
                        if (val.endsWith(barcodeBuffer)) {
                            e.target.value = val.substring(0, val.length - barcodeBuffer.length);
                        }
                    } else {
                        e.target.value = ""; // Si c'est la recherche manuelle, on vide
                    }
                }

                // On traite le scan proprement
                traiterScan(barcodeBuffer, "Scanette QR");
            }
            barcodeBuffer = "";
            return;
        }

        // Accumulation des touches
        if (e.key.length === 1) {
            // On mémorise le caractère actuel
            var caractereSaisi = e.key;

            // Si le délai entre deux touches est ultra-court (< 40ms), c'est la scanette
            barcodeBuffer += caractereSaisi;
            
            if (barcodeTimeout) clearTimeout(barcodeTimeout);
            barcodeTimeout = setTimeout(function() {
                // Si trop long, c'est un humain au clavier : on vide le buffer de la scanette
                barcodeBuffer = "";
            }, 40); 
        }
    };

    document.addEventListener('keydown', window.fablabBarcodeListener);

    // ==========================================
    // 7. RECHERCHE MANUELLE
    // ==========================================
    manualSearch.addEventListener('input', function(e) {
        var texte = e.target.value;
        
        var options = datalist.childNodes;
        for (var i = 0; i < options.length; i++) {
            if (options[i].value === texte) {
                traiterScan(options[i].dataset.id, "Recherche");
                manualSearch.value = ""; 
                return; 
            }
        }

        if (texte.length >= 2) {
            fetch('/api/search_users?q=' + encodeURIComponent(texte))
            .then(function(res) { return res.json(); })
            .then(function(data) {
                datalist.innerHTML = ""; 
                if (data.success) {
                    data.items.forEach(function(u) {
                        var option = document.createElement('option');
                        var libelle = u.texte || (u.prenom + " " + u.nom + " (" + u.statut + ")");
                        option.value = libelle; 
                        option.dataset.id = u.id; 
                        datalist.appendChild(option);
                    });
                }
            });
        }
    });
}