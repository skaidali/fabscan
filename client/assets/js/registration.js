function initRegistrationPage() {
    // ==========================================
    // 1. RÉCUPÉRATION DES ÉLÉMENTS HTML
    // ==========================================
    var formulaire = document.getElementById('registration-form');
    var champPrenom = document.getElementById('prenom');
    var champNom = document.getElementById('nom');
    var champEmail = document.getElementById('email');
    
    // On récupère le menu déroulant
    var champStatut = document.getElementById('statut'); 
    
    var boutonRfid = document.getElementById('rfid-associate-btn');
    var champRfidCache = document.getElementById('rfid_card_id');
    var boiteMessage = document.getElementById('registration-message');
    var checkboxMail = document.getElementById('send_qr_email'); // La case à cocher

    // ==========================================
    // 1.1 CHARGEMENT DE LA CONFIGURATION (JSON)
    // ==========================================
    fetch('/api/config')
        .then(function(res) { return res.json(); })
        .then(function(resultat) {
            if (resultat.success) {
                var config = resultat.data;
                
                // A. Remplissage du menu déroulant des Statuts
                config.statuts.forEach(function(s) {
                    var option = document.createElement('option');
                    option.value = s;
                    option.textContent = s;
                    champStatut.appendChild(option);
                });

                // B. Remplissage des boutons radio des Motifs
                var containerMotif = document.getElementById('motif-container');
                if (containerMotif) {
                    containerMotif.innerHTML = "";
                    config.motifs.forEach(function(m, index) {
                        var input = document.createElement('input');
                        input.type = "radio";
                        input.id = "motif_" + index;
                        input.name = "motif";
                        input.value = m;
                        if (index === 0) input.required = true;

                        var label = document.createElement('label');
                        label.className = "pill";
                        label.setAttribute("for", "motif_" + index);
                        label.textContent = m;

                        containerMotif.appendChild(input);
                        containerMotif.appendChild(label);
                    });
                }
            }
        });

    if (!formulaire || !champPrenom || !champNom) {
        console.error("Erreur : Éléments du formulaire introuvables.");
        return;
    }

    //// ==========================================
    // 2. LOGIQUE D'AUTO-REMPLISSAGE DE L'EMAIL (SANS ACCENTS)
    // ==========================================
    function supprimerAccents(texte) {
        // Décompose les caractères accentués (ex: 'é' devient 'e' + '´') et supprime les marques d'accent
        return texte.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    function mettreAJourEmail() {
        var prenomRaw = champPrenom.value.trim().toLowerCase();
        var nomRaw = champNom.value.trim().toLowerCase();

        // Nettoyage des accents et caractères spéciaux (é->e, ç->c, à->a, etc.)
        var prenom = supprimerAccents(prenomRaw).replace(/\s+/g, '-');
        var nom = supprimerAccents(nomRaw).replace(/\s+/g, '-');

        var statutChoisi = champStatut.value; 

        if (prenom !== "" && nom !== "") {
            var groupeEtudiants = ["1A", "2A", "3A", "Alternant·e", "Master"];
            var groupePersonnel = ["Doctorant·e", "Enseignant·e/Chercheur·se", "Personnel"];

            if (groupeEtudiants.includes(statutChoisi)) {
                champEmail.value = prenom + "." + nom + "@etu.ec-lyon.fr";
            } else if (groupePersonnel.includes(statutChoisi)) {
                champEmail.value = prenom + "." + nom + "@ec-lyon.fr";
            } else {
                champEmail.value = "";
            }
        } else {
            champEmail.value = "";
        }
    }

    champPrenom.addEventListener('input', mettreAJourEmail);
    champNom.addEventListener('input', mettreAJourEmail);
    champStatut.addEventListener('change', mettreAJourEmail);

    // ==========================================
    // 3. GESTION DE LA CARTE RFID 
    // ==========================================
    if (boutonRfid) {
        var ecouteEnCours = false;
        var chronometreEcoute;

        boutonRfid.addEventListener('click', function(evenement) {
            evenement.preventDefault();
            
            if (ecouteEnCours === true) {
                clearInterval(chronometreEcoute);
                ecouteEnCours = false;
                boutonRfid.textContent = "Associer la carte";
                boutonRfid.style.opacity = "1";
                return;
            }
            
            ecouteEnCours = true;
            boutonRfid.textContent = "Passez le badge (cliquez pour annuler)...";
            boutonRfid.style.opacity = "0.7";

            chronometreEcoute = setInterval(function() {
                if (!document.body.contains(boutonRfid)) {
                    clearInterval(chronometreEcoute);
                    return;
                }
                
                fetch('/api/get_last_scan')
                .then(function(reponse) { return reponse.json(); })
                .then(function(donnees) {
                    if (donnees.success === true && donnees.id_carte !== null) {
                        clearInterval(chronometreEcoute); 
                        ecouteEnCours = false;
                        champRfidCache.value = donnees.id_carte;
                        
                        boutonRfid.textContent = "Carte associée (" + donnees.id_carte + ")";
                        boutonRfid.style.opacity = "1";
                        boutonRfid.classList.remove('btn-outline');
                        boutonRfid.classList.add('btn-primary');
                    }
                })
                .catch(function(erreur) {
                    console.error("Erreur lors de l'écoute RFID :", erreur);
                });
            }, 1000);
        });
    }

    // ==========================================
    // 4. ENVOI DES DONNÉES AU SERVEUR & COPIE AUTOMATIQUE
    // ==========================================
    formulaire.addEventListener('submit', function(evenement) {
        evenement.preventDefault();

        var statutFinal = champStatut.value;

        var donneesAEnvoyer = {
            nom: champNom.value.trim(),
            prenom: champPrenom.value.trim(),
            statut: statutFinal,
            email: champEmail.value.trim(),
            id_carte: champRfidCache.value.trim() 
        };

        boiteMessage.style.color = "var(--primary)";
        boiteMessage.innerHTML = "Envoi au serveur en cours...";

        fetch('/api/add_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(donneesAEnvoyer)
        })
        .then(function(reponseDuServeur) { return reponseDuServeur.json(); })
        .then(function(resultat) {
            if (resultat.success === true) {
                boiteMessage.style.color = "var(--success)";
                boiteMessage.innerHTML = "<i class='fa-solid fa-check'></i> " + resultat.message;

                // APPEL DE LA FONCTION CENTRALISÉE
                if (checkboxMail && checkboxMail.checked && donneesAEnvoyer.email !== "") {
                    MoteurScan.envoyerEmailZimbra({
                        id: resultat.id, // L'ID retourné par le serveur
                        prenom: donneesAEnvoyer.prenom,
                        nom: donneesAEnvoyer.nom,
                        email: donneesAEnvoyer.email
                    });
                }

                formulaire.reset();
                
                if (boutonRfid) {
                    boutonRfid.textContent = "Associer la carte";
                    boutonRfid.classList.add('btn-outline');
                    boutonRfid.classList.remove('btn-primary');
                    champRfidCache.value = "";
                }

                setTimeout(function() { boiteMessage.innerHTML = ""; }, 4000);
            } else {
                boiteMessage.style.color = "var(--danger)";
                boiteMessage.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Erreur : " + resultat.error;
            }
        })
    });
    
    // ==========================================
    // GESTION DU TÉLÉVERSEMENT EXCEL DISCRET
    // ==========================================
    var fileInput = document.getElementById('excel-file-input');
    var labelChargement = document.getElementById('import-loading-msg');

    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            if (!fileInput.files || fileInput.files.length === 0) return;

            var formData = new FormData();
            formData.append('file', fileInput.files[0]);

            labelChargement.style.display = "block";
            labelChargement.style.color = "var(--primary)";
            labelChargement.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Extraction et synchronisation de l'historique...";

            fetch('/api/import_users_excel', {
                method: 'POST',
                body: formData
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.success) {
                    labelChargement.style.color = "var(--success)";
                    labelChargement.innerHTML = "<i class='fa-solid fa-circle-check'></i> " + data.message;
                } else {
                    labelChargement.style.color = "var(--danger)";
                    labelChargement.innerHTML = "<i class='fa-solid fa-circle-xmark'></i> Échec : " + data.error;
                }
                fileInput.value = ""; // Reset de l'input
                setTimeout(function() { labelChargement.style.display = "none"; }, 6000);
            })
            .catch(function(err) {
                labelChargement.style.color = "var(--danger)";
                labelChargement.innerHTML = "<i class='fa-solid fa-circle-xmark'></i> Erreur de connexion avec le serveur.";
                fileInput.value = "";
                setTimeout(function() { labelChargement.style.display = "none"; }, 6000);
            });
            
            
        });
    }
    // ==========================================
    // MAINTENANCE ET CONFORMITÉ RGPD (SÉCURISÉE PAR WINDOWS HELLO / PIN)
    // ==========================================
    
    // Fonction pour demander la vérification locale à Windows
    function verifierIdentiteWindows() {
        return new Promise(function(resolve, reject) {
            if (!window.PublicKeyCredential) {
                return reject("Votre navigateur ne prend pas en charge la vérification système.");
            }

            // Configuration bidon (challenge) requise par l'API WebAuthn pour réveiller Windows Hello
            var optionsAuth = {
                challenge: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
                rp: { name: "FabLab ECL" },
                user: { id: new Uint8Array([42]), name: "admin@fablab", displayName: "Administrateur FabLab" },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }],
                authenticatorSelection: { userVerification: "required", authenticatorAttachment: "platform" },
                timeout: 60000
            };

            // Déclenche l'affichage de la fenêtre Windows (Empreinte, PIN, Mot de passe session)
            navigator.credentials.create({ publicKey: optionsAuth })
                .then(function(credential) {
                    if (credential) {
                        resolve(true); // Succès : Windows a validé l'humain devant l'écran
                    } else {
                        reject("Échec de la vérification.");
                    }
                })
                .catch(function(err) {
                    // Si l'utilisateur clique sur "Annuler", on ne fait rien
                    reject("Vérification annulée ou refusée par Windows.");
                });
        });
    }
    window.declencherMaintenanceRGPD = function() {
        var msgStatus = document.getElementById('rgpd-loading-msg');
        
        var confirmation1 = confirm("⚠️ ATTENTION : MAINTENANCE ANNUELLE CRITIQUE ⚠️\n\nVous allez lancer le nettoyage réglementaire de la rentrée :\n1. Anonymisation irréversible des accès de plus d'un an.\n2. Suppression définitive des comptes d'étudiants partis depuis plus de 5 ans.\n\nSouhaitez-vous continuer ?");
        if (!confirmation1) return;

        var confirmation2 = confirm("🛑 CONFIRMATION FINALE REQUISE 🛑\n\nÊtes-vous absolument sûr ? Les données modifiées et effacées ne pourront pas être récupérées.");
        if (!confirmation2) return;

        // 🔐 Appel de l'authentification système Windows (la fonction verifierIdentiteWindows doit rester dans ton code)
        verifierIdentiteWindows()
            .then(function() {
                msgStatus.style.display = "block";
                msgStatus.style.color = "var(--primary)";
                msgStatus.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Exécution des scripts de maintenance en base de données...";

                return fetch('/api/rgpd_maintenance_annuelle', { 
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            })
            .then(function(res) { return res ? res.json() : null; })
            .then(function(data) {
                if (!data) return;
                if (data.success) {
                    msgStatus.style.color = "var(--success)";
                    msgStatus.innerHTML = "<i class='fa-solid fa-circle-check'></i> " + data.message;
                } else {
                    msgStatus.style.color = "var(--danger)";
                    msgStatus.innerHTML = "<i class='fa-solid fa-circle-xmark'></i> Échec : " + data.error;
                }
                setTimeout(function() { msgStatus.innerHTML = ""; }, 6000);
            })
            .catch(function(err) {
                console.warn(err);
                msgStatus.style.color = "var(--danger)";
                msgStatus.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Accès refusé : " + err;
                setTimeout(function() { msgStatus.innerHTML = ""; }, 4000);
            });
    };
}