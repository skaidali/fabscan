/**
 * Moteur de Scan et Recherche Unifié du FabLab (RFID, Scanette QR, Manuel)
 * Centralise la détection pour éviter les doublons et les conflits entre onglets.
 */
const MoteurScan = {
    intervalRFID: null,
    listenerScanette: null,

    /**
     * Initialise l'écoute globale pour un onglet spécifique
     * @param {Object} options Configuration des éléments et actions
     * @param {HTMLInputElement} options.inputRecherche Le champ texte de recherche manuelle
     * @param {HTMLDataListElement} options.datalist Le datalist associé au champ
     * @param {Function} options.onUserFound Fonction exécutée quand un ID utilisateur est validé
     * @param {boolean} options.forcerRFID Ignorer le mode auto global pour forcer la lecture RFID (ex: en compta)
     */
    ecouter: function(options) {
        const { inputRecherche, datalist, onUserFound, forcerRFID = false } = options;

        // ==========================================
        // 1. RECHERCHE MANUELLE (Datalist & Saisie)
        // ==========================================
        if (inputRecherche && datalist) {
            inputRecherche.addEventListener('input', (e) => {
                const texte = e.target.value;

                // Détection instantanée si le texte correspond à un choix existant
                const optionsDatalist = datalist.childNodes;
                for (let i = 0; i < optionsDatalist.length; i++) {
                    if (optionsDatalist[i].value === texte) {
                        onUserFound(optionsDatalist[i].dataset.id, "Recherche");
                        inputRecherche.value = ""; // Vide le champ
                        return;
                    }
                }

                // Sinon, recherche dynamique au clavier
                if (texte.length >= 2) {
                    fetch('/api/search_users?q=' + encodeURIComponent(texte))
                        .then(res => res.json())
                        .then(data => {
                            datalist.innerHTML = "";
                            if (data.success) {
                                data.items.forEach(u => {
                                    const opt = document.createElement('option');
                                    opt.value = u.texte || `${u.prenom} ${u.nom}`;
                                    opt.dataset.id = u.id;
                                    datalist.appendChild(opt);
                                });
                            }
                        });
                }
            });
        }

        // ==========================================
        // 2. LECTEUR RFID (Polling permanent)
        // ==========================================
        if (this.intervalRFID) clearInterval(this.intervalRFID);
        this.intervalRFID = setInterval(() => {
            // Sécurité : Si l'onglet a changé et que l'élément n'existe plus dans le DOM, on coupe
            if (inputRecherche && !document.body.contains(inputRecherche) && !window.fablabAutoMode) {
                clearInterval(this.intervalRFID);
                return;
            }

            fetch('/api/get_last_scan')
                .then(res => res.json())
                .then(data => {
                    // On n'intercepte le RFID que si on force (Compta) OU si le mode auto d'accueil n'est pas actif
                    if (data.success && data.id_carte) {
                        if (forcerRFID || !window.fablabAutoMode || document.getElementById('entry-form')) {
                            onUserFound(data.id_carte, "RFID");
                        }
                    }
                });
        }, 1000);

        // ==========================================
        // 3. SCANETTE QR (Écouteur clavier intelligent)
        // ==========================================
        if (this.listenerScanette) {
            document.removeEventListener('keydown', this.listenerScanette);
        }

        let barcodeBuffer = "";
        let barcodeTimeout = null;

        this.listenerScanette = function(e) {
            // Sécurité de changement d'onglet
            if (inputRecherche && !document.body.contains(inputRecherche) && !window.fablabAutoMode) return;

            if (e.key === 'Enter') {
                if (barcodeBuffer.length > 2) {
                    // Si c'est une frappe humaine lente sur Entrée dans un champ, on l'ignore
                    if ((e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') && e.target !== inputRecherche && barcodeBuffer === "") {
                        return;
                    }

                    e.preventDefault(); // Bloque les perturbations sur le formulaire

                    // Nettoyage anti-parasite du champ si on écrivait dedans
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                        if (e.target !== inputRecherche) {
                            var val = e.target.value;
                            if (val.endsWith(barcodeBuffer)) {
                                e.target.value = val.substring(0, val.length - barcodeBuffer.length);
                            }
                        } else {
                            e.target.value = "";
                        }
                    }

                    onUserFound(barcodeBuffer, "Scanette QR");
                }
                barcodeBuffer = "";
                return;
            }

            if (e.key.length === 1) {
                barcodeBuffer += e.key;
                if (barcodeTimeout) clearTimeout(barcodeTimeout);
                barcodeTimeout = setTimeout(function() {
                    barcodeBuffer = ""; // Humain détecté (>40ms) : reset
                }, 40);
            }
        };

        document.addEventListener('keydown', this.listenerScanette);
    }
};