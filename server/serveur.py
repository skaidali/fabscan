# -*- coding: utf-8 -*-
"""
Serveur FabLab - Gestion des entrées et utilisateurs
PE-63
"""
from pathlib import Path 
import http.server
import socketserver
from urllib.parse import urlparse, parse_qs, unquote
import json
import datetime as dt
import os 

# Import des fonctions SQL
import sql_request as db
import traitementQR as qr

# Configuration du serveur
PORT_SERVEUR = 8050

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    """Classe dérivée pour traiter les requêtes entrantes du serveur"""
    root = Path(__file__).resolve().parent.parent
    static_dir = root/'client'
    
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
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body.encode('utf-8'))

    def do_OPTIONS(self):
        """Répondre aux requêtes CORS preflight"""
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def parse_json_body(self):
        """Parser le corps JSON d'une requête"""
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length <= 0:
            return {}

        post_data = self.rfile.read(content_length)
        if not post_data:
            return {}

        try:
            return json.loads(post_data.decode('utf-8'))
        except Exception:
            self.send_response_json({"error": "Données JSON invalides"}, 400)
            return None

    def get_query_int(self, name, default, minimum=1, maximum=500):
        """Lire un entier de query string avec bornes"""
        try:
            value = int(self.params.get(name, [default])[0])
        except Exception:
            value = default
        return max(minimum, min(value, maximum))

    def do_GET(self):
        """Traiter les requêtes GET"""
        self.init_params()
        
        # Route API stats - statistiques générales
        if len(self.path_info) > 0 and self.path_info[0] == "api" and len(self.path_info) > 1:
            if self.path_info[1] == "health":
                self.send_response_json({"success": True, "status": "ok"})
            elif self.path_info[1] == "stats":
                self.send_stats()
            elif self.path_info[1] == "machines":
                self.send_machines()
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

        data = self.parse_json_body()
        if data is None:
            return
        
        if len(self.path_info) > 0 and self.path_info[0] == "api" and len(self.path_info) > 1:
            if self.path_info[1] == "scan":
                self.process_scan(data)
            elif self.path_info[1] == "add_user":
                self.add_user(data)
            elif self.path_info[1] == "add_entry":
                self.add_entry(data)
            elif self.path_info[1] == "update_user":
                self.update_user(data)
            elif self.path_info[1] == "resend_qr":
                self.resend_qr(data)
            elif self.path_info[1] == "manual_checkin":
                self.manual_checkin(data)
            elif self.path_info[1] == "delete_user":
                self.delete_user(data)
            elif self.path_info[1] == "machines":
                # create or upsert machine
                self.add_machine(data)
            elif self.path_info[1] == "machines_update":
                # update existing machine
                self.update_machine(data)
            else:
                self.send_response_json({"error": "Route POST inconnue"}, 404)
        else:
            self.send_response_json({"error": "Route POST invalide"}, 404)

    def do_DELETE(self):
        """Traiter les requêtes DELETE"""
        self.init_params()

        if len(self.path_info) > 2 and self.path_info[0] == "api":
            if self.path_info[1] == "user":
                self.delete_user({"user_id": self.path_info[2]})
                return
            if self.path_info[1] == "machines":
                # DELETE /api/machines/<id>
                self.delete_machine({"id": self.path_info[2]})
                return

        self.send_response_json({"error": "Route DELETE invalide"}, 404)

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
            search = self.params.get('search', [''])[0]
            statut = self.params.get('statut', ['all'])[0]
            page = self.get_query_int('page', 1, minimum=1, maximum=100000)
            page_size = self.get_query_int('page_size', 50, minimum=1, maximum=200)

            rows, total = db.list_users(search=search, statut=statut, page=page, page_size=page_size)
            
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

            self.send_response_json({
                "items": users,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": max(1, (total + page_size - 1) // page_size)
                }
            })
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

    # --- Machines API ---
    def send_machines(self):
        try:
            machines = db.list_machines()
            self.send_response_json({"items": machines})
        except Exception as e:
            print(f"Erreur machines: {e}")
            self.send_response_json({"error": str(e)}, 500)

    def add_machine(self, data):
        try:
            mid = str(data.get('id') or data.get('machine_id') or '').strip()
            name = data.get('name', '').strip()
            mtype = data.get('type', '').strip()
            slots = data.get('slots', [])
            if not mid or not name:
                self.send_response_json({"success": False, "error": "id et name requis"}, 400)
                return
            # ensure slots is a list
            if isinstance(slots, str):
                try:
                    slots = json.loads(slots)
                except Exception:
                    slots = []
            db.add_machine(mid, name, mtype, slots)
            self.send_response_json({"success": True, "id": mid})
        except Exception as e:
            print(f"Erreur add_machine: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def update_machine(self, data):
        try:
            mid = str(data.get('id') or data.get('machine_id') or '').strip()
            if not mid:
                self.send_response_json({"success": False, "error": "id requis"}, 400)
                return
            name = data.get('name')
            mtype = data.get('type')
            slots = data.get('slots') if 'slots' in data else None
            if isinstance(slots, str):
                try:
                    slots = json.loads(slots)
                except Exception:
                    slots = None
            db.update_machine(mid, name, mtype, slots)
            self.send_response_json({"success": True, "id": mid})
        except Exception as e:
            print(f"Erreur update_machine: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def delete_machine(self, data):
        try:
            mid = str(data.get('id') or data.get('machine_id') or '').strip()
            if not mid:
                self.send_response_json({"success": False, "error": "id requis"}, 400)
                return
            ok = db.delete_machine(mid)
            if ok:
                self.send_response_json({"success": True})
            else:
                self.send_response_json({"success": False, "error": "Machine non trouvée"}, 404)
        except Exception as e:
            print(f"Erreur delete_machine: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def send_user_by_id(self, user_id):
        """Rechercher un utilisateur par son ID"""
        try:
            details = db.get_user_details(user_id)

            if details:
                self.send_response_json(details)
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
            statut = data.get('statut', '')
            
            if not nom or not prenom:
                self.send_response_json({"success": False, "error": "Nom et prénom requis"}, 400)
                return
            
            # Utiliser la fonction SQL
            db.add_user(user_id, nom, prenom, statut, email)
            
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

    def delete_user(self, data):
        """Supprimer un utilisateur et ses dépendances"""
        try:
            user_id = str(data.get('user_id', '')).strip()
            if not user_id:
                self.send_response_json({"success": False, "error": "ID utilisateur manquant"}, 400)
                return

            deleted = db.delete_user(user_id)
            if not deleted:
                self.send_response_json({"success": False, "error": "Utilisateur non trouvé"}, 404)
                return

            self.send_response_json({"success": True, "message": "Utilisateur supprimé"})
        except Exception as e:
            print(f"Erreur delete_user: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def update_user(self, data):
        """Mettre à jour un utilisateur existant"""
        try:
            user_id = data.get('user_id', '').strip()
            nom = data.get('nom', '').strip()
            prenom = data.get('prenom', '').strip()
            statut = data.get('statut', '').strip()
            email = data.get('email')

            if not user_id:
                self.send_response_json({"success": False, "error": "ID utilisateur manquant"}, 400)
                return

            if not nom or not prenom or not statut:
                self.send_response_json({"success": False, "error": "Nom, prénom et statut requis"}, 400)
                return

            user = db.research_user_by_id(user_id)
            if not user:
                self.send_response_json({"success": False, "error": "Utilisateur non trouvé"}, 404)
                return

            if email is not None:
                email = str(email).strip()

            db.update_user(user_id, nom, prenom, statut, email)
            self.send_response_json({
                "success": True,
                "message": f"Utilisateur {prenom} {nom} mis à jour"
            })
        except Exception as e:
            print(f"Erreur update_user: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def resend_qr(self, data):
        """Générer à nouveau le QR code d'un utilisateur"""
        try:
            user_id = data.get('user_id', '').strip()
            if not user_id:
                self.send_response_json({"success": False, "error": "ID utilisateur manquant"}, 400)
                return

            user = db.research_user_by_id(user_id)
            if not user:
                self.send_response_json({"success": False, "error": "Utilisateur non trouvé"}, 404)
                return

            qr_id = qr.createQR(False, user_id)
            self.send_response_json({
                "success": True,
                "id": qr_id,
                "message": f"QR code régénéré pour {user[1]} {user[0]}"
            })
        except Exception as e:
            print(f"Erreur resend_qr: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def manual_checkin(self, data):
        """Créer un pointage manuel pour un utilisateur"""
        try:
            user_id = data.get('user_id', '').strip()
            if not user_id:
                self.send_response_json({"success": False, "error": "ID utilisateur manquant"}, 400)
                return

            user = db.research_user_by_id(user_id)
            if not user:
                self.send_response_json({"success": False, "error": "Utilisateur non trouvé"}, 404)
                return

            db.add_entry(user_id, type_projet='Pointage manuel')
            self.send_response_json({
                "success": True,
                "message": f"Pointage manuel enregistré pour {user[1]} {user[0]}"
            })
        except Exception as e:
            print(f"Erreur manual_checkin: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)


if __name__ == "__main__":
    print("=== Serveur FabLab PE-63 ===")
    print("Initialisation de la base de données...")
    db.init_database()
    db.import_csv_data()
    # db.add_user(dt.datetime.now().strftime('%Y%m%d%H%M%S%f')[:-3], "Admin", "Admin", "Administrateur", "")
    


    print(f"\nServeur démarré sur le port {PORT_SERVEUR}")
    print(f"Accédez à l'interface : http://localhost:{PORT_SERVEUR}/")
    print("Ctrl+C pour arrêter le serveur\n")
    
    with socketserver.TCPServer(("", PORT_SERVEUR), RequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nArrêt du serveur...")
