# -*- coding: utf-8 -*-
"""
Serveur FabLab - Gestion des entrées et utilisateurs
PE-63
"""
from pathlib import Path 
import http.server
import socketserver
from urllib.parse import urlparse, parse_qs
import json
from datetime import datetime as dt

# Import des fonctions SQL
import sql_request as db
import traitementQR as qr

# ==========================================
# VARIABLES GLOBALES ET CONFIGURATION
# ==========================================
PORT_SERVEUR = 8000
DERNIER_SCAN = None  # Mémorise temporairement la dernière carte lue

# ==========================================
# CLASSE PRINCIPALE DU SERVEUR
# ==========================================

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    """Gère toutes les requêtes (Fichiers HTML + API)"""
    
    root = Path(__file__).resolve().parent.parent
    static_dir = root / 'client'
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=self.static_dir, **kwargs)
    
    def init_params(self):
        """Découpe l'URL pour comprendre la requête"""
        parsed_url = urlparse(self.path)
        self.path_info = parsed_url.path.strip('/').split('/')
        self.params = parse_qs(parsed_url.query)

    def send_response_json(self, data, status=200):
        """Outil pour renvoyer des données au format JSON au navigateur"""
        body = json.dumps(data, ensure_ascii=False)
        try:
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(body.encode('utf-8'))))
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            try:
                self.wfile.write(body.encode('utf-8'))
            except (BrokenPipeError, ConnectionResetError) as e:
                # Client disconnected while we were writing the response; log and continue
                print(f"Client disconnected while writing response: {e}")
        except Exception as e:
            # Protect server from unexpected failures while preparing response
            print(f"send_response_json failed: {e}")

    def parse_json_body(self):
        """Outil pour lire les données envoyées en POST"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length <= 0:
            return {}
        try:
            post_data = self.rfile.read(content_length)
            return json.loads(post_data.decode('utf-8'))
        except Exception:
            self.send_response_json({"error": "Données JSON invalides"}, 400)
            return None

    # ==========================================
    # ROUTEUR PRINCIPAL (GET / POST / DELETE)
    # ==========================================
    def do_GET(self):
        self.init_params()
        
        # Si c'est une requête API
        if len(self.path_info) > 1 and self.path_info[0] == "api":
            route = self.path_info[1]
            
            if route == "get_last_scan":
                global DERNIER_SCAN
                self.send_response_json({"success": True, "id_carte": DERNIER_SCAN})
                DERNIER_SCAN = None  # Réinitialise la mémoire après lecture
            elif route == "qr_code":
                # Route pour afficher directement l'image du QR Code
                user_id = self.params.get('id', [''])[0]
                qr_path = self.root / "database" / "QRcode" / f"{user_id}.png"
                if qr_path.exists():
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/png')
                    self.end_headers()
                    with open(qr_path, 'rb') as f:
                        self.wfile.write(f.read())
                    return
                else:
                    self.send_response_json({"error": "QR Code introuvable"}, 404)

            elif route == "config":
                # Route pour distribuer les listes déroulantes
                config_path = self.root / "database" / "config.json"
                if config_path.exists():
                    with open(config_path, 'r', encoding='utf-8') as f:
                        config_data = json.load(f)
                    self.send_response_json({"success": True, "data": config_data})
                else:
                    self.send_response_json({"success": False, "error": "Fichier config.json introuvable"}, 404)
            
            elif route == "stats":
                # On intercepte les 5 filtres, avec des valeurs par défaut
                periode = self.params.get('period', ['semaine'])[0]
                statut = self.params.get('statut', ['all'])[0]
                certif = self.params.get('certif', ['all'])[0]
                zone = self.params.get('zone', ['all'])[0]
                motif = self.params.get('motif', ['all'])[0]
                
                # On envoie tout à la base de données
                self.send_response_json(db.get_stats(periode, statut, certif, zone, motif))

            
            elif route == "users":
                self.send_users()
            elif route == "entries":
                self.send_entries()
            elif route == "user_info":
                # Récupère les infos pour le panneau latéral
                scan_id = self.params.get('id', [''])[0]
                user_data = db.get_user_by_scan_id(scan_id)
                if user_data:
                    self.send_response_json({"success": True, "data": user_data})
                else:
                    self.send_response_json({"success": False, "error": "Badge inconnu"})
                    
            elif route == "search_users":
                # Pour la barre de recherche manuelle
                query = self.params.get('q', [''])[0]
                rows, _ = db.list_users(search=query, page_size=15)
                # On prépare une liste simplifiée pour le menu déroulant
                users = [{"id": r[0], "texte": f"{r[3]} {r[2]} ({r[4]})"} for r in rows]
                self.send_response_json({"success": True, "items": users})

            elif route == "export_stats_csv":
                self.export_stats_csv()

            elif route == "export_transactions_csv":
                self.export_transactions_csv()

            elif route == "payments":
                user_id = self.params.get('user_id', [None])[0]
                project = self.params.get('project', [None])[0]
                search_user = self.params.get('search_user', [None])[0]
                limit = int(self.params.get('limit', [50])[0])
                self.send_response_json({"success": True, "data": db.get_payments(id_user=user_id, project_name=project, limit=limit, search_user=search_user)})

            elif route == "search_projects":
                query = self.params.get('q', [''])[0]
                projects = db.search_projects(query)
                self.send_response_json({"success": True, "items": projects})

            else:
                self.send_response_json({"error": "Route API inconnue"}, 404)
        else:
            # Sinon, c'est une demande de page web classique (index.html, style.css...)
            super().do_GET()

    def do_POST(self):
        self.init_params()
        data = self.parse_json_body()
        if data is None:
            return
        
        if len(self.path_info) > 1 and self.path_info[0] == "api":
            route = self.path_info[1]
            
            if route == "scan":
                self.process_scan(data)
            elif route == "add_user":
                self.add_user(data)
            elif route == "add_entry":
                self.add_entry(data)
            elif route == "update_user":
                self.update_user(data)
            elif route == "add_payment":
                self.add_payment(data)
            else:
                self.send_response_json({"error": "Route POST inconnue"}, 404)
        else:
            self.send_response_json({"error": "Route POST invalide"}, 404)

    def do_DELETE(self):
        """Intercepte les requêtes de suppression (DELETE) du JavaScript"""
        self.init_params()
        
        # On vérifie que l'URL demandée est bien du type /api/user/123456
        if len(self.path_info) > 2 and self.path_info[0] == "api" and self.path_info[1] == "user":
            id_utilisateur = self.path_info[2]
            # On appelle ta fonction métier qui supprime le user et le QR Code
            self.delete_user(id_utilisateur)
        else:
            self.send_response_json({"error": "Route DELETE invalide"}, 404)
    
    # ==========================================
    # FONCTIONS MÉTIER (LOGIQUE DU FABLAB)
    # ==========================================
    def process_scan(self, data):
        """Traite le scan reçu de l'Arduino (Sert juste de relais vers la page web)"""
        global DERNIER_SCAN
        try:
            user_id = data.get('user_id')
            if not user_id:
                self.send_response_json({"success": False, "error": "ID manquant"}, 400)
                return

            DERNIER_SCAN = user_id 
            self.send_response_json({"success": True, "message": "Scan reçu par le serveur."})
                
        except Exception as e:
            self.send_response_json({"success": False, "error": str(e)}, 500)


    def add_user(self, data):
        """Ajoute un utilisateur et lie sa carte RFID"""
        try:
            # Générer un ID unique basé sur l'heure
            user_id = dt.now().strftime('%Y%m%d%H%M%S')
            
            nom = data.get('nom', '')
            prenom = data.get('prenom', '')
            email = data.get('email', '')
            statut = data.get('statut', '')
            id_carte = data.get('id_carte', '')
            
            if not nom or not prenom:
                self.send_response_json({"success": False, "error": "Nom et prénom requis"}, 400)
                return
            
            # 1. Créer l'utilisateur
            db.add_user(user_id, nom, prenom, statut, email)
            qr.createQR(False, user_id)  # Génère un QR code pour cet utilisateur
            
            # 2. Lier la carte RFID si elle existe
            if id_carte:
                db.link_id_carte(user_id, id_carte)
            
            self.send_response_json({
                "success": True,
                "id": user_id,
                "message": f"Utilisateur {prenom} {nom} ajouté !"
            })
        except Exception as e:
            print(f"Erreur add_user: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)


    def add_entry(self, data):
        """Ajoute une entrée à la base de données"""
        
        try:
            user_id = data.get('user_id')
            type_projet = data.get('type_projet', 'Non spécifié')
            zone_travail = data.get('zone_travail', 'Non spécifié')
            commentaire = data.get('commentaire', 'Non spécifié')
            
            if not user_id:
                self.send_response_json({"success": False, "error": "ID manquant"}, 400)
                return

            # Accept either a direct user id or a card id; resolve accordingly
            resolved = db.research_user_by_id_carte(user_id)
            if resolved:
                real_id, nom, prenom = resolved[0], resolved[1], resolved[2]
                db.add_entry(real_id, type_projet=type_projet, zone_travail=zone_travail, commentaire=commentaire)
                self.send_response_json({"success": True, "nom": nom, "prenom": prenom, "message": f"Bienvenue {prenom} {nom} !"})
                return

            user = db.research_user_by_id(user_id)
            if user:
                db.add_entry(user_id, type_projet=type_projet, zone_travail=zone_travail, commentaire=commentaire)
                self.send_response_json({"success": True, "nom": user[0], "prenom": user[1], "message": f"Bienvenue {user[1]} {user[0]} !"})
            else:
                self.send_response_json({"success": False, "error": "Badge non reconnu. Prêt pour l'inscription."})
                
        except Exception as e:
            print(f"Erreur scan: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def send_users(self):
        try:
            # 1. On récupère les filtres envoyés par le JavaScript
            search = self.params.get('search', [''])[0]
            statut = self.params.get('statut', ['all'])[0]
            page = int(self.params.get('page', [1])[0])
            page_size = int(self.params.get('page_size', [12])[0])

            # 2. On les donne à la base de données pour qu'elle trie
            rows, total = db.list_users(search=search, statut=statut, page=page, page_size=page_size)
            
            # 3. On prépare la réponse
            users = [{"id": r[0], "nom": r[2], "prenom": r[3], "statut": r[4]} for r in rows]
            self.send_response_json({"items": users, "total": total})
        except Exception as e:
            self.send_response_json({"error": str(e)}, 500)

    def send_entries(self):
        try:
            rows = db.get_all_entries(50)
            entries = [{"date": r[0], "nom": r[2], "prenom": r[3]} for r in rows]
            self.send_response_json(entries)
        except Exception as e:
            self.send_response_json({"error": str(e)}, 500)

    def update_user(self, data):
        """Mettre à jour un utilisateur depuis le panneau latéral"""
        try:
            user_id = data.get('id')
            if not user_id:
                self.send_response_json({"success": False, "error": "ID manquant"}, 400)
                return
            
            # 1. Mise à jour des infos de base
            db.update_user(
                user_id, 
                data.get('nom'), 
                data.get('prenom'), 
                data.get('statut'), 
                data.get('email')
            )
            
            # 2. Mise à jour de la carte RFID
            if 'id_carte' in data:
                db.link_id_carte(user_id, data.get('id_carte'))
                
            # 3. Mise à jour des certifications DYNAMIQUES
            if 'certifications' in data:
                db.update_certifications(user_id, data.get('certifications'))
            
            self.send_response_json({"success": True, "message": "Utilisateur mis à jour !"})
        except Exception as e:
            print(f"Erreur update_user: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)
            
    def add_payment(self, data):
        """Ajoute un paiement à la base de données"""
        try:
            user_id = data.get('user_id')
            if not user_id:
                self.send_response_json({"success": False, "error": "ID utilisateur manquant"}, 400)
                return

            db.add_payment(
                id_utilisateur=user_id,
                nom=data.get('nom'),
                description=data.get('description'),
                commentaire=data.get('commentaire'),
                projet_nom=data.get('projet_nom'),
                projet_type=data.get('projet_type'),
                projet_tuteur=data.get('projet_tuteur'),
                numero_operation=data.get('numero_operation'),
                type_mouvement=data.get('type_mouvement'),
                montant=data.get('montant'),
                materiau=data.get('materiau'),
                poids=data.get('poids'),
                moyen_paiement=data.get('moyen_paiement') # NOUVELLE LIGNE !
            )
            self.send_response_json({"success": True, "message": "Paiement enregistré !"})
        except Exception as e:
            print(f"Erreur add_payment: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def delete_user(self, user_id):
        """Fonction métier pour supprimer un utilisateur de la base de données"""
        try:
            # 1. On supprime de la base de données SQL
            supprime = db.delete_user(user_id) 
            
            if supprime:
                # 2. NOUVEAU : On supprime aussi l'image du QR Code du disque dur !
                qr.deleteQR(user_id)
                
                self.send_response_json({
                    "success": True, 
                    "message": "Utilisateur et QR Code supprimés avec succès."
                })
            else:
                self.send_response_json({
                    "success": False, 
                    "error": "Utilisateur introuvable dans la base."
                }, 404)
                
        except Exception as e:
            print(f"Erreur delete_user: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def export_stats_csv(self):
        """Génère un fichier CSV lisible par Excel avec l'historique du FabLab"""
        import io
        import csv
        try:
            # On récupère toutes les entrées (limite à 10000 pour ne pas saturer)
            rows = db.get_all_entries(limit=10000)
            
            output = io.StringIO()
            # On utilise le point-virgule comme séparateur pour Excel en français
            writer = csv.writer(output, delimiter=';') 
            
            # 1. On écrit en-tête des colonnes (Date et Heure séparées)
            writer.writerow(['Date', 'Heure', 'Statut', 'Nom', 'Prenom', 'Type Projet', 'Zone', 'Commentaire'])
            
            # 2. On écrit toutes les lignes de la base de données
            for row in rows:
                date_complete = str(row[0]) if row[0] else ""
                
                # On sépare "AAAA-MM-JJ" et "HH:MM:SS" grâce à l'espace
                if " " in date_complete:
                    date_seule, heure_seule = date_complete.split(" ", 1)
                else:
                    date_seule = date_complete
                    heure_seule = ""
                
                # On fabrique la nouvelle ligne avec les 2 nouvelles colonnes
                # row[1:] permet de récupérer tout le reste (Statut, Nom, etc.)
                nouvelle_ligne = [date_seule, heure_seule] + list(row[1:])
                
                writer.writerow(nouvelle_ligne)

            csv_content = output.getvalue()
            
            # 3. On envoie au navigateur
            self.send_response(200)
            # utf-8-sig force Excel à lire correctement les accents (é, à, etc.)
            self.send_header('Content-Type', 'text/csv; charset=utf-8-sig')
            self.send_header('Content-Disposition', 'attachment; filename="Historique_FabLab.csv"')
            self.end_headers()
            
            self.wfile.write(csv_content.encode('utf-8-sig'))
    
        except Exception as e:
            print(f"Erreur Export CSV: {e}")
            self.send_response_json({"error": str(e)}, 500)

def export_transactions_csv(self):
        """Génère un export CSV des transactions avec TOUTES les colonnes (Date et Heure séparées)"""
        import io
        import csv
        try:
            user_id = self.params.get('user_id', [None])[0]
            project = self.params.get('project', [None])[0]
            search_user = self.params.get('search_user', [None])[0]
            
            # On récupère les paiements filtrés
            payments = db.get_payments(id_user=user_id, project_name=project, limit=10000, search_user=search_user)
            
            output = io.StringIO()
            writer = csv.writer(output, delimiter=';')
            
            # CORRECTION : On sépare les en-têtes 'Date' et 'Heure'
            writer.writerow([
                'Date', 'Heure', 'Nom Utilisateur', 'Prénom Utilisateur', 'Nom Opération', 
                'N° Opération', 'Moyen de paiement', 'Projet Nom', 'Projet Type', 
                'Tuteur/Resp.', 'Matériau', 'Quantité', 'Type Mouvement', 'Montant (€)', 
                'Description', 'Commentaire'
            ])
            
            for p in payments:
                # CORRECTION : On découpe le champ date de la BDD ("AAAA-MM-JJ HH:MM:SS")
                date_complete = p['date'] if p['date'] else ""
                if " " in date_complete:
                    date_seule, heure_seule = date_complete.split(" ", 1)
                    # On retire les microsecondes si elles existent pour avoir HH:MM:SS
                    if "." in heure_seule:
                        heure_seule = heure_seule.split(".", 1)[0]
                else:
                    date_seule = date_complete
                    heure_seule = ""

                writer.writerow([
                    date_seule,                 # Colonne Date
                    heure_seule,                # Colonne Heure
                    p['user_nom'],
                    p['user_prenom'],
                    p['nom'],
                    p.get('numero_operation', ''),
                    p.get('moyen_paiement', ''),
                    p.get('projet_nom', ''),
                    p.get('projet_type', ''),
                    p.get('projet_tuteur', ''),
                    p.get('materiau', ''),
                    p.get('poids', ''),
                    p['type_mouvement'],
                    f"{p['montant']:.2f}".replace('.', ','), 
                    p.get('description', ''),
                    p.get('commentaire', '')
                ])
                
            csv_content = output.getvalue()
            self.send_response(200)
            # utf-8-sig force Excel à décoder directement les accents (é, è, à...) sans afficher de caractères bizarres
            self.send_header('Content-Type', 'text/csv; charset=utf-8-sig')
            self.send_header('Content-Disposition', 'attachment; filename="Transactions_FabLab.csv"')
            self.end_headers()
            self.wfile.write(csv_content.encode('utf-8-sig'))
            
        except Exception as e:
            print(f"Erreur Export Transactions CSV: {e}")
            self.send_response_json({"error": str(e)}, 500)

# ==========================================
# DÉMARRAGE DU SERVEUR
# ==========================================
if __name__ == "__main__":
    print("=== Serveur FabLab PE-63 ===")
    print("Initialisation de la base de données...")
    db.init_database()
    
    print(f"\n Serveur démarré sur le port {PORT_SERVEUR}")
    print(f"Interface : http://localhost:{PORT_SERVEUR}/")
    print("Ctrl+C pour arrêter le serveur\n")
    
    with socketserver.TCPServer(("", PORT_SERVEUR), RequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nArrêt du serveur...")