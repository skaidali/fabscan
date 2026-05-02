function initUsersPage() {
    console.log("Le script Utilisateurs est chargé !");

    // ==========================================
    // 1. RÉCUPÉRATION DES ÉLÉMENTS HTML
    // ==========================================
    var corpsDuTableau = document.getElementById('users-table-body');
    var modeleLigne = document.getElementById('users-row-template');
    var champRecherche = document.getElementById('users-search');
    var filtreStatut = document.getElementById('users-status-filter');
    var messageEtat = document.getElementById('users-table-state');

    // On s'arrête si la page est mal chargée
    if (!corpsDuTableau || !modeleLigne) {
        console.error("Éléments du tableau introuvables.");
        return;
    }

    // Notre "mémoire" pour la pagination
    var pagination = {
        pageActuelle: 1,
        utilisateursParPage: 12
    };

    // ==========================================
    // 2. FONCTION POUR AFFICHER LES UTILISATEURS
    // ==========================================
    function afficherLesLignes(listeUtilisateurs) {
        // On vide le tableau avant de le remplir
        corpsDuTableau.innerHTML = '';

        if (listeUtilisateurs.length === 0) {
            messageEtat.textContent = "Aucun utilisateur trouvé.";
            messageEtat.className = "message error";
            return;
        }

        messageEtat.textContent = "Affichage des utilisateurs en cours...";
        messageEtat.className = "message";

        // Pour chaque utilisateur reçu du serveur
        for (var i = 0; i < listeUtilisateurs.length; i++) {
            var utilisateur = listeUtilisateurs[i];

            // On clone notre modèle HTML (le template)
            var clone = modeleLigne.content.cloneNode(true);

            // On remplit les cases du tableau
            clone.querySelector('.user-prenom').textContent = utilisateur.prenom;
            clone.querySelector('.user-nom').textContent = utilisateur.nom;
            clone.querySelector('.user-email').textContent = utilisateur.email || "Non renseigné";
            
            // Le statut dans une petite bulle (pill)
            var caseStatut = clone.querySelector('.user-statut');
            caseStatut.innerHTML = '<span class="pill">' + utilisateur.statut + '</span>';

            // Les boutons d'action (Supprimer par exemple)
            var boutonSupprimer = clone.querySelector('.action-delete');
            
            // On attache l'ID de l'utilisateur au bouton pour savoir qui supprimer
            boutonSupprimer.setAttribute('data-id', utilisateur.id);
            
            boutonSupprimer.addEventListener('click', function(evenement) {
                // On récupère l'ID caché dans le bouton
                var idCible = evenement.currentTarget.getAttribute('data-id');
                supprimerUtilisateur(idCible);
            });

            // On ajoute la ligne finie dans le tableau
            corpsDuTableau.appendChild(clone);
        }
    }

    // ==========================================
    // 3. FONCTION POUR RÉCUPÉRER LES DONNÉES (SERVEUR)
    // ==========================================
    function chargerLesUtilisateurs() {
        messageEtat.textContent = "Chargement...";

        // On prépare nos filtres
        var recherche = encodeURIComponent(champRecherche.value);
        var statut = encodeURIComponent(filtreStatut.value);

        // On construit l'adresse avec les filtres
        var urlApi = '/api/users?search=' + recherche + '&statut=' + statut + '&page=' + pagination.pageActuelle + '&page_size=' + pagination.utilisateursParPage;

        // On interroge le serveur Python
        fetch(urlApi)
            .then(function(reponse) {
                return reponse.json();
            })
            .then(function(donnees) {
                // Quand le serveur répond, on affiche les lignes !
                afficherLesLignes(donnees.items);
            })
            .catch(function(erreur) {
                console.error("Erreur de récupération :", erreur);
                messageEtat.textContent = "Erreur de connexion au serveur.";
                messageEtat.className = "message error";
            });
    }

    // ==========================================
    // 4. ACTION : SUPPRIMER UN UTILISATEUR
    // ==========================================
    function supprimerUtilisateur(id) {
        // On demande confirmation avant de faire une bêtise
        var confirmation = confirm("Voulez-vous vraiment supprimer cet utilisateur ?");
        
        if (confirmation === true) {
            fetch('/api/user/' + id, {
                method: 'DELETE'
            })
            .then(function(reponse) {
                return reponse.json();
            })
            .then(function(resultat) {
                if (resultat.success === true) {
                    alert("Utilisateur supprimé !");
                    chargerLesUtilisateurs(); // On recharge le tableau pour le mettre à jour
                } else {
                    alert("Erreur : " + resultat.error);
                }
            });
        }
    }

    // ==========================================
    // 5. GESTION DES RECHERCHES EN DIRECT
    // ==========================================
    if (champRecherche) {
        champRecherche.addEventListener('input', function() {
            pagination.pageActuelle = 1; // On revient à la page 1
            chargerLesUtilisateurs();
        });
    }

    if (filtreStatut) {
        filtreStatut.addEventListener('change', function() {
            pagination.pageActuelle = 1;
            chargerLesUtilisateurs();
        });
    }

    // Au lancement de la page, on charge le tableau une première fois
    chargerLesUtilisateurs();
}