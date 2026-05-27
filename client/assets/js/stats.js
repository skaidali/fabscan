function initStatsPage() {
    console.log("Le script Statistiques est chargé !");

    // 1. Définition de nos 4 périodes possibles
    var periodes = [
        { id: 'jour', label: 'Afficher: Jour', subtitle: 'Activité (24h)', rangeLabel: '24 dernières heures' },
        { id: 'semaine', label: 'Afficher: Semaine', subtitle: 'Activité (7 jours)', rangeLabel: '7 derniers jours' },
        { id: 'mois', label: 'Afficher: Mois', subtitle: 'Activité (30 jours)', rangeLabel: '30 derniers jours' },
        { id: 'annee', label: 'Afficher: Année', subtitle: 'Activité (12 mois)', rangeLabel: '12 derniers mois' }
    ];
    var indexPeriode = 1; // On commence par défaut à l'index 1 (Semaine)

    // 2. Récupération des éléments HTML
    var btnActualiser = document.getElementById('refresh-btn');
    var btnExport = document.getElementById('export-btn');
    var btnToggle = document.getElementById('toggle-range');

    var boiteAujourdhui = document.getElementById('today-count');
    var boitePeriode = document.getElementById('week-count'); // Va afficher la donnée dynamique
    var boiteTotal = document.getElementById('total-count');
    
    // On récupère les textes à changer dans l'interface
    var titreBoitePeriode = boitePeriode.previousElementSibling; 
    var labelPlage = document.getElementById('range-label');

    var listeZones = document.getElementById('zone-list');
    var tableauEntrees = document.querySelector('#entries-table tbody');
    var conteneurGraphique = document.getElementById('activity-chart');

    if (!boiteAujourdhui) return; // Sécurité

    // 3. Fonction pour récupérer les données avec la bonne période
    function chargerStatistiques() {
        boiteAujourdhui.textContent = "...";
        boitePeriode.textContent = "...";
        boiteTotal.textContent = "...";

        // On identifie la période actuellement sélectionnée
        var periodeActuelle = periodes[indexPeriode];

        // On ajoute la période dans l'URL (ex: /api/stats?period=mois)
        fetch('/api/stats?period=' + periodeActuelle.id)
            .then(function(reponse) { return reponse.json(); })
            .then(function(donnees) {
                // Remplissage des KPI
                boiteAujourdhui.textContent = donnees.today_entries;
                boitePeriode.textContent = donnees.period_entries; // Le chiffre qui s'adapte !
                boiteTotal.textContent = donnees.total_entries;

                // Remplissage du tableau
                tableauEntrees.innerHTML = "";
                donnees.recent_entries.forEach(function(entree) {
                    var tr = document.createElement('tr');
                    tr.innerHTML = "<td>" + entree.date + "</td>" +
                                   "<td>" + entree.nom + "</td>" +
                                   "<td><span class='pill'>" + (entree.zone || "Général") + "</span></td>" +
                                   "<td>" + (entree.projet || "-") + "</td>";
                    tableauEntrees.appendChild(tr);
                });

                // Répartition par zones
                listeZones.innerHTML = "";
                var htmlZones = "";
                donnees.zones.forEach(function(z) {
                    htmlZones += "<div style='display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee;'>" +
                                 "<span>" + z.name + "</span>" +
                                 "<strong>" + z.count + "</strong></div>";
                });
                listeZones.innerHTML = htmlZones || "<div class='muted'>Aucune donnée sur cette période</div>";

                // Le graphique
                dessinerGraphique(donnees.chart_data);
            })
            .catch(function(erreur) {
                console.error("Erreur de chargement des stats :", erreur);
            });
    }

    // 4. ACTION DU BOUTON TOGGLE (pour changer de période)
    btnToggle.addEventListener('click', function() {
        // On passe à la période suivante (le "%" permet de revenir à 0 après "annee")
        indexPeriode = (indexPeriode + 1) % periodes.length;
        var periodeActuelle = periodes[indexPeriode];
        
        // 1. On met à jour les textes dans le HTML
        btnToggle.textContent = periodeActuelle.label;
        titreBoitePeriode.textContent = periodeActuelle.subtitle;
        labelPlage.textContent = periodeActuelle.rangeLabel;
        
        // 2. On lance la recherche !
        chargerStatistiques();
    });

    // 5. Fonction pour dessiner le graphique
    function dessinerGraphique(donneesGraphique) {
        conteneurGraphique.innerHTML = ""; // On vide l'ancien graphique

        // Trouver la valeur maximale pour l'échelle
        var maxValeur = 1;
        for (var date in donneesGraphique) {
            if (donneesGraphique[date] > maxValeur) maxValeur = donneesGraphique[date];
        }

        // Création des barres
        for (var date in donneesGraphique) {
            var valeur = donneesGraphique[date];
            var pourcentageHauteur = (valeur / maxValeur) * 100;

            var barre = document.createElement('div');
            
            // On lui donne sa classe CSS (qui contient la couleur, largeur, etc.)
            barre.className = "chart-bar";
            
            // Seule l'information mathématique reste dans le JS
            barre.style.height = Math.max(pourcentageHauteur, 15) + "%"; 
            barre.title = date + " : " + valeur + " entrées";
            barre.textContent = valeur;

            conteneurGraphique.appendChild(barre);
        }

        // Sécurité si aucune donnée
        if (Object.keys(donneesGraphique).length === 0) {
            conteneurGraphique.innerHTML = "<p class='muted'>Aucune donnée sur cette période.</p>";
        }
    }

    // 6. Les actions des boutons
    btnActualiser.addEventListener('click', chargerStatistiques);

    btnExport.addEventListener('click', function() {
        // Pour télécharger un fichier, on dit simplement au navigateur d'aller sur cette URL
        window.location.href = '/api/export_csv';
    });

    // On charge les stats au premier affichage de la page
    chargerStatistiques();
}