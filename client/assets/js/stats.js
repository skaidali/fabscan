function initStatsPage() {
    
    var labelsPeriode = {
        'jour': '24 dernières heures',
        'semaine': '7 derniers jours',
        'mois': '30 derniers jours',
        'annee': '12 derniers mois'
    };

    var selPeriode = document.getElementById('filter-periode');
    var selZone = document.getElementById('filter-zone');
    var selMotif = document.getElementById('filter-motif');
    var selStatut = document.getElementById('filter-statut');
    var selCertif = document.getElementById('filter-certif');
    var selTypeEntree = document.getElementById('filter-type-entree');
    
    var filterHeader = document.getElementById('filter-header');
    var filterBody = document.getElementById('filter-body');
    var filterChevron = document.getElementById('filter-chevron');

    var btnActualiser = document.getElementById('refresh-btn');
    var btnAppliquer = document.getElementById('apply-filters-btn');
    var btnReset = document.getElementById('reset-filters-btn');
    
    var boiteAujourdhui = document.getElementById('today-count');
    var boitePeriode = document.getElementById('week-count'); 
    var boiteTotal = document.getElementById('total-count');
    var rangeLabel = document.getElementById('range-label');

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

    fetch('/api/config').then(res => res.json()).then(res => {
        if (res.success) {
            var conf = res.data;
            conf.zones.forEach(z => selZone.innerHTML += `<option value="${z}">${z}</option>`);
            conf.motifs.forEach(m => selMotif.innerHTML += `<option value="${m}">${m}</option>`);
            conf.statuts.forEach(s => selStatut.innerHTML += `<option value="${s}">${s}</option>`);
            conf.certifications.forEach(c => selCertif.innerHTML += `<option value="${c}">${c}</option>`);
        }
    });

    function chargerStatistiques() {
        btnActualiser.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";
        btnAppliquer.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i>";

        // 🤖 Insertion du paramètre type_entree dans l'appel à l'API
        var url = `/api/stats?period=${selPeriode.value}&statut=${encodeURIComponent(selStatut.value)}&certif=${encodeURIComponent(selCertif.value)}&zone=${encodeURIComponent(selZone.value)}&motif=${encodeURIComponent(selMotif.value)}&type_entree=${selTypeEntree.value}`;

        fetch(url)
        .then(res => res.json())
        .then(donnees => {
            boiteAujourdhui.textContent = donnees.today_entries;
            boitePeriode.textContent = donnees.period_entries;
            boiteTotal.textContent = donnees.total_users; 
            rangeLabel.textContent = labelsPeriode[selPeriode.value];

            dessinerGraphique(donnees.chart_data);

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

            var corpsTableau = document.querySelector('#entries-table tbody');
            corpsTableau.innerHTML = "";

            if (donnees.recent_entries.length > 0) {
                donnees.recent_entries.forEach(entree => {
                    var dateS = entree.date.split(" ")[0];
                    var heureS = entree.date.split(" ")[1] ? entree.date.split(" ")[1].substring(0, 5) : "";
                    
                    const estAuto = (entree.projet === "N/A" && entree.zone === "N/A");
                    const affichageZone = estAuto ? "Badge autonome" : (entree.zone || "Non spécifiée");
                    const affichageProjet = estAuto ? "Entrée automatique" : (entree.projet || "Visite libre");
                    
                    const typeEntreeBadge = estAuto 
                        ? `<span class="pill text-danger" style="background: rgba(219, 68, 85, 0.1);"><i class="fa-solid fa-robot"></i> Automatique</span>`
                        : `<span class="pill text-success" style="background: rgba(40, 167, 69, 0.1);"><i class="fa-solid fa-hand"></i> Manuel</span>`;

                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td><strong>${dateS}</strong> <span class="muted">${heureS}</span></td>
                        <td>
                            <a class="action-redirection-user font-bold text-primary cursor-pointer" data-nom="${entree.nom}" title="Ouvrir la fiche de ce membre sur le scanner">
                                ${entree.nom}
                            </a>
                        </td>
                        <td><span class="pill">${entree.statut}</span></td>
                        <td><i class="fa-solid fa-location-dot text-danger"></i> ${affichageZone}</td>
                        <td class="muted">${affichageProjet}</td>
                        <td>${typeEntreeBadge}</td>
                    `;
                    corpsTableau.appendChild(tr);
                });

                document.querySelectorAll('#entries-table .action-redirection-user').forEach(lien => {
                    lien.addEventListener('click', function(e) {
                        e.preventDefault();
                        const nomComplet = this.getAttribute('data-nom');
                        window.redirectionUserNom = nomComplet;
                        window.location.hash = "#users"; 
                    });
                });

            } else {
                corpsTableau.innerHTML = "<tr><td colspan='6' class='text-center muted py-2'>Aucune entrée correspondante trouvée.</td></tr>";
            }

            btnActualiser.innerHTML = "<i class='fa-solid fa-rotate-right'></i> Actualiser";
            btnAppliquer.innerHTML = "<i class='fa-solid fa-check'></i> Appliquer les filtres";
            
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

    btnAppliquer.addEventListener('click', chargerStatistiques);
    btnActualiser.addEventListener('click', chargerStatistiques);
    
    btnReset.addEventListener('click', function() {
        selPeriode.value = "semaine";
        selZone.value = "all";
        selMotif.value = "all";
        selStatut.value = "all";
        selCertif.value = "all";
        selTypeEntree.value = "all";
        chargerStatistiques();
    });

    document.getElementById('export-btn').addEventListener('click', function() {
        window.location.href = '/api/export_stats_csv';
    });

    chargerStatistiques();
}