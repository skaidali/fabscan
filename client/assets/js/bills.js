/**
 * Gestion de la page Comptabilité (Bills)
 */

let CONFIG_BILLS = null;
let SCAN_POLLING_BILLS = null;

// Mémoire des filtres actifs pour l'historique et l'export
let historyUserId = null;
let historyProject = null;

function initBillsPage() {
    console.log("Initialisation de la page Comptabilité v6 (Filtres & Export corrigés)...");
    
    // 1. Charger la configuration
    fetch('/api/config')
        .then(res => res.json())
        .then(data => {
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

    // 2. Écouter le type de mouvement (Crédit/Débit)
    const radioMouvements = document.querySelectorAll('input[name="mouvement-type"]');
    radioMouvements.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const isCredit = e.target.value === 'CREDIT';
            
            const paymentContainer = document.getElementById('payment-method-container');
            const paymentSelect = document.getElementById('moyen-paiement-select');
            
            if (isCredit) {
                paymentContainer.classList.add('d-none');
                paymentSelect.required = false;
            } else {
                paymentContainer.classList.remove('d-none');
                paymentSelect.required = true;
            }
        });
    });

    // 3. Écouter le changement de type de projet
    const projectTypeSelect = document.getElementById('project-type-select');
    if (projectTypeSelect) {
        projectTypeSelect.addEventListener('change', (e) => {
            const hasProject = e.target.value !== 'NONE';
            const projectFields = document.getElementById('project-details-fields');
            
            if (hasProject) {
                projectFields.classList.remove('d-none');
            } else {
                projectFields.classList.add('d-none');
            }
            document.getElementById('project-name-input').required = hasProject;
        });
    }

    // 4. Autocomplétion des projets
    const projectNameInput = document.getElementById('project-name-input');
    if (projectNameInput) {
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
    }

    // 5. Écouter le changement de matériau
    const materialSelect = document.getElementById('material-select');
    if (materialSelect) {
        materialSelect.addEventListener('change', (e) => {
            const matNom = e.target.value;
            if (!CONFIG_BILLS) return;
            const matObj = CONFIG_BILLS.materiaux.find(m => m.nom === matNom);
            if (matObj) {
                document.getElementById('unit-display').textContent = matObj.unite;
                calculerPrixMateriau();
            } else {
                document.getElementById('unit-display').textContent = "";
            }
        });
    }

    const materialWeight = document.getElementById('material-weight');
    if (materialWeight) {
        materialWeight.addEventListener('input', calculerPrixMateriau);
    }

    // 6. Recherche manuelle utilisateur (PANNEAU GAUCHE)
    const searchInput = document.getElementById('manual-search');
    const usersList = document.getElementById('users-list');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.length < 2) return;

            fetch(`/api/search_users?q=${encodeURIComponent(val)}`)
                .then(res => res.json())
                .then(data => {
                    usersList.innerHTML = "";
                    data.items.forEach(user => {
                        const opt = document.createElement('option');
                        opt.value = user.texte || (user.prenom + " " + user.nom + " (" + user.statut + ")");
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
                    searchInput.value = ""; 
                    break;
                }
            }
        });
    }

    // 7. Formulaire
    const paymentForm = document.getElementById('payment-form');
    if (paymentForm) {
        paymentForm.addEventListener('submit', enregistrerPaiement);
    }

    // 8. Polling Scan
    lancerPollingScanBills();

    // 9. Initialisation
    chargerHistoriquePaiements();

    // ==========================================
    // 10. GESTION DES FILTRES ET DE L'EXPORT (NOUVEAU)
    // ==========================================
    const btnFilterHistory = document.getElementById('btn-filter-history');
    if (btnFilterHistory) {
        btnFilterHistory.addEventListener('click', function() {
            // On met à jour la mémoire du projet, l'ID utilisateur reste celui du panneau gauche
            historyProject = document.getElementById('filter-history-project').value;
            chargerHistoriquePaiements();
        });
    }

    const btnResetHistory = document.getElementById('btn-reset-history');
    if (btnResetHistory) {
        btnResetHistory.addEventListener('click', function() {
            // On vide tout : on revoit toutes les transactions du FabLab
            historyUserId = null;
            historyProject = null;
            document.getElementById('filter-history-project').value = '';
            chargerHistoriquePaiements();
        });
    }

    const btnExportHistory = document.getElementById('btn-export-history');
    if (btnExportHistory) {
        btnExportHistory.addEventListener('click', function() {
            // L'export utilise exactement la même mémoire que l'affichage
            let url = '/api/export_transactions_csv?';
            if (historyUserId) url += '&user_id=' + encodeURIComponent(historyUserId);
            if (historyProject) url += '&project=' + encodeURIComponent(historyProject);
            window.location.href = url;
        });
    }
}

function remplirSelectsBills() {
    if (!CONFIG_BILLS) return;

    const matSelect = document.getElementById('material-select');
    if (!matSelect) return;
    
    matSelect.innerHTML = '<option value="">-- Aucun / Manuel --</option>';
    CONFIG_BILLS.materiaux.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.nom;
        opt.textContent = `${m.nom} (${m.prix}€/${m.unite})`;
        matSelect.appendChild(opt);
    });
}

function calculerPrixMateriau() {
    const matNom = document.getElementById('material-select').value;
    const poids = parseFloat(document.getElementById('material-weight').value) || 0;
    
    if (!CONFIG_BILLS || !matNom) return;
    
    const matObj = CONFIG_BILLS.materiaux.find(m => m.nom === matNom);
    
    if (matObj && poids > 0) {
        const prix = (poids * matObj.prix).toFixed(2);
        document.getElementById('amount-final').value = prix;
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
                
                const panelSolde = document.getElementById('panel-solde');
                if (panelSolde) {
                    panelSolde.textContent = (user.montant || 0).toFixed(2) + " €";
                    panelSolde.className = user.montant >= 0 ? "text-success" : "text-danger";
                }

                document.getElementById('btn-valider-payment').disabled = false;
                
                // Mémoriser l'utilisateur et charger son historique
                historyUserId = user.id;
                chargerHistoriquePaiements();
            } else {
                alert("Utilisateur ou carte non reconnu.");
            }
        });
}

// Ajout du paramètre searchUser pour chercher par nom/prénom
function chargerHistoriquePaiements(userId = null, project = null, searchUser = null) {
    let url = '/api/payments?limit=100'; 
    if (userId) url += `&user_id=${userId}`;
    if (project) url += `&project=${encodeURIComponent(project)}`;
    if (searchUser) url += `&search_user=${encodeURIComponent(searchUser)}`;

    const tableBody = document.getElementById('payments-history-table');
    const userListDiv = document.getElementById('user-payments-list');

    fetch(url)
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const payments = data.data;
                
                // Remplir le grand tableau
                if (tableBody) {
                    tableBody.innerHTML = "";
                    if (payments.length === 0) {
                        tableBody.innerHTML = '<tr><td colspan="6" class="text-center muted">Aucune transaction trouvée</td></tr>';
                    } else {
                        payments.forEach(p => {
                            const date = new Date(p.date).toLocaleString('fr-FR');
                            
                            // FORMATAGE DU MONTANT (ex: +15.00 € ou -5.00 €)
                            const valeur = p.type_mouvement === 'CREDIT' ? `+${p.montant.toFixed(2)} €` : `-${p.montant.toFixed(2)} €`;
                            
                            // LE CORRECTIF COULEUR EST ICI : On utilise tes classes CSS existantes
                            const colorClass = p.type_mouvement === 'CREDIT' ? 'text-success' : 'text-danger';
                            
                            let projetInfo = p.projet_nom || "-";
                            if (p.projet_tuteur) projetInfo += `<br><small class="muted">Tuteur: ${p.projet_tuteur}</small>`;

                            let opInfo = `<strong>${p.nom}</strong>`;
                            if (p.numero_operation) opInfo += ` <small class="pill">${p.numero_operation}</small>`;
                            if (p.description) opInfo += `<br><small class="muted">${p.description}</small>`;

                            // Le type est masqué, on ne garde que le moyen de paiement (ou "Apport" pour crédit)
                            let moyenAffiche = p.type_mouvement === 'CREDIT' ? 'Apport Matériel' : (p.moyen_paiement || '-');

                            tableBody.innerHTML += `
                                <tr>
                                    <td>${date}</td>
                                    <td>${p.user_prenom} ${p.user_nom}</td>
                                    <td>${opInfo}</td>
                                    <td><span class="pill">${moyenAffiche}</span></td>
                                    <td>${projetInfo}</td>
                                    <td class="${colorClass} font-bold text-right">${valeur}</td>
                                </tr>
                            `;
                        });
                    }
                }

                // Panneau utilisateur (à gauche)
                if (userId && userListDiv) {
                    userListDiv.innerHTML = "";
                    if (payments.length === 0) {
                        userListDiv.innerHTML = '<p class="muted text-center">Aucun paiement</p>';
                    } else {
                        payments.forEach(p => {
                            const div = document.createElement('div');
                            div.className = "flex-between mb-05 p-05";
                            div.style.borderBottom = "1px solid var(--border-color)";
                            
                            const date = new Date(p.date).toLocaleDateString('fr-FR');
                            
                            // LE CORRECTIF COULEUR EST ICI AUSSI
                            const colorClass = p.type_mouvement === 'CREDIT' ? 'text-success' : 'text-danger';
                            const valeur = p.type_mouvement === 'CREDIT' ? `+${p.montant.toFixed(2)} €` : `-${p.montant.toFixed(2)} €`;

                            div.innerHTML = `
                                <div>
                                    <div style="font-size: 0.9rem; font-weight: bold;">${p.nom}</div>
                                    <div style="font-size: 0.7rem;" class="muted">${date} - ${p.projet_nom || "Sans projet"}</div>
                                </div>
                                <div class="${colorClass} font-bold">${valeur}</div>
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
    const isCredit = typeMouvement === 'CREDIT';
    const montant = parseFloat(document.getElementById('amount-final').value);

    if (isNaN(montant) || montant <= 0) {
        alert("Veuillez saisir un montant valide.");
        return;
    }

    const projectType = document.getElementById('project-type-select').value;
    const materialSelect = document.getElementById('material-select').value;
    const materialWeight = parseFloat(document.getElementById('material-weight').value);
    
    if (isCredit && !materialSelect) {
        alert("Pour créditer le compte, vous devez obligatoirement indiquer le matériau ramené par l'utilisateur.");
        return;
    }

    let moyenPaiement = "";
    if (isCredit) {
        moyenPaiement = "Rechargement Solde"; 
    } else {
        const selectPaiement = document.getElementById('moyen-paiement-select');
        moyenPaiement = selectPaiement ? selectPaiement.value : "";
        if (!moyenPaiement) {
            alert("Veuillez sélectionner un moyen de paiement.");
            return;
        }
    }

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
        moyen_paiement: moyenPaiement, 
        materiau: materialSelect ? materialSelect : null,
        poids: materialSelect && !isNaN(materialWeight) ? materialWeight : null
    };

    fetch('/api/add_payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(res => res.json())
    .then(resData => {
        if (resData.success) {
            alert("Opération enregistrée avec succès !");
            document.getElementById('payment-form').reset();
            
            document.getElementById('project-details-fields').classList.add('d-none');
            const radioCredit = document.querySelector('input[name="mouvement-type"][value="CREDIT"]');
            if (radioCredit) {
                radioCredit.checked = true;
                radioCredit.dispatchEvent(new Event('change')); 
            }
            
            chargerProfilBills(data.user_id);
        } else {
            alert("Erreur : " + resData.error);
        }
    });
}