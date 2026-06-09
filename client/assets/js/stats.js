function initStatsPage() {
    
    // 1. Définitions du texte pour les périodes
    var labelsPeriode = {
        'jour': '24 dernières heures',
        'semaine': '7 derniers jours',
        'mois': '30 derniers jours',
        'annee': '12 derniers mois'
    };

    // 2. Éléments du DOM (Filtres)
    var selPeriode = document.getElementById('filter-periode');
    var selZone = document.getElementById('filter-zone');
    var selMotif = document.getElementById('filter-motif');
    var selStatut = document.getElementById('filter-statut');
    var selCertif = document.getElementById('filter-certif');
    
    var filterHeader = document.getElementById('filter-header');
    var filterBody = document.getElementById('filter-body');
    var filterChevron = document.getElementById('filter-chevron');

    // Éléments du DOM (Affichage)
    var btnActualiser = document.getElementById('refresh-btn');
    var btnAppliquer = document.getElementById('apply-filters-btn');
    var btnReset = document.getElementById('reset-filters-btn');
    
    var boiteAujourdhui = document.getElementById('today-count');
    var boitePeriode = document.getElementById('week-count'); 
    var boiteTotal = document.getElementById('total-count');
    var rangeLabel = document.getElementById('range-label');

    // ==========================================
    // ACCORDÉON DES FILTRES
    // ==========================================
    filterHeader.addEventListener('click', function() {
        if (filterBody.style.display === 'none') {
            filterBody.style.display = 'block';
            filterChevron.classList.remove('fa-chevron-down');
            filterChevron.classList.add('fa-chevron-up');
        } else {
            filterBody.style.display = 'none';
            filterChevron.classList.remove('fa-chevron-up');
            filterChevron.classList.add('fa-chevron-down');
        }
    });

    // ==========================================
    // CHARGEMENT DE LA CONFIG (config.json)
    // ==========================================
    fetch('/api/config').then(res => res.json()).then(res => {
        if (res.success) {
            var conf = res.data;
            conf.zones.forEach(z => selZone.innerHTML += `<option value="${z}">${z}</option>`);
            conf.motifs.forEach(m => selMotif.innerHTML += `<option value="${m}">${m}</option>`);
            conf.statuts.forEach(s => selStatut.innerHTML += `<option value="${s}">${s}</option>`);
            conf.certifications.forEach(c => selCertif.innerHTML += `<option value="${c}">${c}</option>`);
        }
    });

    // ==========================================
    // MOTEUR DE RECHERCHE PRINCIPAL
    // ==========================================
    function chargerStatistiques() {
        btnActualiser.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";
        btnAppliquer.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";

        // On construit l'URL avec TOUS les filtres !
        var url = `/api/stats?period=${selPeriode.value}&statut=${encodeURIComponent(selStatut.value)}&certif=${encodeURIComponent(selCertif.value)}&zone=${encodeURIComponent(selZone.value)}&motif=${encodeURIComponent(selMotif.value)}`;

        fetch(url)
        .then(res => res.json())
        .then(donnees => {
            // 1. KPI
            boiteAujourdhui.textContent = donnees.today_entries;
            boitePeriode.textContent = donnees.period_entries;
            boiteTotal.textContent = donnees.total_users; // Affiche nb d'users inscrits correspondants !
            rangeLabel.textContent = labelsPeriode[selPeriode.value];

            // 2. Graphique
            dessinerGraphique(donnees.chart_data);

            // 3. Répartition des profils
            var listeProfils = document.getElementById('profile-list');
            listeProfils.innerHTML = "";
            var totalPassages = 0;
            
            if (donnees.profiles.length > 0) {
                donnees.profiles.forEach(p => {
                    listeProfils.innerHTML += `<div class="flex-between mt-1"><span>${p.name}</span><strong>${p.count}</strong></div>`;
                    totalPassages += p.count;
                });
                document.getElementById('profile-total').textContent = totalPassages;
            } else {
                listeProfils.innerHTML = "<p class='muted'>Aucune donnée.</p>";
                document.getElementById('profile-total').textContent = "0";
            }

            // 4. Tableau d'historique en bas
            var corpsTableau = document.querySelector('#entries-table tbody');
            corpsTableau.innerHTML = "";

            if (donnees.recent_entries.length > 0) {
                donnees.recent_entries.forEach(entree => {
                    var dateS = entree.date.split(" ")[0];
                    var heureS = entree.date.split(" ")[1] ? entree.date.split(" ")[1].substring(0, 5) : "";
                    
                    corpsTableau.innerHTML += `<tr>
                        <td><strong>${dateS}</strong> <span class="muted">${heureS}</span></td>
                        <td class="font-bold">${entree.nom}</td>
                        <td><span class="pill">${entree.statut}</span></td>
                        <td>${entree.zone || "-"}</td>
                        <td>${entree.projet || "-"}</td>
                    </tr>`;
                });
            } else {
                corpsTableau.innerHTML = "<tr><td colspan='5' class='text-center muted py-2'>Aucune entrée correspondante trouvée.</td></tr>";
            }

            btnActualiser.innerHTML = "<i class='fa-solid fa-rotate-right'></i> Actualiser";
            btnAppliquer.innerHTML = "<i class='fa-solid fa-check'></i> Appliquer les filtres";
            
            // On replie le menu après la recherche pour gagner de la place
            filterBody.style.display = 'none';
            filterChevron.classList.remove('fa-chevron-up');
            filterChevron.classList.add('fa-chevron-down');
        });
    }

    function dessinerGraphique(donneesGraphique) {
        var conteneur = document.getElementById('activity-chart');
        conteneur.innerHTML = "";
        var maxValeur = 1;
        
        for (var date in donneesGraphique) {
            if (donneesGraphique[date] > maxValeur) maxValeur = donneesGraphique[date];
        }

        for (var date in donneesGraphique) {
            var pct = (donneesGraphique[date] / maxValeur) * 100;
            var barre = document.createElement('div');
            barre.className = "chart-bar";
            barre.style.height = Math.max(pct, 15) + "%"; 
            barre.title = date + " : " + donneesGraphique[date] + " entrées";
            barre.textContent = donneesGraphique[date];
            conteneur.appendChild(barre);
        }

        if (Object.keys(donneesGraphique).length === 0) {
            conteneur.innerHTML = "<p class='muted'>Aucune donnée sur cette période.</p>";
        }
    }

    // ==========================================
    // ACTIONS BOUTONS
    // ==========================================
    btnAppliquer.addEventListener('click', chargerStatistiques);
    btnActualiser.addEventListener('click', chargerStatistiques);
    
    btnReset.addEventListener('click', function() {
        selPeriode.value = "semaine";
        selZone.value = "all";
        selMotif.value = "all";
        selStatut.value = "all";
        selCertif.value = "all";
        chargerStatistiques();
    });

    document.getElementById('export-btn').addEventListener('click', function() {
        window.location.href = '/api/export_csv';
    });

    // On lance la première recherche par défaut !
    chargerStatistiques();
}