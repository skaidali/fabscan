// ./js/registration.js

function initRegistrationPage() {
    // ==========================================
    // 1. RÉCUPÉRATION DES ÉLÉMENTS HTML
    // ==========================================
    var formulaire = document.getElementById('registration-form');
    var champPrenom = document.getElementById('prenom');
    var champNom = document.getElementById('nom');
    var champEmail = document.getElementById('email');
    var radiosStatut = document.querySelectorAll('input[name="statut"]');
    var boutonRfid = document.getElementById('rfid-associate-btn');
    var champRfidCache = document.getElementById('rfid_card_id');
    var boiteMessage = document.getElementById('registration-message');

    // Sécurité : On s'arrête là si la page est mal chargée
    if (!formulaire || !champPrenom || !champNom) {
        console.error("Erreur : Éléments du formulaire introuvables.");
        return;
    }

    // ==========================================
    // 2. LOGIQUE D'AUTO-REMPLISSAGE DE L'EMAIL
    // ==========================================
    function mettreAJourEmail() {
        // On récupère le texte, on enlève les espaces au début/fin, et on met tout en minuscules
        var prenom = champPrenom.value.trim().toLowerCase();
        var nom = champNom.value.trim().toLowerCase();

        // Si la personne a un nom composé, on remplace l'espace par un tiret ("jean-luc")
        prenom = prenom.replace(/\s+/g, '-');
        nom = nom.replace(/\s+/g, '-');

        // On cherche quel bouton radio "Statut" est actuellement coché
        var statutCoche = "";
        for (var i = 0; i < radiosStatut.length; i++) {
            if (radiosStatut[i].checked) {
                statutCoche = radiosStatut[i].value;
            }
        }

        // On ne construit l'email que si le prénom et le nom sont remplis
        if (prenom !== "" && nom !== "") {
            if (statutCoche === "Étudiant") {
                champEmail.value = prenom + "." + nom + "@etu.ec-lyon.fr";
            } else if (statutCoche === "Personnel") {
                champEmail.value = prenom + "." + nom + "@ec-lyon.fr";
            }
            // Si le statut est "Externe", on ne touche pas au champ pour le laisser taper
        } else {
            // Si l'un des champs est vidé, on vide l'email généré
            champEmail.value = "";
        }
    }

    // On déclenche la fonction à chaque fois qu'une lettre est tapée dans le prénom ou le nom
    champPrenom.addEventListener('input', mettreAJourEmail);
    champNom.addEventListener('input', mettreAJourEmail);

    // On déclenche aussi la fonction si on change de statut (passe de Étudiant à Personnel)
    for (var j = 0; j < radiosStatut.length; j++) {
        radiosStatut[j].addEventListener('change', mettreAJourEmail);
    }

    // ==========================================
    // 3. GESTION DE LA CARTE RFID (VRAIE LECTURE)
    // ==========================================
    if (boutonRfid) {
        var ecouteEnCours = false;
        var chronometreEcoute;

        boutonRfid.addEventListener('click', function() {
            
            // Si on écoute déjà, un deuxième clic ANNULE la recherche
            if (ecouteEnCours=== true) {
                clearInterval(chronometreEcoute);
                ecouteEnCours = false;
                boutonRfid.textContent = "Associer la carte";
                boutonRfid.style.opacity = "1";
                return; // On arrête la fonction ici
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
                .then(function(reponse) {
                    return reponse.json();
                })
                .then(function(donnees) {
                    if (donnees.success === true && donnees.id_carte !== null) {
                        
                        clearInterval(chronometreEcoute); // On arrête de demander
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
    // 4. ENVOI DES DONNÉES AU SERVEUR PYTHON
    // ==========================================
    formulaire.addEventListener('submit', function(evenement) {
        // Empêche la page web de faire un rechargement blanc
        evenement.preventDefault();

        // Récupérer le statut coché final
        var statutFinal = "";
        for (var k = 0; k < radiosStatut.length; k++) {
            if (radiosStatut[k].checked) {
                statutFinal = radiosStatut[k].value;
            }
        }

        // On prépare le paquet de données exactement comme ton Python l'attend
        var donneesAEnvoyer = {
            nom: champNom.value.trim(),
            prenom: champPrenom.value.trim(),
            statut: statutFinal,
            email: champEmail.value.trim(),
            id_carte: champRfidCache.value.trim() // Peut être vide si pas de carte associée
        };

        // Message de patience
        boiteMessage.style.color = "var(--primary)";
        boiteMessage.innerHTML = "Envoi au serveur en cours...";

        // On envoie la requête HTTP POST à ton serveur (défini dans serveur.py)
        fetch('/api/add_user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(donneesAEnvoyer)
        })
        .then(function(reponseDuServeur) {
            // On transforme la réponse du Python en objet JavaScript
            return reponseDuServeur.json();
        })
        .then(function(resultat) {
            if (resultat.success === true) {
                // Le serveur a dit "success: True"
                boiteMessage.style.color = "var(--success)";
                boiteMessage.innerHTML = "<i class='fa-solid fa-check'></i> " + resultat.message;

                // On remet le formulaire à zéro pour le prochain visiteur
                formulaire.reset();
                
                // On réinitialise aussi l'aspect du bouton RFID
                if (boutonRfid) {
                    boutonRfid.textContent = "Associer la carte";
                    boutonRfid.classList.add('btn-outline');
                    boutonRfid.classList.remove('btn-primary');
                    champRfidCache.value = "";
                }

                // On efface le message de succès après 4 secondes
                setTimeout(function() {
                    boiteMessage.innerHTML = "";
                }, 4000);

            } else {
                // Le serveur Python a renvoyé une erreur (ex: nom manquant)
                boiteMessage.style.color = "var(--danger)";
                boiteMessage.innerHTML = "<i class='fa-solid fa-triangle-exclamation'></i> Erreur : " + resultat.error;
            }
        })
        .catch(function(erreur) {
            // Le serveur Python est probablement éteint
            console.error("Problème de communication :", erreur);
            boiteMessage.style.color = "var(--danger)";
            boiteMessage.innerHTML = "<i class='fa-solid fa-plug'></i> Impossible de joindre le serveur FabLab.";
        });
    });
}

// On lance
initRegistrationPage();