# -*- coding: utf-8 -*-
"""
Serveur FabLab - Gestion des entrées et utilisateurs
PE-63
"""

import http.server
import socketserver
from urllib.parse import urlparse, parse_qs, unquote
import json
import datetime as dt

# Import des fonctions SQL
import sql_request as db

# Configuration du serveur
PORT_SERVEUR = 8080

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    """Classe dérivée pour traiter les requêtes entrantes du serveur"""

    static_dir = 'client'
    
    def __init__(self, *args, **kwargs):
        """Surcharge du constructeur pour imposer 'client' comme sous répertoire racine"""
        super().__init__(*args, directory=self.static_dir, **kwargs)
    
    def init_params(self):
        """Initialiser les paramètres de la requête"""
        parsed_url = urlparse(self.path)
        self.path_info = parsed_url.path.strip('/').split('/')
        self.params = parse_qs(parsed_url.query)

    def send_response_json(self, data, status=200):
        """Envoyer une réponse JSON"""
        body = json.dumps(data, ensure_ascii=False)
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body.encode('utf-8'))))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body.encode('utf-8'))

    def do_GET(self):
        """Traiter les requêtes GET"""
        self.init_params()
        
        # Route API stats - statistiques générales
        if len(self.path_info) > 0 and self.path_info[0] == "api" and len(self.path_info) > 1:
            if self.path_info[1] == "stats":
                self.send_stats()
            elif self.path_info[1] == "users":
                self.send_users()
            elif self.path_info[1] == "entries":
                self.send_entries()
            elif self.path_info[1] == "user" and len(self.path_info) > 2:
                self.send_user_by_id(self.path_info[2])
            else:
                self.send_response_json({"error": "Route API inconnue"}, 404)
        else:
            # Comportement par défaut (fichiers statiques)
            super().do_GET()

    def do_POST(self):
        """Traiter les requêtes POST"""
        self.init_params()
        
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode('utf-8'))
        except:
            self.send_response_json({"error": "Données JSON invalides"}, 400)
            return
        
        if len(self.path_info) > 0 and self.path_info[0] == "api" and len(self.path_info) > 1:
            if self.path_info[1] == "scan":
                self.process_scan(data)
            elif self.path_info[1] == "add_user":
                self.add_user(data)
            elif self.path_info[1] == "add_entry":
                self.add_entry(data)
            else:
                self.send_response_json({"error": "Route POST inconnue"}, 404)
        else:
            self.send_response_json({"error": "Route POST invalide"}, 404)

    def send_stats(self):
        """Envoyer les statistiques générales"""
        try:
            data = db.get_stats()
            self.send_response_json(data)
        except Exception as e:
            print(f"Erreur stats: {e}")
            self.send_response_json({"error": str(e)}, 500)

    def send_users(self):
        """Envoyer la liste des utilisateurs"""
        try:
            rows = db.get_all_users()
            
            users = []
            for row in rows:
                users.append({
                    "id": row[0],
                    "id_moodle": row[1],
                    "nom": row[2],
                    "prenom": row[3],
                    "statut": row[4],
                    "formation_3d": bool(row[5]),
                    "formation_laser": bool(row[6]),
                    "formation_brodeuse": bool(row[7]),
                    "montant": row[8]
                })
            
            self.send_response_json(users)
        except Exception as e:
            print(f"Erreur users: {e}")
            self.send_response_json({"error": str(e)}, 500)

    def send_entries(self):
        """Envoyer la liste des dernières entrées"""
        try:
            limit = int(self.params.get('limit', [50])[0])
            rows = db.get_all_entries(limit)
            
            entries = []
            for row in rows:
                entries.append({
                    "date": row[0],
                    "statut": row[1],
                    "nom": row[2],
                    "prenom": row[3],
                    "type_projet": row[4],
                    "zone": row[5],
                    "commentaire": row[6]
                })
            
            self.send_response_json(entries)
        except Exception as e:
            print(f"Erreur entries: {e}")
            self.send_response_json({"error": str(e)}, 500)

    def send_user_by_id(self, user_id):
        """Rechercher un utilisateur par son ID"""
        try:
            row = db.research_user_by_id(user_id)
            
            if row:
                # Obtenir toutes les infos
                status = db.check_status(user_id)
                formations = db.check_formations(user_id)
                
                user = {
                    "id": user_id,
                    "nom": row[0],
                    "prenom": row[1],
                    "statut": status[2] if status else "",
                    "formation_3d": bool(formations[0]) if formations else False,
                    "formation_laser": bool(formations[1]) if formations else False,
                    "formation_brodeuse": bool(formations[2]) if formations else False
                }
                self.send_response_json(user)
            else:
                self.send_response_json({"error": "Utilisateur non trouvé"}, 404)
        except Exception as e:
            print(f"Erreur user by id: {e}")
            self.send_response_json({"error": str(e)}, 500)

    def process_scan(self, data):
        """Traiter un scan de QR code"""
        try:
            user_id = data.get('user_id')
            motif = data.get('motif', 'Non spécifié')
            
            if not user_id:
                self.send_response_json({"success": False, "error": "ID utilisateur manquant"}, 400)
                return
            
            # Vérifier si l'utilisateur existe
            user = db.research_user_by_id(user_id)
            
            if not user:
                self.send_response_json({"success": False, "error": "Utilisateur non trouvé"}, 404)
                return
            
            # Enregistrer l'entrée
            db.add_entry(user_id, type_projet=motif)
            
            self.send_response_json({
                "success": True,
                "nom": user[0],
                "prenom": user[1],
                "message": f"Bienvenue {user[1]} {user[0]} !"
            })
        except Exception as e:
            print(f"Erreur scan: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def add_user(self, data):
        """Ajouter un nouvel utilisateur"""
        try:
            # Générer un ID unique basé sur timestamp
            user_id = dt.datetime.now().strftime('%Y%m%d%H%M%S%f')[:-3]
            
            nom = data.get('nom', '')
            prenom = data.get('prenom', '')
            email = data.get('email', '')
            statut = data.get('statut', 'Etudiant')
            
            if not nom or not prenom:
                self.send_response_json({"success": False, "error": "Nom et prénom requis"}, 400)
                return
            
            # Utiliser la fonction SQL
            db.add_user(user_id, nom, prenom, statut)
            
            self.send_response_json({
                "success": True,
                "id": user_id,
                "message": f"Utilisateur {prenom} {nom} ajouté avec succès"
            })
        except Exception as e:
            print(f"Erreur add_user: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def add_entry(self, data):
        """Ajouter une entrée manuellement"""
        try:
            user_id = data.get('user_id')
            type_projet = data.get('type_projet', '')
            zone = data.get('zone', '')
            commentaire = data.get('commentaire', '')
            
            if not user_id:
                self.send_response_json({"success": False, "error": "ID utilisateur manquant"}, 400)
                return
            
            # Utiliser la fonction SQL
            db.add_entry(user_id, type_projet, zone, commentaire)
            
            self.send_response_json({"success": True, "message": "Entrée enregistrée"})
        except Exception as e:
            print(f"Erreur add_entry: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)


if __name__ == "__main__":
    print("=== Serveur FabLab PE-63 ===")
    print("Initialisation de la base de données...")
    db.init_database()
    db.import_csv_data()
    
    print(f"\nServeur démarré sur le port {PORT_SERVEUR}")
    print(f"Accédez à l'interface : http://localhost:{PORT_SERVEUR}/")
    print("Ctrl+C pour arrêter le serveur\n")
    
    with socketserver.TCPServer(("", PORT_SERVEUR), RequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nArrêt du serveur...")
