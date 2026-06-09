function initStatsPage() {
    // 1. Définition de nos 4 périodes possibles
    var periodes = [
        { id: 'jour', label: 'Afficher: Jour', subtitle: 'Activité (24h)', rangeLabel: '24 dernières heures' },
        { id: 'semaine', label: 'Afficher: Semaine', subtitle: 'Activité (7 jours)', rangeLabel: '7 derniers jours' },
        { id: 'mois', label: 'Afficher: Mois', subtitle: 'Activité (30 jours)', rangeLabel: '30 derniers jours' },
        { id: 'annee', label: 'Afficher: Année', subtitle: 'Activité (12 mois)', rangeLabel: '12 derniers mois' }
    ];
    var indexPeriode = 1; 

    // 2. Récupération des éléments HTML
    var btnActualiser = document.getElementById('refresh-btn');
    var btnExport = document.getElementById('export-btn');
    var btnToggle = document.getElementById('toggle-range');
    var filtreStatut = document.getElementById('filter-statut'); // NOUVEAU

    var boiteAujourdhui = document.getElementById('today-count');
    var boitePeriode = document.getElementById('week-count'); 
    var boiteTotal = document.getElementById('total-count');
    
    var titreBoitePeriode = boitePeriode.previousElementSibling;
    var rangeLabel = document.getElementById('range-label');

    // ==========================================
    // CHARGEMENT DE LA CONFIG (Pour le menu Profil)
    // ==========================================
    fetch('/api/config').then(res => res.json()).then(res => {
        if (res.success && res.data.statuts) {
            res.data.statuts.forEach(function(s) {
                var option = document.createElement('option');
                option.value = s;
                option.textContent = s;
                filtreStatut.appendChild(option);
            });
        }
    });

    // ==========================================
    // FONCTION PRINCIPALE DE CHARGEMENT
    // ==========================================
    function chargerStatistiques() {
        btnActualiser.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";

        var periodeChoisie = periodes[indexPeriode].id;
        // On construit l'URL avec les deux filtres !
        var url = '/api/stats?period=' + periodeChoisie + '&statut=' + encodeURIComponent(filtreStatut.value);

        fetch(url)
        .then(function(res) { return res.json(); })
        .then(function(donnees) {
            // 1. Mise à jour des KPI en haut
            boiteAujourdhui.textContent = donnees.today_entries;
            boitePeriode.textContent = donnees.period_entries;
            boiteTotal.textContent = donnees.total_entries;

            // 2. Mise à jour des textes
            btnToggle.textContent = periodes[indexPeriode].label;
            titreBoitePeriode.textContent = periodes[indexPeriode].subtitle;
            rangeLabel.textContent = periodes[indexPeriode].rangeLabel;

            // 3. Dessin du Graphique
            dessinerGraphique(donnees.chart_data);

            // 4. Liste par profil 
            var listeProfils = document.getElementById('profile-list');
            listeProfils.innerHTML = "";
            var totalProfils = 0;
            
            if (donnees.profiles && donnees.profiles.length > 0) {
                donnees.profiles.forEach(function(p) {
                    var div = document.createElement('div');
                    div.className = "flex-between mt-1";
                    div.innerHTML = "<span>" + p.name + "</span><strong>" + p.count + "</strong>";
                    listeProfils.appendChild(div);
                    totalProfils += p.count;
                });
                document.getElementById('profile-total').textContent = totalProfils;
            } else {
                listeProfils.innerHTML = "<p class='muted'>Aucune donnée.</p>";
                document.getElementById('profile-total').textContent = "0";
            }

            // 5. Tableau des entrées mis à jour
            var corpsTableau = document.querySelector('#entries-table tbody');
            corpsTableau.innerHTML = "";

            if (donnees.recent_entries && donnees.recent_entries.length > 0) {
                donnees.recent_entries.forEach(function(entree) {
                    var ligne = document.createElement('tr');
                    
                    var dateSeule = entree.date.split(" ")[0];
                    var heureSeule = entree.date.split(" ")[1] ? entree.date.split(" ")[1].substring(0, 5) : "";
                    
                    ligne.innerHTML = 
                        "<td><strong>" + dateSeule + "</strong> <span class='muted'>" + heureSeule + "</span></td>" +
                        "<td>" + entree.nom + "</td>" +
                        "<td><span class='pill'>" + entree.statut + "</span></td>" +
                        "<td>" + (entree.zone || "-") + "</td>" +
                        "<td>" + (entree.projet || "-") + "</td>";
                    corpsTableau.appendChild(ligne);
                });
            } else {
                corpsTableau.innerHTML = "<tr><td colspan='5' class='text-center muted py-2'>Aucune entrée correspondante sur cette période.</td></tr>";
            }

            btnActualiser.innerHTML = "<i class='fa-solid fa-rotate-right'></i> Actualiser";
        });
    }

    // Le dessin du graphique reste inchangé
    function dessinerGraphique(donneesGraphique) {
        var conteneurGraphique = document.getElementById('activity-chart');
        var conteneurLabels = document.getElementById('activity-xlabels');
        
        conteneurGraphique.innerHTML = "";
        conteneurLabels.innerHTML = "";

        var maxValeur = 1;
        for (var date in donneesGraphique) {
            if (donneesGraphique[date] > maxValeur) maxValeur = donneesGraphique[date];
        }

        for (var date in donneesGraphique) {
            var valeur = donneesGraphique[date];
            var pourcentageHauteur = (valeur / maxValeur) * 100;

            var barre = document.createElement('div');
            barre.className = "chart-bar";
            barre.style.height = Math.max(pourcentageHauteur, 15) + "%"; 
            barre.title = date + " : " + valeur + " entrées";
            barre.textContent = valeur;
            conteneurGraphique.appendChild(barre);
        }

        if (Object.keys(donneesGraphique).length === 0) {
            conteneurGraphique.innerHTML = "<p class='muted'>Aucune donnée sur cette période.</p>";
        }
    }

    // ==========================================
    // ACTIONS DES BOUTONS ET FILTRES
    // ==========================================
    btnActualiser.addEventListener('click', chargerStatistiques);
    filtreStatut.addEventListener('change', chargerStatistiques); // Recharge auto si on change le profil

    btnToggle.addEventListener('click', function() {
        indexPeriode++;
        if (indexPeriode >= periodes.length) {
            indexPeriode = 0;
        }
        chargerStatistiques();
    });

    btnExport.addEventListener('click', function() {
        window.location.href = '/api/export_csv';
    });

    // Chargement initial
    chargerStatistiques();
}