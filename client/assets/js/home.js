function initHomePage() {
    console.log("Poste de pilotage interactif initialisé");
    
    const liveBody = document.getElementById('actions-live-body');
    const autoContainer = document.getElementById('auto-status-container');
    const timeDisplay = document.getElementById('time');

    // 1. Fonction de mise à jour de l'horloge et du badge de statut cliquable
    function rafraichirHorlogeEtStatut() {
        const dateEcl = new Date();
        
        // Mise à jour de l'heure
        if (timeDisplay) {
            timeDisplay.textContent = dateEcl.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        }

        // Génération du bouton-badge interactif (Agrandis avec titre explicatif au survol)
        if (autoContainer) {
            if (window.fablabAutoMode === true) {
                autoContainer.innerHTML = `
                    <button type="button" class="btn btn-danger font-bold text-center px-1 py-05 cursor-pointer mb-0 w-100 flex-center" title="Cliquez pour désactiver et passer en mode manuel">
                        <i class="fa-solid fa-robot"></i> MODE AUTO ACTIF
                    </button>
                `;
            } else {
                autoContainer.innerHTML = `
                    <button type="button" class="btn btn-outline font-bold text-center px-1 py-05 muted cursor-pointer mb-0 w-100 flex-center" title="Cliquez pour activer le mode d'entrée automatique">
                        <i class="fa-solid fa-hand"></i> MODE MANUEL
                    </button>
                `;
            }
        }
    }

    // 2. Récupération et traitement des données du flux (Inchangé)
    function rafraichirFluxDonnees() {
        fetch('/api/stats?period=semaine')
            .then(res => res.json())
            .then(data => {
                // A. Injection des boîtes KPI opérationnelles
                document.getElementById('kpi-hourly-entries').textContent = data.hourly_entries || 0;
                document.getElementById('kpi-today-entries').textContent = data.today_entries || 0;
                document.getElementById('kpi-total-users').textContent = data.total_users || 0;
                if (liveBody) {
                    if (liveBody.innerHTML.includes("Chargement") || data.recent_entries.length > 0) {
                        liveBody.innerHTML = "";
                    }

                    if (!data.recent_entries || data.recent_entries.length === 0) {
                        liveBody.innerHTML = '<tr><td colspan="5" class="text-center muted p-05">Aucun passage enregistré aujourd\'hui.</td></tr>';
                        return;
                    }

                    data.recent_entries.slice(0, 20).forEach(entree => {
                        const tr = document.createElement('tr');
                        const heure = entree.date ? entree.date.split(' ')[1].substring(0, 5) : '--:--';
                        
                        // Détection intelligente du mode auto d'après ton architecture
                        const estAuto = (entree.projet === "N/A" && entree.zone === "N/A");
                        const classeCouleurHeure = estAuto ? "text-danger" : "text-success";
                        const iconeHeure = estAuto ? "fa-solid fa-robot" : "fa-regular fa-clock";
                        
                        const affichageZone = estAuto ? "Badge autonome" : entree.zone;
                        const affichageProjet = estAuto ? "Entrée automatique" : entree.projet;

                        tr.innerHTML = `
                            <td><span class="font-bold ${classeCouleurHeure}"><i class="${iconeHeure}"></i> ${heure}</span></td>
                            <td class="font-bold">${entree.nom}</td>
                            <td><span class="pill">${entree.statut}</span></td>
                            <td><i class="fa-solid fa-location-dot text-danger"></i> ${affichageZone || 'Non spécifiée'}</td>
                            <td class="muted">${affichageProjet || 'Visite libre'}</td>
                        `;
                        liveBody.appendChild(tr);
                    });
                }
            })
            .catch(err => console.error("Erreur actualisation flux :", err));
    }

    // NEW 🛠️ : INTERRUPTEUR DE MODE DIRECT DEPUIS L'ACCUEIL
    if (autoContainer) {
        autoContainer.addEventListener('click', function(e) {
            e.preventDefault();
            // Inverse l'état du mode automatique global
            window.fablabAutoMode = !window.fablabAutoMode;
            
            // Met à jour visuellement le bouton immédiatement après le clic
            rafraichirHorlogeEtStatut();
            // Force une mise à jour instantanée des couleurs du tableau
            rafraichirFluxDonnees();
        });
    }

    // 3. MISE EN PLACE DES RADARS AUTOMATIQUES (Inchangé)
    rafraichirHorlogeEtStatut();
    const intervalHorloge = setInterval(rafraichirHorlogeEtStatut, 1000);

    rafraichirFluxDonnees();
    const intervalDonnees = setInterval(rafraichirFluxDonnees, 5000);

    window.addEventListener('hashchange', function destructionTimers() {
        clearInterval(intervalHorloge);
        clearInterval(intervalDonnees);
        window.removeEventListener('hashchange', destructionTimers);
    });
}