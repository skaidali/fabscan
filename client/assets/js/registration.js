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

    // ==========================================
    // 2. LOGIQUE D'AUTO-REMPLISSAGE DE L'EMAIL
    // ==========================================
    function mettreAJourEmail() {
        var prenom = champPrenom.value.trim().toLowerCase();
        var nom = champNom.value.trim().toLowerCase();

        prenom = prenom.replace(/\s+/g, '-');
        nom = nom.replace(/\s+/g, '-');

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

                // 🚀 APPEL DE LA FONCTION CENTRALISÉE
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
}