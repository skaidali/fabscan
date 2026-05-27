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
            
            elif route == "stats":
                # On cherche si l'URL contient "?period=..." (par défaut, on met "semaine")
                periode_choisie = self.params.get('period', ['semaine'])[0]
                
                # On envoie ce choix à la base de données
                self.send_response_json(db.get_stats(periode_choisie))
            elif route == "machines":
                self.send_response_json({"items": db.list_machines()})
            elif route == "users":
                self.send_users()
            elif route == "entries":
                self.send_entries()
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
            else:
                self.send_response_json({"error": "Route POST inconnue"}, 404)
        else:
            self.send_response_json({"error": "Route POST invalide"}, 404)

    # ==========================================
    # FONCTIONS MÉTIER (LOGIQUE DU FABLAB)
    # ==========================================
    def process_scan(self, data):
        """Traite le scan reçu de l'Arduino"""
        global DERNIER_SCAN
        try:
            user_id = data.get('user_id')
            motif = data.get('motif', 'Non spécifié')
            
            # On mémorise la carte, même si l'utilisateur est inconnu (pour l'inscription)
            DERNIER_SCAN = user_id 
            
            if not user_id:
                self.send_response_json({"success": False, "error": "ID de carte manquant"}, 400)
                return

            # Accept either a full user id or a card id; try to resolve card id to user id
            resolved = db.research_user_by_id_carte(user_id)
            if resolved:
                real_id, nom, prenom = resolved[0], resolved[1], resolved[2]
                db.add_entry(real_id, type_projet=motif)
                self.send_response_json({
                    "success": True,
                    "nom": nom,
                    "prenom": prenom,
                    "message": f"Bienvenue {prenom} {nom} !"
                })
            else:
                # If not found by carte, check if it's a direct user id
                user = db.research_user_by_id(user_id)
                if user:
                    db.add_entry(user_id, type_projet=motif)
                    self.send_response_json({"success": True, "nom": user[0], "prenom": user[1], "message": f"Bienvenue {user[1]} {user[0]} !"})
                else:
                    self.send_response_json({"success": False, "error": "Badge non reconnu. Prêt pour l'inscription."})
                
        except Exception as e:
            print(f"Erreur scan: {e}")
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
            page = int(self.params.get('page', [1])[0])
            rows, total = db.list_users(page=page)
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