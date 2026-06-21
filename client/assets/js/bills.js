/**
 * Gestion de la page Comptabilité (Bills)
 */

let CONFIG_BILLS = null;
let historyUserId = null;
let historyProject = null;

function initBillsPage() {
    console.log("Initialisation de la page Comptabilité v8 (Moteur Branché)...");
    
    fetch('/api/config').then(res => res.json()).then(data => {
        if (data.success) {
            CONFIG_BILLS = data.data;
            remplirSelectsBills();
            const selectPaiement = document.getElementById('moyen-paiement-select');
            if(selectPaiement && CONFIG_BILLS.paiements) {
                selectPaiement.innerHTML = '<option value="">-- Sélectionner --</option>';
                CONFIG_BILLS.paiements.forEach(p => {
                    if (p !== "Rechargement Solde" && p !== "Apport Matériel") {
                        selectPaiement.innerHTML += `<option value="${p}">${p}</option>`;
                    }
                });
            }
        }
    });

    // Mouvements crédit/débit
    const radioMouvements = document.querySelectorAll('input[name="mouvement-type"]');
    radioMouvements.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isCredit = e.target.value === 'CREDIT';
            document.getElementById('payment-method-container').classList.toggle('d-none', isCredit);
            document.getElementById('moyen-paiement-select').required = !isCredit;
        });
    });

    // Gestion Projets
    const projectTypeSelect = document.getElementById('project-type-select');
    if (projectTypeSelect) {
        projectTypeSelect.addEventListener('change', (e) => {
            document.getElementById('project-details-fields').classList.toggle('d-none', e.target.value === 'NONE');
            document.getElementById('project-name-input').required = e.target.value !== 'NONE';
        });
    }

    // Autocomplétion Projets
    const projectNameInput = document.getElementById('project-name-input');
    if (projectNameInput) {
        projectNameInput.addEventListener('input', (e) => {
            if (e.target.value.length < 2) return;
            fetch(`/api/search_projects?q=${encodeURIComponent(e.target.value)}`).then(res => res.json()).then(data => {
                const dl = document.getElementById('projects-autocomplete'); dl.innerHTML = "";
                data.items.forEach(proj => dl.innerHTML += `<option value="${proj}"></option>`);
            });
        });
    }

    // Matériaux
    const materialSelect = document.getElementById('material-select');
    if (materialSelect) {
        materialSelect.addEventListener('change', (e) => {
            const matObj = CONFIG_BILLS.materiaux.find(m => m.nom === e.target.value);
            document.getElementById('unit-display').textContent = matObj ? matObj.unite : "";
            calculerPrixMateriau();
        });
    }
    const materialWeight = document.getElementById('material-weight');
    if (materialWeight) materialWeight.addEventListener('input', calculerPrixMateriau);

    // Formulaire submission
    document.getElementById('payment-form').addEventListener('submit', enregistrerPaiement);

    // Historique & Filtres
    chargerHistoriquePaiements();
    document.getElementById('btn-filter-history').addEventListener('click', () => {
        historyProject = document.getElementById('filter-history-project').value; chargerHistoriquePaiements();
    });
    document.getElementById('btn-reset-history').addEventListener('click', () => {
        historyUserId = null; historyProject = null; document.getElementById('filter-history-project').value = ''; chargerHistoriquePaiements();
    });
    document.getElementById('btn-export-history').addEventListener('click', () => {
        let url = '/api/export_transactions_csv?';
        if (historyUserId) url += '&user_id=' + encodeURIComponent(historyUserId);
        if (historyProject) url += '&project=' + encodeURIComponent(historyProject);
        window.location.href = url;
    });

    // BRANCHEMENT AU MOTEUR UNIQUE (Avec forcerRFID pour la saisie de facture)
    MoteurScan.ecouter({
        inputRecherche: document.getElementById('manual-search'),
        datalist: document.getElementById('users-list'),
        forcerRFID: true,
        onUserFound: function(id) {
            fetch(`/api/user_info?id=${id}`).then(res => res.json()).then(data => {
                if (data.success) {
                    const user = data.data;
                    document.getElementById('current-user-id').value = user.id;
                    document.getElementById('panel-name').textContent = `${user.prenom} ${user.nom}`;
                    document.getElementById('panel-status').textContent = user.statut;
                    document.getElementById('panel-email').textContent = user.email || "-";
                    document.getElementById('panel-rfid').textContent = user.id_carte || "Non liée";
                    const pSolde = document.getElementById('panel-solde');
                    if (pSolde) {
                        pSolde.textContent = (user.montant || 0).toFixed(2) + " €";
                        pSolde.className = user.montant >= 0 ? "text-success" : "text-danger";
                    }
                    document.getElementById('btn-valider-payment').disabled = false;
                    historyUserId = user.id;
                    chargerHistoriquePaiements();
                }
            });
        }
    });
}

function remplirSelectsBills() {
    const matSelect = document.getElementById('material-select'); if (!matSelect) return;
    matSelect.innerHTML = '<option value="">-- Aucun / Manuel --</option>';
    CONFIG_BILLS.materiaux.forEach(m => matSelect.innerHTML += `<option value="${m.nom}">${m.nom} (${m.prix}€/${m.unite})</option>`);
}

function calculerPrixMateriau() {
    const matNom = document.getElementById('material-select').value;
    const poids = parseFloat(document.getElementById('material-weight').value) || 0;
    if (!CONFIG_BILLS || !matNom) return;
    const matObj = CONFIG_BILLS.materiaux.find(m => m.nom === matNom);
    if (matObj && poids > 0) document.getElementById('amount-final').value = (poids * matObj.prix).toFixed(2);
}

function chargerHistoriquePaiements() {
    let url = '/api/payments?limit=100';
    if (historyUserId) url += `&user_id=${historyUserId}`;
    if (historyProject) url += `&project=${encodeURIComponent(historyProject)}`;
    
    fetch(url).then(res => res.json()).then(data => {
        const tbody = document.getElementById('payments-history-table'); if (!tbody) return;
        
        // Initialisation ou message vide de sécurité
        tbody.innerHTML = data.success && data.data.length > 0 ? "" : '<tr><td colspan="6" class="text-center muted">Aucune transaction trouvée</td></tr>';
        
        if (data.success) {
            data.data.forEach(p => {
                const date = new Date(p.date).toLocaleString('fr-FR');
                const sign = p.type_mouvement === 'CREDIT' ? '+' : '-';
                
                //  Injecté de façon stable au cœur de la boucle de traitement du JSON
                tbody.innerHTML += `<tr>
                    <td>${date}</td>
                    <td>${p.user_prenom} ${p.user_nom}</td>
                    <td><strong>${p.nom}</strong></td>
                    <td><span class="pill">${p.type_mouvement === 'CREDIT' ? 'Apport Matériel' : (p.moyen_paiement || '-')}</span></td>
                    <td>${p.projet_nom || '-'}</td>
                    <td class="${p.type_mouvement === 'CREDIT' ? 'text-success' : 'text-danger'} font-bold text-right">${sign}${p.montant.toFixed(2)} €</td>
                </tr>`;
            });
        }
    });
}

function enregistrerPaiement(e) {
    e.preventDefault();
    const typeMouvement = document.querySelector('input[name="mouvement-type"]:checked').value;
    const montant = parseFloat(document.getElementById('amount-final').value);
    const materialSelect = document.getElementById('material-select').value;
    if (typeMouvement === 'CREDIT' && !materialSelect) { alert("Matériau obligatoire pour un crédit."); return; }

    const data = {
        user_id: document.getElementById('current-user-id').value, nom: document.getElementById('payment-name').value,
        numero_operation: document.getElementById('op-number').value, description: document.getElementById('payment-desc').value,
        commentaire: document.getElementById('payment-comment').value, projet_nom: document.getElementById('project-name-input').value || null,
        projet_type: document.getElementById('project-type-select').value !== 'NONE' ? document.getElementById('project-type-select').value : null,
        type_mouvement: typeMouvement, montant: montant, moyen_paiement: typeMouvement === 'CREDIT' ? "Rechargement Solde" : document.getElementById('moyen-paiement-select').value,
        materiau: materialSelect || null, poids: parseFloat(document.getElementById('material-weight').value) || null
    };

    fetch('/api/add_payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    .then(res => res.json()).then(resData => {
        if (resData.success) {
            alert("Opération enregistrée !"); document.getElementById('payment-form').reset();
            document.getElementById('project-details-fields').classList.add('d-none');
            initBillsPage(); // Recharge proprement le moteur et les filtres
        }
    });
}