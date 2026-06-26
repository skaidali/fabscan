# -*- coding: utf-8 -*-
"""
Gestionnaires Métier - Algorithmes et traitements de données
"""
import os
import json
import unicodedata
import difflib
import openpyxl
import qrcode
import io
import csv
from pathlib import Path
from datetime import datetime as dt
from io import BytesIO
from email.parser import BytesParser
import sql_request as db

ROOT = Path(__file__).resolve().parent.parent

def nettoyer_accents(texte):
    return "".join(c for c in unicodedata.normalize('NFD', texte) if unicodedata.category(c) != 'Mn')

def build_email(prenom, nom, statut):
    if not prenom or not nom: return ""
    p_c = nettoyer_accents(prenom).strip().lower().replace(' ', '-')
    n_c = nettoyer_accents(nom).strip().lower().replace(' ', '-')
    if statut in ["1A", "2A", "3A", "Alternant·e", "Master"]:
        return f"{p_c}.{n_c}@etu.ec-lyon.fr"
    return f"{p_c}.{n_c}@ec-lyon.fr"

def add_user_logic(data):
    nom = data.get('nom', '').strip().upper()
    prenom = data.get('prenom', '').strip().title()
    statut = data.get('statut', '')
    email = data.get('email', '').strip()
    id_carte = data.get('id_carte', '').strip() if data.get('id_carte') else None
    
    if not email:
        return {"success": False, "error": "Email requis", "code": 400}
    
    if not nom or not prenom:
        return {"success": False, "error": "Nom et prénom requis", "code": 400}

    # 1. Vérification de l'e-mail
    doublon = db.check_email_exists(email)
    if doublon:
        return {"success": False, "error": f"Un compte existe déjà avec l'adresse {email} (associé à {doublon[1]} {doublon[2]}).", "code": 409}

    # 2. Vérification de la carte RFID
    if id_carte:
        doublon_carte = db.research_user_by_id_carte(id_carte)
        if doublon_carte:
            # doublon_carte[2] = prenom, doublon_carte[1] = nom
            return {"success": False, "error": f"Cette carte RFID est déjà associée à {doublon_carte[2]} {doublon_carte[1]}.", "code": 409}

    user_id = dt.now().strftime('%Y%m%d%H%M%S')
    db.insert_user(user_id, nom, prenom, statut, email, id_carte)
    return {"success": True, "id": user_id, "message": f"Utilisateur {prenom} {nom} ajouté avec succès !"}


def import_users_excel_logic(raw_body, content_type):
    if 'multipart/form-data' not in content_type:
        return {"success": False, "error": "Format multipart/form-data attendu", "code": 400}

    headers_bytes = f"Content-Type: {content_type}\r\n\r\n".encode('utf-8')
    msg = BytesParser().parsebytes(headers_bytes + raw_body)
    file_data = None
    for part in msg.walk():
        if part.get_filename() or part.get_param('name') == 'file':
            file_data = part.get_payload(decode=True)
            break
    
    if not file_data:
        return {"success": False, "error": "Aucun fichier valide trouvé", "code": 400}

    config_path = ROOT / "database" / "config.json"
    liste_statuts_autorises = []
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            liste_statuts_autorises = json.load(f).get('statuts', [])

    wb = openpyxl.load_workbook(BytesIO(file_data), data_only=True)
    total_ajoutes, total_doublons, total_corrompus, index_secours = 0, 0, 0, 0
    utilisateurs_existants = db.get_all_users_light()

    for nom_onglet in wb.sheetnames:
        sheet = wb[nom_onglet]
        for ligne in sheet.iter_rows(min_row=2, values_only=True):
            if not ligne or len(ligne) < 4 or ligne[2] is None or ligne[3] is None: continue
            
            val_nom, val_prenom = str(ligne[2]).strip(), str(ligne[3]).strip()
            if val_nom.replace('.','',1).isdigit() or val_prenom.replace('.','',1).isdigit() or len(val_nom) > 35 or len(val_prenom) > 35:
                total_corrompus += 1
                continue

            statut_excel = str(ligne[1]).strip() if ligne[1] else ""
            statut = statut_excel if statut_excel in liste_statuts_autorises else ("Autre" if "Autre" in liste_statuts_autorises else (liste_statuts_autorises[0] if liste_statuts_autorises else "Inconnu"))
            nom, prenom = val_nom.upper(), val_prenom.title()
            email = build_email(prenom, nom, statut)

            est_un_doublon = False
            for p_ex, n_ex, e_ex in utilisateurs_existants:
                if e_ex.lower() == email.lower() or (p_ex.lower() == prenom.lower() and difflib.SequenceMatcher(None, n_ex.upper(), nom).ratio() > 0.85):
                    est_un_doublon = True
                    break
            
            if est_un_doublon:
                total_doublons += 1
                continue

            id_unique = dt.now().strftime('%Y%m%d%H%M%S') + str(index_secours)
            index_secours += 1
            date_inscription = dt.now().strftime('%Y-%m-%d %H:%M:%S')
            if ligne[0]:
                if isinstance(ligne[0], dt): date_inscription = ligne[0].strftime('%Y-%m-%d %H:%M:%S')
                elif isinstance(ligne[0], str): date_inscription = ligne[0]

            db.insert_user(id_unique, nom, prenom, statut, email, None, date_inscription)
            utilisateurs_existants.append((prenom, nom, email))
            total_ajoutes += 1

    return {"success": True, "message": f"Importation réussie ! {total_ajoutes} profils créés, {total_doublons} doublons filtrés, {total_corrompus} lignes corrompues ignorées."}

def generate_qr_bytes(user_id):
    img = qrcode.make(user_id)
    buffer = BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()

def get_stats_logic(params_getter):
    periode = params_getter('period', ['semaine'])[0]
    statut = params_getter('statut', ['all'])[0]
    certif = params_getter('certif', ['all'])[0]
    zone = params_getter('zone', ['all'])[0]
    motif = params_getter('motif', ['all'])[0]
    type_entree = params_getter('type_entree', ['all'])[0]

    base_join = "FROM ENTREE e"
    u_from_sql = "FROM UTILISATEURS u"
    user_where, user_params, entry_where, entry_params = [], [], [], []
    
    if statut and statut != "all": 
        entry_where.append("e.user_statut = ?")
        entry_params.append(statut)
        
    if certif and certif != "all": 
        # Pour le décompte des entrées globales :
        base_join = "FROM ENTREE e LEFT JOIN UTILISATEURS u ON e.id_utilisateur = u.id, json_each(IFNULL(u.certifications, '[]'))"
        u_from_sql = "FROM UTILISATEURS u, json_each(IFNULL(u.certifications, '[]'))"
        user_where.append("json_each.value = ?")
        user_params.append(certif)
        user_params.append(certif)
    if zone and zone != "all": entry_where.append("e.zone_travail = ?"); entry_params.append(zone)
    if motif and motif != "all": entry_where.append("e.type_projet = ?"); entry_params.append(motif)
    if type_entree and type_entree != "all":
        if type_entree == "manuel": entry_where.append("e.type_projet != 'N/A' AND e.zone_travail != 'N/A'")
        elif type_entree == "auto": entry_where.append("e.type_projet = 'N/A' AND e.zone_travail = 'N/A'")

    
    all_where = user_where + entry_where
    all_params = user_params + entry_params
    statut_filter = f"WHERE {' AND '.join(all_where)}" if all_where else ""
    and_statut_filter = f"AND {' AND '.join(all_where)}" if all_where else ""
    u_where_sql = f"{u_from_sql} WHERE {' AND '.join(user_where)}" if user_where else "FROM UTILISATEURS"

    # Importation native nécessaire à ajouter aux côtés de "from datetime import datetime as dt"
    import datetime

    now = dt.now()
    today_params = [now.strftime("%Y-%m-%d") + "%"] + all_params

    if periode == "jour":
        start_date = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
        group_by = "strftime('%Y-%m-%d %H:00', e.date)" 
    elif periode == "mois":
        start_date = (now - datetime.timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
        group_by = "strftime('%Y-%m-%d', e.date)"
    elif periode == "annee":
        start_date = (now - datetime.timedelta(days=365)).strftime("%Y-%m-%d %H:%M:%S")
        group_by = "strftime('%Y-%m', e.date)"
    else:
        start_date = (now - datetime.timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
        group_by = "strftime('%Y-%m-%d', e.date)"

    period_params = [start_date] + all_params
    t_u, t_e, t_d, h_e, p_e, c_d, profs, rec = db.get_stats_db_raw(all_params, user_params, u_where_sql, base_join, statut_filter, and_statut_filter, today_params, period_params, group_by)
    
    return {
        "total_users": t_u, 
        "total_entries": t_e, 
        "today_entries": t_d, 
        "hourly_entries": h_e,
        "period_entries": p_e, 
        "chart_data": c_d, 
        "profiles": profs, 
        "recent_entries": rec
    }

def export_stats_csv_logic():
    rows = db.get_all_entries(limit=10000)
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';') 

    writer.writerow(['Date', 'Heure', 'Statut', 'Nom', 'Prenom', 'Projet', 'Zone', 'Commentaire', "Type d'Entrée"])
    
    for r in rows:
        dc = str(r[0]) if r[0] else ""
        ds, hs = dc.split(" ", 1) if " " in dc else (dc, "")
        
        # Détection du mode d'accès (r[4] = type_projet, r[5] = zone_travail)
        est_auto = (r[4] == "N/A" and r[5] == "N/A")
        type_entree = "Automatique" if est_auto else "Manuel"
        
        # On écrit la ligne en ajoutant la valeur détectée à la fin
        writer.writerow([ds, hs] + list(r[1:]) + [type_entree])
        
    return output.getvalue().encode('utf-8-sig')

def export_transactions_csv_logic(payments_list):
    # Reçoit directement la liste formatée depuis routes_api
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';')
    writer.writerow(['Date', 'Heure', 'Nom', 'Prénom', 'Nom de l\'Opération', 'N° Opération', 'Moyen de Paiement', 'Nom du Projet', 'Type de Projet', 'Tuteur', 'Matériau', 'Quantité', 'Type de Mouvement', 'Montant', 'Description', 'Commentaire'])
    for p in payments_list:
        dc = p['date'] if p['date'] else ""
        ds, hs = dc.split(" ", 1) if " " in dc else (dc, "")
        if "." in hs: hs = hs.split(".", 1)[0]
        writer.writerow([ds, hs, p['user_nom'], p['user_prenom'], p['nom'], p.get('numero_operation', ''), p.get('moyen_paiement', ''), p.get('projet_nom', ''), p.get('projet_type', ''), p.get('projet_tuteur', ''), p.get('materiau', ''), p.get('poids', ''), p['type_mouvement'], f"{p['montant']:.2f}".replace('.', ','), p.get('description', ''), p.get('commentaire', '')])
    return output.getvalue().encode('utf-8-sig')