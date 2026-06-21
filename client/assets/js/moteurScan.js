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
        // 1. RECHERCHE MANUELLE (Datalist & Saisie Centralisée)
        // ==========================================
        if (inputRecherche && datalist) {
            inputRecherche.addEventListener('input', (e) => {
                const texte = e.target.value;

                // Détection instantanée si le texte correspond à une option du datalist
                const optionsDatalist = datalist.getElementsByTagName('option');
                for (let i = 0; i < optionsDatalist.length; i++) {
                    if (optionsDatalist[i].value === texte) {
                        // Récupération de l'ID utilisateur mémorisé
                        const idTrouve = optionsDatalist[i].getAttribute('data-id');
                        onUserFound(idTrouve, "Recherche");
                        inputRecherche.value = ""; // Vide le champ de saisie
                        return;
                    }
                }

                // Recherche dynamique au clavier (à partir de 2 caractères)
                if (texte.length >= 2) {
                    fetch('/api/users?search=' + encodeURIComponent(texte) + '&page_size=10')
                        .then(res => res.json())
                        .then(data => {
                            datalist.innerHTML = "";
                            if (data.items && data.items.length > 0) {
                                data.items.forEach(u => {
                                    const opt = document.createElement('option');
                                    opt.value = `${u.prenom} ${u.nom} (${u.statut})`;
                                    opt.setAttribute('data-id', u.id); // On pose l'ID
                                    datalist.appendChild(opt);
                                });
                            }
                        });
                }
            });
        }
    
        // 2. LECTEUR RFID
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

        // 3. SCANETTE QR (Écouteur clavier)
        if (this.listenerScanette) {
            document.removeEventListener('keydown', this.listenerScanette);
        }

        let barcodeBuffer = "";
        let barcodeTimeout = null;

        this.listenerScanette = function(e) {
            // Sécurité : Si l'onglet a changé et que l'élément n'existe plus dans le DOM, on ignore
            if (!e || !e.key) return;
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
    },
    /**
     * Télécharge le QR code en arrière-plan, le copie dans le presse-papiers,
     * puis ouvre Zimbra avec le message pré-rempli.
     * @param {Object} user Données de l'utilisateur (prenom, nom, email, id)
     */
    // Variable pour garder la trace de l'unique fenêtre Zimbra ouverte
    fenetreZimbraUnique: null,

    envoyerEmailZimbra: function(user) {
        if (!user.email || user.email.trim() === "") {
            alert("Cet utilisateur n'a pas d'adresse e-mail renseignée.");
            return;
        }

        var emailDestinataire = encodeURIComponent(user.email);
        var sujet = encodeURIComponent("Votre QR Code d'accès au FabLab de l'Ecole Centrale de Lyon");
        
        var base_url = window.location.origin;
        var lienImageQR = base_url + "/api/qr_code?id=" + user.id;

        var corpsMessage = encodeURIComponent(
            "Bonjour " + user.prenom + ",\n\n" +
            "Votre inscription au FabLab de l'Ecole Centrale de Lyon a bien été validée !\n\n" +
            "Voici votre QR Code personnel à conserver précieusement sur votre téléphone pour vous identifier lors de vos prochaines visites du FabLab.\n" +
            "\n\n" +
            "\n⚠️ IMPORTANT : Pour des raisons pratiques, nous vous conseillons tout de même de vous identifier lors de vos entrées à l'aide de votre carte multiservices.\n\n" +
            "À très vite !\n" +
            "Pour l'équipe du FabLab,"
        );
        
        var urlComposeDirecte = "https://messagerie.ec-lyon.fr/?view=compose&to=" + emailDestinataire + "&subject=" + sujet + "&body=" + corpsMessage + "#1";

        // Copie automatique du QR Code dans le presse-papiers
        fetch(lienImageQR)
            .then(function(res) { return res.blob(); })
            .then(function(blob) {
                var item = new ClipboardItem({ "image/png": blob });
                return navigator.clipboard.write([item]);
            })
            .then(function() {
                console.log("QR Code copié dans le presse-papiers !");
                
                // GESTION DE LA FENÊTRE UNIQUE ET RE-ROUTAGE
                // Si la fenêtre existe déjà et qu'elle n'a pas été fermée par l'utilisateur
                if (MoteurScan.fenetreZimbraUnique && !MoteurScan.fenetreZimbraUnique.closed) {
                    
                    // On recycle la fenêtre existante : on change son URL vers le nouveau mail
                    MoteurScan.fenetreZimbraUnique.location.href = urlComposeDirecte;
                    MoteurScan.fenetreZimbraUnique.focus(); // On la remet au premier plan
                    
                } else {
                    // Si elle n'existe pas encore (ou a été fermée), on crée LA fenêtre unique.
                    // 'ZimbraFabLabPopup' est le nom de la fenêtre. Tant que ce nom est identique, 
                    // le navigateur refusera d'ouvrir d'autres onglets et réutilisera celui-ci.
                    MoteurScan.fenetreZimbraUnique = window.open(
                        urlComposeDirecte, 
                        'ZimbraFabLabPopup', 
                        'width=1100,height=750,scrollbars=yes,resizable=yes'
                    );
                }
            })
            .catch(function(err) {
                console.error("Impossible de copier l'image :", err);
                // En cas de secours, on applique la même logique de fenêtre unique
                if (MoteurScan.fenetreZimbraUnique && !MoteurScan.fenetreZimbraUnique.closed) {
                    MoteurScan.fenetreZimbraUnique.location.href = urlComposeDirecte;
                    MoteurScan.fenetreZimbraUnique.focus();
                } else {
                    MoteurScan.fenetreZimbraUnique = window.open(urlComposeDirecte, 'ZimbraFabLabPopup', 'width=1100,height=750');
                }
            });
    }
};