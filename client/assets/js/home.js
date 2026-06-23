function initHomePage() {
    console.log("Poste de pilotage interactif v2 initialisé");
    
    // Restaurer le mode auto depuis localStorage
    if (localStorage.getItem('fablabAutoMode') === 'true') {
        window.fablabAutoMode = true;
    }
    
    const liveBody = document.getElementById('actions-live-body');
    const autoContainer = document.getElementById('auto-status-container');
    const timeDisplay = document.getElementById('time');
    const dateDisplay = document.getElementById('date-display');

    // 1. Mise à jour de la Date et de l'Heure + Badge Statut
    function rafraichirHorlogeEtStatut() {
        const dateEcl = new Date();
        
        // Affichage de l'heure défilante
        if (timeDisplay) {
            timeDisplay.textContent = dateEcl.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit'});
        }
        
        // Affichage de la date du jour (ex: "lun. 21 juin")
        if (dateDisplay) {
            dateDisplay.textContent = dateEcl.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
        }

        if (autoContainer) {
            if (window.fablabAutoMode === true) {
                autoContainer.innerHTML = `
                    <button type="button" class="btn btn-danger font-bold text-center px-1 py-05 cursor-pointer mb-0 w-100 flex-center" title="Cliquez pour repasser en mode manuel">
                        <i class="fa-solid fa-robot"></i> MODE AUTO ACTIF
                    </button>
                `;
            } else {
                autoContainer.innerHTML = `
                    <button type="button" class="btn btn-outline font-bold text-center px-1 py-05 muted cursor-pointer mb-0 w-100 flex-center" title="Cliquez pour passer en mode automatique">
                        <i class="fa-solid fa-hand"></i> MODE MANUEL
                    </button>
                `;
            }
        }
    }

    // 2. Récupération et traitement des données du flux
    function rafraichirFluxDonnees() {
        fetch('/api/stats?period=semaine')
            .then(res => res.json())
            .then(data => {
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

                    data.recent_entries.slice(0, 10).forEach(entree => {
                        const tr = document.createElement('tr');
                        const heure = entree.date ? entree.date.split(' ')[1].substring(0, 5) : '--:--';
                        
                        const estAuto = (entree.projet === "N/A" && entree.zone === "N/A");
                        const classeCouleurHeure = estAuto ? "text-danger" : "text-success";
                        const iconeHeure = estAuto ? "fa-solid fa-robot" : "fa-regular fa-clock";
                        
                        const affichageZone = estAuto ? "Badge autonome" : entree.zone;
                        const affichageProjet = estAuto ? "Entrée automatique" : entree.projet;

                        // Extraction de l'ID utilisateur pour la passerelle
                        // Si le serveur renvoie l'ID dans l'objet, on le stocke, sinon on se basera sur la recherche
                        const userId = entree.id_utilisateur || entree.user_id || "";

                        tr.innerHTML = `
                            <td><span class="font-bold ${classeCouleurHeure}"><i class="${iconeHeure}"></i> ${heure}</span></td>
                            <td>
                                <a class="action-redirection-user font-bold text-primary cursor-pointer" data-nom="${entree.nom}" title="Ouvrir la fiche de ce membre sur le scanner">
                                    ${entree.nom}
                                </a>
                            </td>
                            <td><span class="pill">${entree.statut}</span></td>
                            <td><i class="fa-solid fa-location-dot text-danger"></i> ${affichageZone || 'Non spécifiée'}</td>
                            <td class="muted">${affichageProjet || 'Visite libre'}</td>
                        `;
                        liveBody.appendChild(tr);
                    });

                    // Écouteur de clic sur les noms pour déclencher la bascule d'onglet vers Utilisateurs
                    document.querySelectorAll('.action-redirection-user').forEach(lien => {
                        lien.addEventListener('click', function(e) {
                            e.preventDefault();
                            const nomComplet = this.getAttribute('data-nom');
                            
                            // On mémorise l'identité dans la variable partagée
                            window.redirectionUserNom = nomComplet;
                            
                            // 🚀 Redirection physique vers l'onglet Utilisateurs de ton routeur
                            window.location.hash = "#users"; 
                        });
                    });
                }
            })
            .catch(err => console.error("Erreur actualisation flux :", err));
    }

    // INTERRUPTEUR DE MODE DIRECT DEPUIS L'ACCUEIL
    if (autoContainer) {
        autoContainer.addEventListener('click', function(e) {
            e.preventDefault();
            window.fablabAutoMode = !window.fablabAutoMode;
            // Persévérer dans localStorage
            localStorage.setItem('fablabAutoMode', window.fablabAutoMode);
            rafraichirHorlogeEtStatut();
            rafraichirFluxDonnees();
        });
    }

    // 3. MISE EN PLACE DES RADARS AUTOMATIQUES
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