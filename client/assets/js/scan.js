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
    fetch('/api/config').then(function(res) { return res.json(); }).then(function(resultat) {
        if (resultat.success) {
            var config = resultat.data;
            listeCertificationsConfig = config.certifications || [];
            champMotif.innerHTML = "";
            config.motifs.forEach(function(m) { champMotif.innerHTML += `<option value="${m}">${m}</option>`; });
            champZone.innerHTML = "";
            config.zones.forEach(function(z) { champZone.innerHTML += `<option value="${z}">${z}</option>`; });
        }
    });

    // ==========================================
    // 1. GESTION VISUELLE DU MODE AUTOMATIQUE
    // ==========================================
    if (window.fablabAutoMode) { 
        autoModeToggle.checked = true; 
        activerModeAutoUI(); 
    }
    
    autoModeToggle.addEventListener('change', function() {
        window.fablabAutoMode = this.checked;
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
        panelName.textContent = "En attente de scan..."; panelStatus.textContent = "-";
        if (panelStatutDetail) panelStatutDetail.textContent = "-";
        if (panelSolde) { panelSolde.textContent = "-"; panelSolde.className = ""; }
        panelRfid.textContent = "-"; panelCard.style.borderTopColor = "var(--gray)";
        msgBox.innerHTML = window.fablabAutoMode ? "<i class='fa-solid fa-robot'></i> Mode Auto actif..." : "";
    }

    function afficherProfil(user) {
        userIdInput.value = user.id;
        panelName.textContent = user.prenom + " " + user.nom;
        panelStatus.textContent = user.statut;
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
        
        fetch('/api/user_info?id=' + encodeURIComponent(idScanne))
        .then(function(res) { return res.json(); })
        .then(function(userData) {
            var visible = document.body.contains(panelName);
            if (userData.success) {
                if (visible) afficherProfil(userData.data);
                
                // Si le mode automatique/robot est coché, on valide l'entrée sans intervention humaine
                if (window.fablabAutoMode) {
                    fetch('/api/add_entry', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: userData.data.id, type_projet: "N/A", zone_travail: "N/A", commentaire: "Mode Auto (" + source + ")" })
                    }).then(function(res) { return res.json(); }).then(function(resData) {
                        if (resData.success && visible) {
                            msgBox.style.color = "var(--success)";
                            msgBox.innerHTML = "<i class='fa-solid fa-check'></i> Entrée Auto validée pour " + resData.prenom + " !";
                            setTimeout(resetUI, 2500);
                        }
                    });
                }
            } else if (visible) {
                msgBox.style.color = "var(--danger)"; 
                msgBox.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Utilisateur ou Badge Inconnu !";
            }
        });
    }

    // Validation manuelle du formulaire d'entrée
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        fetch('/api/add_entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userIdInput.value, type_projet: champMotif.value, zone_travail: champZone.value, commentaire: champCommentaire.value })
        }).then(function(res) { return res.json(); }).then(function(data) {
            if (data.success) {
                msgBox.style.color = "var(--success)"; 
                msgBox.innerHTML = "<i class='fa-solid fa-check'></i> Entrée validée !";
                setTimeout(resetUI, 3000);
            }
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