/**
 * Gestion de la page Comptabilité (Bills)
 */

let CONFIG_BILLS = null;
let SCAN_POLLING_BILLS = null;

function initBillsPage() {
    console.log("Initialisation de la page Comptabilité v2...");
    
    // 1. Charger la configuration
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                CONFIG_BILLS = data.data;
                remplirSelectsBills();
            }
        });

    // 2. Écouter le type de mouvement (Crédit/Débit)
    const radioMouvements = document.querySelectorAll('input[name="mouvement-type"]');
    radioMouvements.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isCredit = e.target.value === 'CREDIT';
            document.getElementById('credit-fields').style.display = isCredit ? 'block' : 'none';
            document.getElementById('debit-fields').style.display = isCredit ? 'none' : 'block';
            
            // Reset des champs requis
            document.getElementById('amount-credit').required = isCredit;
            document.getElementById('amount-debit').required = !isCredit;
        });
    });

    // 3. Écouter le changement de type de projet
    const projectTypeSelect = document.getElementById('project-type-select');
    projectTypeSelect.addEventListener('change', (e) => {
        const hasProject = e.target.value !== 'NONE';
        document.getElementById('project-details-fields').style.display = hasProject ? 'block' : 'none';
        
        document.getElementById('project-name-input').required = hasProject;
        document.getElementById('project-tutor').required = hasProject;
    });

    // 4. Autocomplétion des projets
    const projectNameInput = document.getElementById('project-name-input');
    projectNameInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length < 2) return;

        fetch(`/api/search_projects?q=${encodeURIComponent(val)}`)
            .then(res => res.json())
            .then(data => {
                const datalist = document.getElementById('projects-autocomplete');
                datalist.innerHTML = "";
                data.items.forEach(proj => {
                    const opt = document.createElement('option');
                    opt.value = proj;
                    datalist.appendChild(opt);
                });
            });
    });

    // 5. Écouter le changement de matériau
    const materialSelect = document.getElementById('material-select');
    materialSelect.addEventListener('change', (e) => {
        const matNom = e.target.value;
        const matObj = CONFIG_BILLS.materiaux.find(m => m.nom === matNom);
        if (matObj) {
            document.getElementById('unit-display').textContent = matObj.unite;
            calculerPrixDebit();
        } else {
            document.getElementById('unit-display').textContent = "";
        }
    });

    // 6. Écouter le poids pour calculer le prix
    document.getElementById('material-weight').addEventListener('input', calculerPrixDebit);

    // 7. Recherche manuelle utilisateur
    const searchInput = document.getElementById('manual-search');
    const usersList = document.getElementById('users-list');

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length < 2) return;

        fetch(`/api/search_users?q=${encodeURIComponent(val)}`)
            .then(res => res.json())
            .then(data => {
                usersList.innerHTML = "";
                data.items.forEach(user => {
                    const opt = document.createElement('option');
                    opt.value = user.texte;
                    opt.dataset.id = user.id;
                    usersList.appendChild(opt);
                });
            });
    });

    searchInput.addEventListener('change', (e) => {
        const val = e.target.value;
        const options = usersList.childNodes;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === val) {
                chargerProfilBills(options[i].dataset.id);
                break;
            }
        }
    });

    // 8. Recherche Projet (Barre de recherche globale)
    const projectSearch = document.getElementById('project-search');
    const projectsList = document.getElementById('projects-list');

    projectSearch.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.length < 2) {
            if (val.length === 0) chargerHistoriquePaiements();
            return;
        }

        fetch(`/api/search_projects?q=${encodeURIComponent(val)}`)
            .then(res => res.json())
            .then(data => {
                projectsList.innerHTML = "";
                data.items.forEach(proj => {
                    const opt = document.createElement('option');
                    opt.value = proj;
                    projectsList.appendChild(opt);
                });
            });
    });

    projectSearch.addEventListener('change', (e) => {
        const val = e.target.value;
        chargerHistoriquePaiements(null, val);
    });

    // 9. Formulaire de paiement
    document.getElementById('payment-form').addEventListener('submit', enregistrerPaiement);

    // 10. Polling Scan
    lancerPollingScanBills();

    // 11. Charger l'historique complet par défaut
    chargerHistoriquePaiements();
}

function remplirSelectsBills() {
    if (!CONFIG_BILLS) return;

    // Matériaux
    const matSelect = document.getElementById('material-select');
    matSelect.innerHTML = '<option value="">-- Sélectionner un matériau --</option>';
    CONFIG_BILLS.materiaux.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.nom;
        opt.textContent = `${m.nom} (${m.prix}€/${m.unite})`;
        matSelect.appendChild(opt);
    });
}

function calculerPrixDebit() {
    const matNom = document.getElementById('material-select').value;
    const poids = parseFloat(document.getElementById('material-weight').value) || 0;
    const matObj = CONFIG_BILLS.materiaux.find(m => m.nom === matNom);
    
    if (matObj && poids > 0) {
        const prix = (poids * matObj.prix).toFixed(2);
        document.getElementById('amount-debit').value = prix;
    }
}

function lancerPollingScanBills() {
    if (SCAN_POLLING_BILLS) clearInterval(SCAN_POLLING_BILLS);
    
    SCAN_POLLING_BILLS = setInterval(() => {
        fetch('/api/get_last_scan')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.id_carte) {
                    chargerProfilBills(data.id_carte);
                }
            });
    }, 1500);
}

function chargerProfilBills(id) {
    fetch(`/api/user_info?id=${id}`)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const user = data.data;
                document.getElementById('current-user-id').value = user.id;
                document.getElementById('panel-name').textContent = `${user.prenom} ${user.nom}`;
                document.getElementById('panel-status').textContent = user.statut;
                document.getElementById('panel-email').textContent = user.email || "-";
                document.getElementById('panel-rfid').textContent = user.id_carte || "Non liée";
                
                document.getElementById('btn-valider-payment').disabled = false;
                
                // Charger ses paiements
                chargerHistoriquePaiements(user.id);
            } else {
                alert("Utilisateur ou carte non reconnu.");
            }
        });
}

function chargerHistoriquePaiements(userId = null, project = null) {
    let url = '/api/payments?limit=50';
    if (userId) url += `&user_id=${userId}`;
    if (project) url += `&project=${encodeURIComponent(project)}`;

    const tableBody = document.getElementById('payments-history-table');
    const userListDiv = document.getElementById('user-payments-list');
    const historyTitle = document.getElementById('history-title');

    if (project) historyTitle.textContent = `Projet: ${project}`;
    else if (userId) historyTitle.textContent = `Utilisateur sélectionné`;
    else historyTitle.textContent = `Toutes les transactions`;

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const payments = data.data;
                
                // Remplir le grand tableau
                tableBody.innerHTML = "";
                if (payments.length === 0) {
                    tableBody.innerHTML = '<tr><td colspan="7" class="text-center muted">Aucune transaction trouvée</td></tr>';
                } else {
                    payments.forEach(p => {
                        const row = document.createElement('tr');
                        const date = new Date(p.date).toLocaleString('fr-FR');
                        const valeur = p.type_mouvement === 'CREDIT' ? `+${p.montant}€` : `-${p.montant}€`;
                        const color = p.type_mouvement === 'CREDIT' ? 'var(--success-color)' : 'var(--danger-color)';
                        
                        let projetInfo = p.projet_nom || "-";
                        if (p.projet_tuteur) projetInfo += `<br><small class="muted">Tuteur: ${p.projet_tuteur}</small>`;

                        let opInfo = `<strong>${p.nom}</strong>`;
                        if (p.numero_operation) opInfo += ` <small class="pill">${p.numero_operation}</small>`;
                        if (p.description) opInfo += `<br><small class="muted">${p.description}</small>`;

                        row.innerHTML = `
                            <td>${date}</td>
                            <td>${p.user_prenom} ${p.user_nom}</td>
                            <td>${opInfo}</td>
                            <td>${projetInfo}</td>
                            <td><span class="pill">${p.projet_type || "N/A"}</span></td>
                            <td style="color: ${color}; font-weight: bold;">${valeur}</td>
                            <td>${p.commentaire || "-"}</td>
                        `;
                        tableBody.appendChild(row);
                    });
                }

                // Si c'est pour un utilisateur spécifique, remplir aussi son petit panneau
                if (userId) {
                    userListDiv.innerHTML = "";
                    if (payments.length === 0) {
                        userListDiv.innerHTML = '<p class="muted text-center">Aucun paiement</p>';
                    } else {
                        payments.forEach(p => {
                            const div = document.createElement('div');
                            div.className = "flex-between mb-05 p-05";
                            div.style.borderBottom = "1px solid var(--border-color)";
                            const date = new Date(p.date).toLocaleDateString('fr-FR');
                            const color = p.type_mouvement === 'CREDIT' ? 'var(--success-color)' : 'var(--danger-color)';
                            div.innerHTML = `
                                <div>
                                    <div style="font-size: 0.9rem; font-weight: bold;">${p.nom}</div>
                                    <div style="font-size: 0.7rem;" class="muted">${date} - ${p.projet_nom || "Sans projet"}</div>
                                </div>
                                <div style="color: ${color}; font-weight: bold;">${p.type_mouvement === 'CREDIT' ? '+' : '-'}${p.montant}€</div>
                            `;
                            userListDiv.appendChild(div);
                        });
                    }
                }
            }
        });
}

function enregistrerPaiement(e) {
    e.preventDefault();
    
    const typeMouvement = document.querySelector('input[name="mouvement-type"]:checked').value;
    const montant = typeMouvement === 'CREDIT' 
        ? parseFloat(document.getElementById('amount-credit').value) 
        : parseFloat(document.getElementById('amount-debit').value);

    if (isNaN(montant) || montant <= 0) {
        alert("Veuillez saisir un montant valide.");
        return;
    }

    const projectType = document.getElementById('project-type-select').value;
    const data = {
        user_id: document.getElementById('current-user-id').value,
        nom: document.getElementById('payment-name').value,
        numero_operation: document.getElementById('op-number').value,
        description: document.getElementById('payment-desc').value,
        commentaire: document.getElementById('payment-comment').value,
        projet_nom: projectType !== 'NONE' ? document.getElementById('project-name-input').value : null,
        projet_type: projectType !== 'NONE' ? projectType : null,
        projet_tuteur: projectType !== 'NONE' ? document.getElementById('project-tutor').value : null,
        type_mouvement: typeMouvement,
        montant: montant,
        materiau: typeMouvement === 'DEBIT' ? document.getElementById('material-select').value : null,
        poids: typeMouvement === 'DEBIT' ? parseFloat(document.getElementById('material-weight').value) : null
    };

    fetch('/api/add_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(resData => {
        if (resData.success) {
            alert("Paiement enregistré avec succès !");
            document.getElementById('payment-form').reset();
            // Cacher les champs projet après reset
            document.getElementById('project-details-fields').style.display = 'none';
            // Garder l'utilisateur sélectionné mais rafraichir son historique
            chargerHistoriquePaiements(data.user_id);
        } else {
            alert("Erreur : " + resData.error);
        }
    });
}
