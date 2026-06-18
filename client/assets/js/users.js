function initUsersPage() {
    var corpsDuTableau = document.getElementById('users-table-body');
    var modeleLigne = document.getElementById('users-row-template');
    var champRecherche = document.getElementById('users-search');
    var filtreStatut = document.getElementById('users-status-filter');
    
    // Éléments du Panneau Gauche
    var panneauDetails = document.getElementById('user-details-panel');
    var panneauVide = document.getElementById('user-empty-panel');
    var btnFermer = document.getElementById('btn-fermer-panneau');
    var formEdit = document.getElementById('edit-user-form');
    var msgBox = document.getElementById('edit-message');

    var pagination = { pageActuelle: 1, utilisateursParPage: 12 };
    let COMPTE_UTILISATEUR_COURANT = null;

    // ==========================================
    // 0. CHARGEMENT DE LA CONFIGURATION (JSON)
    // ==========================================
    fetch('/api/config')
        .then(function(res) { return res.json(); })
        .then(function(resultat) {
            if (resultat.success) {
                var config = resultat.data;
                var editStatut = document.getElementById('edit-statut');
                var certifsContainer = document.getElementById('certifications-container');
                
                config.statuts.forEach(function(s) {
                    // 1. Ajout dans le filtre de recherche
                    var optRecherche = document.createElement('option');
                    optRecherche.value = s;
                    optRecherche.textContent = s;
                    filtreStatut.appendChild(optRecherche);

                    // 2. Ajout dans le panneau de modification
                    var optEdition = document.createElement('option');
                    optEdition.value = s;
                    optEdition.textContent = s;
                    editStatut.appendChild(optEdition);
                });
                // NOUVEAU : Création des cases à cocher des certifications (100% Robuste)
                if (certifsContainer && config.certifications) {
                    certifsContainer.innerHTML = "";
                    config.certifications.forEach(function(c, index) {
                        var div = document.createElement('div');
                        div.className = "mt-1 flex-row";
                        // L'attribut value est essentiel ici pour faire le lien avec la base de données !
                        div.innerHTML = '<input type="checkbox" id="certif-' + index + '" class="auto-mode-checkbox certif-checkbox" value="' + c + '">' +
                                        '<label for="certif-' + index + '">' + c + '</label>';
                        certifsContainer.appendChild(div);
                    });
                }
            }
        });

    if (!corpsDuTableau) return;

    // ==========================================
    // 1. CHARGEMENT ET AFFICHAGE DU TABLEAU
    // ==========================================
    function chargerLesUtilisateurs() {
        var urlApi = '/api/users?search=' + encodeURIComponent(champRecherche.value) + '&statut=' + encodeURIComponent(filtreStatut.value) + '&page=' + pagination.pageActuelle + '&page_size=' + pagination.utilisateursParPage;

        fetch(urlApi)
            .then(function(res) { return res.json(); })
            .then(function(donnees) {
                corpsDuTableau.innerHTML = '';
                donnees.items.forEach(function(utilisateur) {
                    var clone = modeleLigne.content.cloneNode(true);
                    clone.querySelector('.user-prenom').textContent = utilisateur.prenom;
                    clone.querySelector('.user-nom').textContent = utilisateur.nom;
                    clone.querySelector('.user-statut').innerHTML = '<span class="pill">' + utilisateur.statut + '</span>';
                    
                    // Quand on clique sur une ligne, on ouvre le panneau !
                    var ligne = clone.querySelector('tr');
                    ligne.addEventListener('click', function() {
                        ouvrirPanneauUtilisateur(utilisateur.id);
                    });

                    corpsDuTableau.appendChild(clone);
                });
            });
    }

    // ==========================================
    // 2. GESTION DU PANNEAU LATÉRAL
    // ==========================================
    function ouvrirPanneauUtilisateur(id) {
        // On récupère toutes les infos détaillées via l'API existante
        fetch('/api/user_info?id=' + id)
            .then(function(res) { return res.json(); })
            .then(function(resultat) {
                if (resultat.success) {
                    var u = resultat.data;
                    COMPTE_UTILISATEUR_COURANT = u; // Sauvegarde en mémoire
                    
                    // On affiche le bon panneau
                    panneauVide.style.display = 'none';
                    panneauDetails.style.display = 'block';

                    // On remplit l'en-tête et l'image du QR
                    document.getElementById('panel-name-header').textContent = u.prenom + " " + u.nom;
                    document.getElementById('panel-qr-img').src = "/api/qr_code?id=" + u.id;

                    // On remplit le formulaire de base
                    document.getElementById('edit-user-id').value = u.id;
                    document.getElementById('edit-prenom').value = u.prenom;
                    document.getElementById('edit-nom').value = u.nom;
                    document.getElementById('edit-email').value = u.email;
                    document.getElementById('edit-statut').value = u.statut;
                    
                    // On remplit le RFID
                    document.getElementById('edit-rfid-id').value = u.id_carte;
                    document.getElementById('edit-rfid-display').textContent = u.id_carte || "Aucune";
                    document.getElementById('edit-rfid-btn').textContent = "Modifier la carte";
                    
                    // 1. On décoche toutes les cases par précaution
                    var toutesLesCases = document.querySelectorAll('.certif-checkbox');
                    toutesLesCases.forEach(function(caseAcocher) {
                        caseAcocher.checked = false;
                    });
                    
                    // 2. On coche uniquement celles que l'utilisateur possède
                    if (u.certifications) {
                        toutesLesCases.forEach(function(caseAcocher) {
                            // On vérifie si la valeur de la case ("Impression 3D") est dans la liste de l'étudiant
                            if (u.certifications.includes(caseAcocher.value)) {
                                caseAcocher.checked = true;
                            }
                        });
                    }

                    // Charger les paiements de l'utilisateur
                    chargerPaiementsDetails(u.id);

                    msgBox.innerHTML = "";
                }
            });
    }

    function chargerPaiementsDetails(userId) {
        var listDiv = document.getElementById('user-details-payments-list');
        if (!listDiv) return;

        fetch('/api/payments?user_id=' + userId + '&limit=10')
            .then(function(res) { return res.json(); })
            .then(function(resultat) {
                if (resultat.success) {
                    var payments = resultat.data;
                    listDiv.innerHTML = "";
                    if (payments.length === 0) {
                        listDiv.innerHTML = '<p class="muted text-center">Aucune transaction trouvée</p>';
                    } else {
                        payments.forEach(function(p) {
                            var div = document.createElement('div');
                            div.className = "flex-between mb-05 p-05";
                            div.style.borderBottom = "1px solid var(--border-color)";
                            var date = new Date(p.date).toLocaleDateString('fr-FR');
                            var color = p.type_mouvement === 'CREDIT' ? 'var(--success-color)' : 'var(--danger-color)';
                            div.innerHTML = '<div>' +
                                '<div style="font-size: 0.9rem; font-weight: bold;">' + p.nom + '</div>' +
                                '<div style="font-size: 0.7rem;" class="muted">' + date + ' - ' + (p.projet_nom || "Sans projet") + '</div>' +
                                '</div>' +
                                '<div style="color: ' + color + '; font-weight: bold;">' + (p.type_mouvement === 'CREDIT' ? '+' : '-') + p.montant + '€</div>';
                            listDiv.appendChild(div);
                        });
                    }
                }
            });
    }

    btnFermer.addEventListener('click', function() {
        panneauDetails.style.display = 'none';
        panneauVide.style.display = 'flex';
    });

    // ==========================================
    // 3. SAUVEGARDE DES MODIFICATIONS
    // ==========================================
    formEdit.addEventListener('submit', function(e) {
        e.preventDefault();

        // On récolte toutes les cases cochées
        var certifsCochees = [];
        document.querySelectorAll('.certif-checkbox:checked').forEach(function(cb) {
            certifsCochees.push(cb.value);
        });


        var donneesAEnvoyer = {
            id: document.getElementById('edit-user-id').value,
            prenom: document.getElementById('edit-prenom').value,
            nom: document.getElementById('edit-nom').value,
            email: document.getElementById('edit-email').value,
            statut: document.getElementById('edit-statut').value,
            id_carte: document.getElementById('edit-rfid-id').value,
            certifications: certifsCochees
        };

        fetch('/api/update_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(donneesAEnvoyer)
        })
        .then(function(res) { return res.json(); })
        .then(function(resultat) {
            if (resultat.success) {
                msgBox.style.color = "var(--success)";
                msgBox.textContent = "✔ Modifications sauvegardées !";
                chargerLesUtilisateurs(); // Rafraîchit le tableau
                setTimeout(function() { msgBox.textContent = ""; }, 3000);
            }
        });
    });

    // ==========================================
    // 4. LECTURE DE LA CARTE RFID DANS LE PANNEAU
    // ==========================================
    var btnRfid = document.getElementById('edit-rfid-btn');
    var inputRfid = document.getElementById('edit-rfid-id');
    var displayRfid = document.getElementById('edit-rfid-display');
    var chronometreRfid;

    // Action du nouveau bouton Corbeille
    var btnClearRfid = document.getElementById('edit-rfid-clear');
    if (btnClearRfid) {
        btnClearRfid.addEventListener('click', function() {
            inputRfid.value = ""; // On vide le champ caché
            displayRfid.textContent = "Aucune (N'oubliez pas de sauvegarder)";
            displayRfid.style.color = "var(--danger)";
            btnRfid.textContent = "Associer une carte";
            
            // On coupe l'écoute si elle était en cours
            clearInterval(chronometreRfid);
            btnRfid.setAttribute('data-ecoute', 'non');
        });
    }
    
    btnRfid.addEventListener('click', function() {
        var estEnEcoute = btnRfid.getAttribute('data-ecoute');

        if (estEnEcoute === "oui") {
            clearInterval(chronometreRfid);
            btnRfid.setAttribute('data-ecoute', 'non');
            btnRfid.textContent = "Modifier la carte";
            return;
        }

        btnRfid.setAttribute('data-ecoute', 'oui');
        btnRfid.textContent = "En attente du badge...";
        
        chronometreRfid = setInterval(function() {
            if (!document.body.contains(btnRfid)) {
                clearInterval(chronometreRfid);
                return;
            }
            
            fetch('/api/get_last_scan')
            .then(function(res) { return res.json(); })
            .then(function(donnees) {
                if (donnees.success && donnees.id_carte) {
                    clearInterval(chronometreRfid);
                    btnRfid.setAttribute('data-ecoute', 'non');
                    
                    inputRfid.value = donnees.id_carte;
                    displayRfid.textContent = donnees.id_carte + " (N'oubliez pas de sauvegarder)";
                    displayRfid.style.color = "var(--primary)";
                    btnRfid.textContent = "Badge détecté !";
                }
            });
        }, 1000);
    });

    // ==========================================
    // 5. ACTIONS ANNEXES (Supprimer, Renvoyer QR)
    // ==========================================
    document.getElementById('btn-supprimer-user').addEventListener('click', function() {
        var id = document.getElementById('edit-user-id').value;
        if (confirm("Voulez-vous vraiment supprimer cet utilisateur et son historique ?")) {
            fetch('/api/user/' + id, { method: 'DELETE' })
            .then(function() {
                panneauDetails.style.display = 'none';
                panneauVide.style.display = 'flex';
                chargerLesUtilisateurs();
            });
        }
    });
    document.getElementById('btn-renvoyer-qr').addEventListener('click', function() {
    if (COMPTE_UTILISATEUR_COURANT) {
         MoteurScan.envoyerEmailZimbra(COMPTE_UTILISATEUR_COURANT);
    } else {
         alert("Aucun utilisateur sélectionné.");
    }
    });

    // ==========================================
    // 6. ÉVÉNEMENTS GLOBAUX
    // ==========================================
    champRecherche.addEventListener('input', function() { pagination.pageActuelle = 1; chargerLesUtilisateurs(); });
    filtreStatut.addEventListener('change', function() { pagination.pageActuelle = 1; chargerLesUtilisateurs(); });
    document.getElementById('users-page-prev').addEventListener('click', function() { if (pagination.pageActuelle > 1) { pagination.pageActuelle--; chargerLesUtilisateurs(); }});
    document.getElementById('users-page-next').addEventListener('click', function() { pagination.pageActuelle++; chargerLesUtilisateurs(); });

    // ==========================================
    // BRANCHEMENT DU PANNEAU USERS AU MOTEUR UNIQUE
    // ==========================================
    MoteurScan.ecouter({
        inputRecherche: champRecherche, // Réutilise la barre de recherche existante en haut
        datalist: document.getElementById('users-admin-list') || document.createElement('datalist'), 
        forcerRFID: true, // Permet de charger un profil au badge pour modifier ses certifs
        onUserFound: function(idScanne) {
            // Dès qu'un QR ou un RFID arrive, on ouvre instantanément sa fiche d'édition à gauche !
            fetch('/api/user_info?id=' + idScanne)
                .then(res => res.json())
                .then(userData => {
                    if (userData.success) {
                        ouvrirPanneauUtilisateur(userData.data.id); // Appelle ta fonction d'ouverture de volet
                        champRecherche.value = ""; // Nettoie le champ
                    }
                });
        }
    });
    chargerLesUtilisateurs();
}