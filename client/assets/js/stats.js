function initStatsPage() {
    console.log("Le script Statistiques est chargé !");

    // 1. Récupération des éléments HTML
    var btnActualiser = document.getElementById('refresh-btn');
    var btnExport = document.getElementById('export-btn');

    // Les boîtes de chiffres
    var boiteAujourdhui = document.getElementById('today-count');
    var boiteSemaine = document.getElementById('week-count');
    var boiteTotal = document.getElementById('total-count');

    // Les tableaux et graphiques
    var listeZones = document.getElementById('zone-list');
    var tableauEntrees = document.querySelector('#entries-table tbody');
    var conteneurGraphique = document.getElementById('activity-chart');

    // Sécurité
    if (!boiteAujourdhui) return;

    // 2. Fonction principale pour récupérer et afficher les données
    function chargerStatistiques() {
        boiteAujourdhui.textContent = "...";
        boiteSemaine.textContent = "...";
        boiteTotal.textContent = "...";

        fetch('/api/stats')
            .then(function(reponse) { return reponse.json(); })
            .then(function(donnees) {
                // A. Remplissage des gros chiffres (KPI)
                boiteAujourdhui.textContent = donnees.today_entries;
                boiteSemaine.textContent = donnees.week_entries;
                boiteTotal.textContent = donnees.total_entries;

                // B. Remplissage du tableau des dernières entrées
                tableauEntrees.innerHTML = "";
                donnees.recent_entries.forEach(function(entree) {
                    var tr = document.createElement('tr');
                    tr.innerHTML = "<td>" + entree.date + "</td>" +
                                   "<td>" + entree.nom + "</td>" +
                                   "<td><span class='pill'>" + (entree.zone || "Général") + "</span></td>" +
                                   "<td>" + (entree.projet || "-") + "</td>";
                    tableauEntrees.appendChild(tr);
                });

                // C. Remplissage de la répartition par zones
                listeZones.innerHTML = "";
                var htmlZones = "";
                donnees.zones.forEach(function(z) {
                    htmlZones += "<div style='display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #eee;'>" +
                                 "<span>" + z.name + "</span>" +
                                 "<strong>" + z.count + "</strong></div>";
                });
                listeZones.innerHTML = htmlZones || "<div class='muted'>Aucune donnée</div>";

                // D. Création d'un petit graphique en barres simple
                dessinerGraphique(donnees.chart_data);
            })
            .catch(function(erreur) {
                console.error("Erreur de chargement des stats :", erreur);
            });
    }

    // 3. Fonction pour dessiner le graphique
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

    // 4. Les actions des boutons
    btnActualiser.addEventListener('click', chargerStatistiques);

    btnExport.addEventListener('click', function() {
        // Pour télécharger un fichier, on dit simplement au navigateur d'aller sur cette URL
        window.location.href = '/api/export_csv';
    });

    // On charge les stats au premier affichage de la page
    chargerStatistiques();
}