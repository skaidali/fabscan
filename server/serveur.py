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
import openpyxl
from io import BytesIO
from email.parser import BytesParser
import sqlite3  # 👈 Centralisé ici
import os
import unicodedata
import qrcode  # 👈 Centralisé ici pour éviter les ré-imports locaux

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
                print(f"Le client s'est déconnecté pendant l'écriture : {e}")
        except Exception as e:
            print(f"send_response_json a échoué: {e}")

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
        
        if len(self.path_info) > 1 and self.path_info[0] == "api":
            route = self.path_info[1]
            
            if route == "get_last_scan":
                global DERNIER_SCAN
                self.send_response_json({"success": True, "id_carte": DERNIER_SCAN})
                DERNIER_SCAN = None  
            elif route == "qr_code":
                user_id = self.params.get('id', [''])[0]
                if user_id:
                    img = qrcode.make(user_id)
                    buffer = BytesIO()
                    img.save(buffer, format="PNG")
                    img_bytes = buffer.getvalue()
                    
                    self.send_response(200)
                    self.send_header('Content-Type', 'image/png')
                    self.send_header('Content-Length', str(len(img_bytes)))
                    self.end_headers()
                    self.wfile.write(img_bytes)
                    return
                else:
                    self.send_response_json({"error": "ID utilisateur manquant pour le QR Code"}, 400)
                    
            elif route == "config":
                config_path = self.root / "database" / "config.json"
                if config_path.exists():
                    with open(config_path, 'r', encoding='utf-8') as f:
                        config_data = json.load(f)
                    self.send_response_json({"success": True, "data": config_data})
                else:
                    self.send_response_json({"success": False, "error": "Fichier config.json introuvable"}, 404)
            
            elif route == "stats":
                periode = self.params.get('period', ['semaine'])[0]
                statut = self.params.get('statut', ['all'])[0]
                certif = self.params.get('certif', ['all'])[0]
                zone = self.params.get('zone', ['all'])[0]
                motif = self.params.get('motif', ['all'])[0]
                self.send_response_json(db.get_stats(periode, statut, certif, zone, motif))

            elif route == "users":
                self.send_users()
            elif route == "entries":
                self.send_entries()
            elif route == "user_info":
                scan_id = self.params.get('id', [''])[0]
                user_data = db.get_user_by_scan_id(scan_id)
                if user_data:
                    self.send_response_json({"success": True, "data": user_data})
                else:
                    self.send_response_json({"success": False, "error": "Badge inconnu"})
                    
            elif route == "search_users":
                query = self.params.get('q', [''])[0]
                rows, _ = db.list_users(search=query, page_size=15)
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
            super().do_GET()

    def do_POST(self):
        self.init_params()
        if len(self.path_info) > 1 and self.path_info[0] == "api":
            route = self.path_info[1]
            
            if route == "import_users_excel":
                self.import_users_excel()
                return
            elif route == "rgpd_maintenance_annuelle":  # 👈 LA ROUTE UNIQUE
                self.rgpd_maintenance_annuelle()
                return

            data = self.parse_json_body()
            if data is None:
                return
            
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
        if len(self.path_info) > 2 and self.path_info[0] == "api" and self.path_info[1] == "user":
            id_utilisateur = self.path_info[2]
            self.delete_user(id_utilisateur)
        else:
            self.send_response_json({"error": "Route DELETE invalide"}, 404)
    
    # ==========================================
    # FONCTIONS MÉTIER (LOGIQUE DU FABLAB)
    # ==========================================
    def process_scan(self, data):
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
        """Ajoute un utilisateur s'il n'existe pas déjà en se basant sur l'unicité de l'e-mail"""
        try:
            nom = data.get('nom', '').strip().upper()
            prenom = data.get('prenom', '').strip().title()
            statut = data.get('statut', '')
            id_carte = data.get('id_carte', '').strip() if data.get('id_carte') else None
            
            if not nom or not prenom:
                self.send_response_json({"success": False, "error": "Nom et prénom requis"}, 400)
                return

            # 1. NETTOYAGE DES ACCENTS POUR L'EMAIL INSTITUTIONNEL
            def nettoyer_accents(texte):
                return "".join(c for c in unicodedata.normalize('NFD', texte) if unicodedata.category(c) != 'Mn')

            p_clean = nettoyer_accents(prenom).lower().replace(' ', '-')
            n_clean = nettoyer_accents(nom).lower().replace(' ', '-')
            
            if statut in ["1A", "2A", "3A", "Alternant·e", "Master"]:
                email = f"{p_clean}.{n_clean}@etu.ec-lyon.fr"
            else:
                email = f"{p_clean}.{n_clean}@ec-lyon.fr"

            db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'database.db'))
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()

            # 🚨 2. VÉRIFICATION DE DOUBLON SUR L'ADRESSE E-MAIL ("CRIER")
            cursor.execute("SELECT id, prenom, nom FROM utilisateurs WHERE LOWER(email) = ?", (email.lower(),))
            doublon = cursor.fetchone()
            if doublon:
                conn.close()
                self.send_response_json({
                    "success": False, 
                    "error": f"Un compte existe déjà avec l'adresse {email} (associé à {doublon[1]} {doublon[2]})."
                }, 409)
                return

            # 3. CRÉATION DU COMPTE
            user_id = dt.now().strftime('%Y%m%d%H%M%S')
            cursor.execute("""
                INSERT INTO utilisateurs (id, nom, prenom, statut, email, id_carte, montant, certifications) 
                VALUES (?, ?, ?, ?, ?, ?, 0.0, '[]')
            """, (user_id, nom, prenom, statut, email, id_carte))
            
            conn.commit()
            conn.close()
            
            self.send_response_json({
                "success": True,
                "id": user_id,
                "message": f"Utilisateur {prenom} {nom} ajouté avec succès !"
            })
        except Exception as e:
            print(f"Erreur add_user: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)
        
    def add_entry(self, data):
        try:
            user_id = data.get('user_id')
            type_projet = data.get('type_projet', 'Non spécifié')
            zone_travail = data.get('zone_travail', 'Non spécifié')
            commentaire = data.get('commentaire', 'Non spécifié')
            
            if not user_id:
                self.send_response_json({"success": False, "error": "ID manquant"}, 400)
                return

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
            search = self.params.get('search', [''])[0]
            statut = self.params.get('statut', ['all'])[0]
            page = int(self.params.get('page', [1])[0])
            page_size = int(self.params.get('page_size', [12])[0])

            rows, total = db.list_users(search=search, statut=statut, page=page, page_size=page_size)
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
        try:
            user_id = data.get('id')
            if not user_id:
                self.send_response_json({"success": False, "error": "ID manquant"}, 400)
                return
            
            db.update_user(user_id, data.get('nom'), data.get('prenom'), data.get('statut'), data.get('email'))
            if 'id_carte' in data:
                db.link_id_carte(user_id, data.get('id_carte'))
            if 'certifications' in data:
                db.update_certifications(user_id, data.get('certifications'))
            
            self.send_response_json({"success": True, "message": "Utilisateur mis à jour !"})
        except Exception as e:
            print(f"Erreur update_user: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)
            
    def add_payment(self, data):
        try:
            user_id = data.get('user_id')
            if not user_id:
                self.send_response_json({"success": False, "error": "ID utilisateur manquant"}, 400)
                return

            db.add_payment(
                id_utilisateur=user_id, nom=data.get('nom'), description=data.get('description'),
                commentaire=data.get('commentaire'), projet_nom=data.get('projet_nom'),
                projet_type=data.get('projet_type'), projet_tuteur=data.get('projet_tuteur'),
                numero_operation=data.get('numero_operation'), type_mouvement=data.get('type_mouvement'),
                montant=data.get('montant'), materiau=data.get('materiau'), poids=data.get('poids'),
                moyen_paiement=data.get('moyen_paiement')
            )
            self.send_response_json({"success": True, "message": "Paiement enregistré !"})
        except Exception as e:
            print(f"Erreur add_payment: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def delete_user(self, user_id):
        """Fonction métier pour supprimer un utilisateur de la base de données"""
        try:
            supprime = db.delete_user(user_id) 
            if supprime:
                # ✨ NETTOYAGE EFFECTUÉ : Plus besoin d'essayer d'effacer un QR PNG sur le disque !
                self.send_response_json({"success": True, "message": "Utilisateur supprimé avec succès."})
            else:
                self.send_response_json({"success": False, "error": "Utilisateur introuvable dans la base."}, 404)
        except Exception as e:
            print(f"Erreur delete_user: {e}")
            self.send_response_json({"success": False, "error": str(e)}, 500)

    def export_stats_csv(self):
        import io
        import csv
        try:
            rows = db.get_all_entries(limit=10000)
            output = io.StringIO()
            writer = csv.writer(output, delimiter=';') 
            writer.writerow(['Date', 'Heure', 'Statut', 'Nom', 'Prenom', 'Type Projet', 'Zone', 'Commentaire'])
            
            for row in rows:
                date_complete = str(row[0]) if row[0] else ""
                if " " in date_complete:
                    date_seule, heure_seule = date_complete.split(" ", 1)
                else:
                    date_seule = date_complete
                    heure_seule = ""
                
                nouvelle_ligne = [date_seule, heure_seule] + list(row[1:])
                writer.writerow(nouvelle_ligne)

            csv_content = output.getvalue()
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8-sig')
            self.send_header('Content-Disposition', 'attachment; filename="Historique_FabLab.csv"')
            self.end_headers()
            self.wfile.write(csv_content.encode('utf-8-sig'))
        except Exception as e:
            print(f"Erreur Export CSV: {e}")
            self.send_response_json({"error": str(e)}, 500)

    def export_transactions_csv(self):
        import io
        import csv
        try:
            user_id = self.params.get('user_id', [None])[0]
            project = self.params.get('project', [None])[0]
            search_user = self.params.get('search_user', [None])[0]
            
            payments = db.get_payments(id_user=user_id, project_name=project, limit=10000, search_user=search_user)
            output = io.StringIO()
            writer = csv.writer(output, delimiter=';')
            
            writer.writerow([
                'Date', 'Heure', 'Nom Utilisateur', 'Prénom Utilisateur', 'Nom Opération', 
                'N° Opération', 'Moyen de paiement', 'Projet Nom', 'Projet Type', 
                'Tuteur/Resp.', 'Matériau', 'Quantité', 'Type Mouvement', 'Montant (€)', 
                'Description', 'Commentaire'
            ])
            
            for p in payments:
                date_complete = p['date'] if p['date'] else ""
                if " " in date_complete:
                    date_seule, heure_seule = date_complete.split(" ", 1)
                    if "." in heure_seule:
                        heure_seule = heure_seule.split(".", 1)[0]
                else:
                    date_seule = date_complete
                    heure_seule = ""

                writer.writerow([
                    date_seule, heure_seule, p['user_nom'], p['user_prenom'], p['nom'],
                    p.get('numero_operation', ''), p.get('moyen_paiement', ''),
                    p.get('projet_nom', ''), p.get('projet_type', ''), p.get('projet_tuteur', ''),
                    p.get('materiau', ''), p.get('poids', ''), p['type_mouvement'],
                    f"{p['montant']:.2f}".replace('.', ','), p.get('description', ''), p.get('commentaire', '')
                ])
                
            csv_content = output.getvalue()
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv; charset=utf-8-sig')
            self.send_header('Content-Disposition', 'attachment; filename="Transactions_FabLab.csv"')
            self.end_headers()
            self.wfile.write(csv_content.encode('utf-8-sig'))
        except Exception as e:
            print(f"Erreur Export Transactions CSV: {e}")
            self.send_response_json({"error": str(e)}, 500)
    
    def rgpd_maintenance_annuelle(self):
        """RGPD : Exécute la maintenance complète (Anonymisation des accès > 1 an + Purge des profils inactifs > 5 ans)"""
        try:
            db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'database.db'))
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Action A : Anonymisation des accès de plus d'un an
            cursor.execute("""
                UPDATE ENTREE 
                SET id_utilisateur = 'ANONYME', commentaire = 'Données anonymisées (Contrainte RGPD 1 an)'
                WHERE datetime(date) < datetime('now', '-1 year')
            """)
            lignes_anonymisees = cursor.rowcount

            # Action B : Suppression des utilisateurs inactifs depuis plus de 5 ans (Basé sur la date d'inscription)
            cursor.execute("""
                DELETE FROM UTILISATEURS 
                WHERE id NOT IN (
                    SELECT DISTINCT id_utilisateur FROM ENTREE 
                    WHERE datetime(date) >= datetime('now', '-5 years')
                ) AND datetime(date_inscription) < datetime('now', '-5 years')
            """)
            profils_supprimes = cursor.rowcount
            
            conn.commit()
            conn.close()
            
            self.send_response_json({
                "success": True,
                "message": f"Maintenance réussie ! {lignes_anonymisees} accès anonymisés et {profils_supprimes} profils obsolètes supprimés."
            })
        except Exception as e:
            print(f"Erreur Maintenance RGPD : {e}")
            try: self.send_response_json({"success": False, "error": str(e)}, 500)
            except Exception: pass


    def import_users_excel(self):
        """Lit un fichier Excel pour alimenter la table utilisateurs avec blindage anti-corruption et anti-doublons flous"""
        import difflib  # Intégré nativement dans Python pour calculer les similitudes de textes
        try:
            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' not in content_type:
                self.send_response_json({"success": False, "error": "Format multipart/form-data attendu"}, 400)
                return
                
            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length)
            
            headers_bytes = f"Content-Type: {content_type}\r\n\r\n".encode('utf-8')
            msg = BytesParser().parsebytes(headers_bytes + raw_body)
            
            file_data = None
            for part in msg.walk():
                if part.get_filename() or part.get_param('name') == 'file':
                    file_data = part.get_payload(decode=True)
                    break
            
            if not file_data:
                self.send_response_json({"success": False, "error": "Aucun fichier valide trouvé"}, 400)
                return
                
            config_path = self.root / "database" / "config.json"
            liste_statuts_autorises = []
            if config_path.exists():
                with open(config_path, 'r', encoding='utf-8') as f:
                    liste_statuts_autorises = json.load(f).get('statuts', [])

            file_bytes = BytesIO(file_data)
            wb = openpyxl.load_workbook(file_bytes, data_only=True)
            
            db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'database', 'database.db'))
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            def nettoyer_accents(texte):
                return "".join(c for c in unicodedata.normalize('NFD', texte) if unicodedata.category(c) != 'Mn')

            def build_email(p, n, s):
                if not p or not n: return ""
                p_c = nettoyer_accents(p).strip().lower().replace(' ', '-')
                n_c = nettoyer_accents(n).strip().lower().replace(' ', '-')
                if s in ["1A", "2A", "3A", "Alternant·e", "Master"]:
                    return f"{p_c}.{n_c}@etu.ec-lyon.fr"
                return f"{p_c}.{n_c}@ec-lyon.fr"

            total_ajoutes = 0
            total_doublons = 0
            total_corrompus = 0
            index_secours = 0

            # ✨ FIX : Initialisation indispensable pour éviter le plantage NameError
            cursor.execute("SELECT prenom, nom, email FROM utilisateurs")
            utilisateurs_existants = cursor.fetchall()

            for nom_onglet in wb.sheetnames:
                sheet = wb[nom_onglet]
                for ligne in sheet.iter_rows(min_row=2, values_only=True):
                    if not ligne or len(ligne) < 4 or ligne[2] is None or ligne[3] is None:
                        continue
                    
                    val_nom = str(ligne[2]).strip()
                    val_prenom = str(ligne[3]).strip()

                    # 🛡️ SÉCURITÉ 1 : Éliminer les numéros bizarres et décalages de lignes Excel
                    if val_nom.replace('.','',1).isdigit() or val_prenom.replace('.','',1).isdigit():
                        total_corrompus += 1
                        continue
                    if len(val_nom) > 35 or len(val_prenom) > 35:
                        total_corrompus += 1
                        continue

                    statut_excel = str(ligne[1]).strip() if ligne[1] else ""
                    if statut_excel in liste_statuts_autorises:
                        statut = statut_excel
                    else:
                        statut = "Autre" if "Autre" in liste_statuts_autorises else (liste_statuts_autorises[0] if liste_statuts_autorises else "Inconnu")

                    nom = val_nom.upper()
                    prenom = val_prenom.title()
                    email = build_email(prenom, nom, statut)

                    # 🛡️ SÉCURITÉ 2 : Détection anti-doublon croisée (Exacte + Floue via difflib)
                    est_un_doublon = False
                    cursor.execute("SELECT id FROM utilisateurs WHERE LOWER(email) = ?", (email.lower(),))
                    if cursor.fetchone():
                        est_un_doublon = True
                    else:
                        # Vérification floue pour intercepter l'effet "Bartholin" vs "Barthollin"
                        for p_existant, n_existant, e_existant in utilisateurs_existants:
                            if p_existant.lower() == prenom.lower():
                                similitude = difflib.SequenceMatcher(None, n_existant.upper(), nom).ratio()
                                if similitude > 0.85:
                                    est_un_doublon = True
                                    break
                    
                    if est_un_doublon:
                        total_doublons += 1
                        continue

                    # Si la ligne passe tous les contrôles, on génère l'utilisateur
                    id_unique = dt.now().strftime('%Y%m%d%H%M%S') + str(index_secours)
                    index_secours += 1
                    
                    # ✨ FIX : Utilisation correcte de l'instance de type 'dt'
                    date_inscription = dt.now().strftime('%Y-%m-%d %H:%M:%S')
                    valeur_date = ligne[0]
                    
                    if valeur_date:
                        if isinstance(valeur_date, dt):
                            date_inscription = valeur_date.strftime('%Y-%m-%d %H:%M:%S')
                        elif isinstance(valeur_date, str):
                            date_inscription = valeur_date

                    cursor.execute("""
                        INSERT INTO utilisateurs (id, nom, prenom, statut, email, id_carte, montant, certifications, date_inscription) 
                        VALUES (?, ?, ?, ?, ?, NULL, 0.0, '[]', ?)
                    """, (id_unique, nom, prenom, statut, email, date_inscription))
                    
                    utilisateurs_existants.append((prenom, nom, email))
                    total_ajoutes += 1
                        
            conn.commit()
            conn.close()
            
            self.send_response_json({
                "success": True,
                "message": f"Importation réussie ! {total_ajoutes} profils créés, {total_doublons} doublons filtrés, {total_corrompus} lignes corrompues ignorées."
            })
            
        except Exception as e:
            print(f"Erreur d'importation Excel : {e}")
            try:
                self.send_response_json({"success": False, "error": str(e)}, 500)
            except Exception:
                pass

            
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