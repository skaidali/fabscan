/**
 * Gestion de la page Comptabilité (Bills)
 */

let CONFIG_BILLS = null;
let historyUserId = null;
let historyProject = null;
let historyProjectType = "all"; 
let MEMOIRE_TRANSACTIONS = [];
let SUGGESTIONS_PROJETS_FORMULAIRE = []; // Stocke temporairement les projets + tuteurs trouvés

function initBillsPage() {
    console.log("Initialisation de la page Comptabilité v12 (Moteur Évolutif Global)...");
    
    historyUserId = null;
    historyProject = null;
    historyProjectType = "all";
    
    fetch('/api/config').then(res => res.json()).then(data => {
        if (data.success) {
            CONFIG_BILLS = data.data;
            remplirSelectsBills();
            
            // Remplissage dynamique des sélecteurs de types de projets depuis le config.json
            const projectTypeSelect = document.getElementById('project-type-select');
            const filterProjectTypeSelect = document.getElementById('filter-history-project-type');
            
            if (CONFIG_BILLS.projets_types) {
                if (projectTypeSelect) {
                    projectTypeSelect.innerHTML = '<option value="NONE">Aucun projet</option>';
                    CONFIG_BILLS.projets_types.forEach(t => {
                        projectTypeSelect.innerHTML += `<option value="${t.id_type}">${t.nom}</option>`;
                    });
                }
                if (filterProjectTypeSelect) {
                    filterProjectTypeSelect.innerHTML = '<option value="all">Tous les types de projets</option>';
                    CONFIG_BILLS.projets_types.forEach(t => {
                        filterProjectTypeSelect.innerHTML += `<option value="${t.id_type}">${t.nom}</option>`;
                    });
                }
            }

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

    // Affichage des champs de détails projets
    const projectTypeSelect = document.getElementById('project-type-select');
    if (projectTypeSelect) {
        projectTypeSelect.addEventListener('change', (e) => {
            document.getElementById('project-details-fields').classList.toggle('d-none', e.target.value === 'NONE');
            document.getElementById('project-name-input').required = e.target.value !== 'NONE';
            document.getElementById('project-name-input').value = ""; 
        });
    }

    // 🔍 AUTOCOMPLÉTION DYNAMIQUE AVEC PRÉ-REMPLISSAGE DU TUTEUR
    const projectNameInput = document.getElementById('project-name-input');
    if (projectNameInput) {
        projectNameInput.addEventListener('input', (e) => {
            const valeur = e.target.value;
            if (valeur.length < 1) return;
            
            const typeActuel = projectTypeSelect.value;
            fetch(`/api/search_projects?q=${encodeURIComponent(valeur)}&type=${encodeURIComponent(typeActuel)}`)
                .then(res => res.json())
                .then(data => {
                    const dl = document.getElementById('projects-autocomplete'); if (!dl) return;
                    dl.innerHTML = "";
                    
                    // On mémorise les résultats côté client
                    SUGGESTIONS_PROJETS_FORMULAIRE = data.items;
                    
                    // On injecte les suggestions dans la datalist
                    data.items.forEach(proj => {
                        dl.innerHTML += `<option value="${proj.nom}"></option>`;
                    });
                });
        });

        // Détection de la sélection pour pré-remplir le tuteur
        projectNameInput.addEventListener('change', (e) => {
            const nomSelectionne = e.target.value;
            // On cherche si le nom saisi correspond à un projet connu dans nos suggestions
            const projetTrouve = SUGGESTIONS_PROJETS_FORMULAIRE.find(p => p.nom === nomSelectionne);
            
            if (projetTrouve && projetTrouve.tuteur) {
                // On remplit automatiquement le champ tuteur !
                document.getElementById('project-tutor').value = projetTrouve.tuteur;
            }
        });
    }

    //  AUTOCOMPLÉTION DYNAMIQUE : Barre de recherche du tableau d'historique
    const filterProjectInput = document.getElementById('filter-history-project');
    if (filterProjectInput) {
        filterProjectInput.addEventListener('input', (e) => {
            if (e.target.value.length < 1) return;
            const filterType = document.getElementById('filter-history-project-type').value;
            
            fetch(`/api/search_projects?q=${encodeURIComponent(e.target.value)}&type=${encodeURIComponent(filterType)}`)
                .then(res => res.json())
                .then(data => {
                    const dl = document.getElementById('projects-filter-autocomplete'); if (!dl) return;
                    dl.innerHTML = "";
                    // .nom car l'API renvoie désormais un tableau d'objets
                    data.items.forEach(proj => dl.innerHTML += `<option value="${proj.nom}"></option>`);
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

    // Historique & Événements Boutons
    chargerHistoriquePaiements();
    document.getElementById('btn-filter-history').addEventListener('click', () => {
        historyProject = document.getElementById('filter-history-project').value;
        historyProjectType = document.getElementById('filter-history-project-type').value;
        chargerHistoriquePaiements();
    });
    document.getElementById('btn-reset-history').addEventListener('click', () => {
        historyUserId = null; historyProject = null; historyProjectType = "all";
        document.getElementById('filter-history-project').value = '';
        document.getElementById('filter-history-project-type').value = 'all';
        document.getElementById('current-user-id').value = "";
        document.getElementById('panel-name').textContent = "En attente...";
        document.getElementById('panel-status').textContent = "-";
        document.getElementById('panel-email').textContent = "-";
        document.getElementById('panel-rfid').textContent = "-";
        document.getElementById('panel-solde').textContent = "-";
        document.getElementById('panel-solde').className = "text-primary";
        document.getElementById('user-payments-list').innerHTML = '<p class="muted text-center">Aucun utilisateur sélectionné</p>';
        document.getElementById('manual-search').value = "";
        document.getElementById('btn-valider-payment').disabled = true;
        document.getElementById('transaction-details-panel').classList.add('d-none');
        chargerHistoriquePaiements();
    });
    document.getElementById('btn-export-history').addEventListener('click', () => {
        let url = '/api/export_transactions_csv?limit=10000';
        if (historyUserId) url += '&user_id=' + encodeURIComponent(historyUserId);
        if (historyProject) url += '&project=' + encodeURIComponent(historyProject);
        window.location.href = url;
    });

    const btnFermerTx = document.getElementById('btn-fermer-transaction');
    if (btnFermerTx) { btnFermerTx.addEventListener('click', () => { document.getElementById('transaction-details-panel').classList.add('d-none'); }); }

    // MOTEUR DE SCAN UNIQUE
    MoteurScan.ecouter({
        inputRecherche: document.getElementById('manual-search'),
        datalist: document.getElementById('users-list'),
        forcerRFID: true,
        onUserFound: chargerProfilUtilisateurCompta
    });
}

function chargerProfilUtilisateurCompta(id) {
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
                pSolde.className = user.montant >= 0 ? "text-success font-bold" : "text-danger font-bold";
            }
            document.getElementById('btn-valider-payment').disabled = false;
            historyUserId = user.id;
            
            chargerHistoriquePaiements();
            chargerMiniHistoriqueGauche(user.id);
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
        tbody.innerHTML = data.success && data.data.length > 0 ? "" : '<tr><td colspan="7" class="text-center muted">Aucune transaction trouvée</td></tr>';
        
        if (data.success) {
            let transactionsFiltrees = data.data;
            if (historyProjectType !== "all") {
                transactionsFiltrees = data.data.filter(t => t.projet_type === historyProjectType);
            }
            
            MEMOIRE_TRANSACTIONS = transactionsFiltrees;
            if (transactionsFiltrees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center muted">Aucune transaction ne correspond à ce type de projet</td></tr>';
                return;
            }

            transactionsFiltrees.forEach(p => {
                const date = new Date(p.date).toLocaleString('fr-FR');
                const sign = p.type_mouvement === 'CREDIT' ? '+' : '-';
                const affichageNom = (p.user_prenom !== "Membre" && p.user_nom !== "Supprimé") ? `${p.user_prenom} ${p.user_nom}` : "👤 *Membre supprimé*";
                
                let libelleTypeProjet = "-";
                if (p.projet_type && CONFIG_BILLS && CONFIG_BILLS.projets_types) {
                    let tObj = CONFIG_BILLS.projets_types.find(t => t.id_type === p.projet_type);
                    libelleTypeProjet = tObj ? tObj.nom.split(" (")[0] : p.projet_type;
                }

                const tr = document.createElement('tr');
                tr.className = "cursor-pointer hover-row";
                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${affichageNom}</td>
                    <td><span class="pill muted">${libelleTypeProjet}</span></td>
                    <td><strong>${p.projet_nom || '-'}</strong></td>
                    <td class="${p.type_mouvement === 'CREDIT' ? 'text-success' : 'text-danger'} font-bold">${sign}${p.montant.toFixed(2)} €</td>
                    <td><span class="pill">${p.type_mouvement === 'CREDIT' ? 'Apport Matériel' : (p.moyen_paiement || '-')}</span></td>
                    <td>${p.nom}</td>
                `;
                
                tr.addEventListener('click', () => ouvrirVoletDetailsTransaction(p.id_paiement));
                tbody.appendChild(tr);
            });
        }
    });
}

function ouvrirVoletDetailsTransaction(id) {
    const tx = MEMOIRE_TRANSACTIONS.find(t => t.id_paiement === id); if (!tx) return;
    const panel = document.getElementById('transaction-details-panel');
    const content = document.getElementById('transaction-details-content');
    const dateLong = new Date(tx.date).toLocaleString('fr-FR');
    const typeLabel = tx.type_mouvement === 'CREDIT' ? '🟢 CRÉDIT (Apport)' : '🔴 DÉBIT (Facturation)';

    content.innerHTML = `
        <div class="flex-between"><span>Date :</span><span class="muted">${dateLong}</span></div>
        <div class="flex-between"><span>Type :</span><strong>${typeLabel}</strong></div>
        <div class="flex-between"><span>Opération :</span><strong>${tx.nom}</strong></div>
        <div class="flex-between"><span>Montant :</span><strong style="font-size: 1.1rem; color: ${tx.type_mouvement === 'CREDIT' ? 'var(--success)' : 'var(--danger)'}">${tx.type_mouvement === 'CREDIT' ? '+' : '-'}${tx.montant.toFixed(2)} €</strong></div>
        <div class="flex-between"><span>Régie / Moyen :</span><span class="pill">${tx.moyen_paiement || '-'}</span></div>
        <hr class="divider">
        <div class="flex-between"><span>Liaison Projet :</span><strong>${tx.projet_nom || 'Aucun'}</strong></div>
        <div class="flex-between"><span>Type Projet :</span><span>${tx.projet_type || 'Non spécifié'}</span></div>
        <div class="flex-between"><span>Responsable / Tuteur :</span><strong>${tx.projet_tuteur || '👤 Aucun tuteur enregistré'}</strong></div>
        <hr class="divider">
        <div class="flex-between"><span>Matériau :</span><span>${tx.materiau || 'N/A'}</span></div>
        <div class="flex-between"><span>Quantité / Poids :</span><span>${tx.poids ? tx.poids + ' unités' : 'N/A'}</span></div>
        <hr class="divider">
        <div class="flex-column"><span class="muted">Description :</span><p class="mt-02" style="background: rgba(0,0,0,0.02); padding: 0.4rem; border-radius: 4px;">${tx.description || 'Aucune description'}</p></div>
        <div class="flex-column"><span class="muted">N° Opération en banque :</span><strong>${tx.numero_operation || 'Aucun'}</strong></div>
        <div class="flex-column"><span class="muted">Commentaire interne :</span><em class="text-sm">${tx.commentaire || 'Aucun'}</em></div>
    `;
    panel.classList.remove('d-none');
}

function chargerMiniHistoriqueGauche(userId) {
    const listDiv = document.getElementById('user-payments-list'); if (!listDiv) return;
    fetch(`/api/payments?user_id=${userId}&limit=5`).then(res => res.json()).then(resultat => {
        if (resultat.success) {
            listDiv.innerHTML = resultat.data.length === 0 ? '<p class="muted text-center">Aucune transaction récente</p>' : "";
            resultat.data.forEach(p => {
                const div = document.createElement('div'); div.className = "flex-between mb-05 p-05 highlight-box";
                div.style.borderBottom = "1px solid var(--border-color)";
                const dateShort = new Date(p.date).toLocaleDateString('fr-FR');
                const color = p.type_mouvement === 'CREDIT' ? 'var(--success)' : 'var(--danger)';
                div.innerHTML = `<div><div style="font-size: 0.85rem; font-weight: bold;">${p.nom}</div><div style="font-size: 0.7rem;" class="muted">${dateShort} - ${p.projet_nom || "Sans projet"}</div></div><div style="color: ${color}; font-weight: bold;">${p.type_mouvement === 'CREDIT' ? '+' : '-'}${p.montant.toFixed(2)}€</div>`;
                listDiv.appendChild(div);
            });
        }
    });
}

function enregistrerPaiement(e) {
    e.preventDefault();
    const currentId = document.getElementById('current-user-id').value;
    const typeMouvement = document.querySelector('input[name="mouvement-type"]:checked').value;
    const montant = parseFloat(document.getElementById('amount-final').value);
    const materialSelect = document.getElementById('material-select').value;
    if (typeMouvement === 'CREDIT' && !materialSelect) { alert("Matériau obligatoire pour un crédit."); return; }

    const nomProjetSaisi = document.getElementById('project-name-input').value || "";
    const typeProjetSaisi = document.getElementById('project-type-select').value;

    const data = {
        user_id: currentId, nom: document.getElementById('payment-name').value,
        numero_operation: document.getElementById('op-number').value, description: document.getElementById('payment-desc').value,
        commentaire: document.getElementById('payment-comment').value, 
        projet_nom: typeProjetSaisi !== 'NONE' ? nomProjetSaisi.trim() : null, // Enregistre le nom épuré sans préfixes
        projet_type: typeProjetSaisi !== 'NONE' ? typeProjetSaisi : null,
        projet_tuteur: document.getElementById('project-tutor').value.trim() || null,
        type_mouvement: typeMouvement, montant: montant, moyen_paiement: typeMouvement === 'CREDIT' ? "Rechargement Solde" : document.getElementById('moyen-paiement-select').value,
        materiau: materialSelect || null, poids: parseFloat(document.getElementById('material-weight').value) || null
    };

    fetch('/api/add_payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    .then(res => res.json()).then(resData => {
        if (resData.success) {
            document.getElementById('payment-form').reset();
            document.getElementById('project-details-fields').classList.add('d-none');
            chargerProfilUtilisateurCompta(currentId);
        }
    });
}