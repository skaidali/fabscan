# -*- coding: utf-8 -*-
"""
Fonctions de gestion de la base de données FabLab
PE-63
"""
from pathlib import Path
import sqlite3
import datetime
import csv
import json

ROOT = Path(__file__).resolve().parent.parent
DATABASE_PATH = ROOT / "database" / "database.db"


def get_connection():
    """Créer une connexion à la base de données"""
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def _migrate_legacy_users_table(cursor):
    """Migrer le schéma de la table UTILISATEURS si nécessaire (ajout de colonnes manquantes)"""
    cursor.execute("PRAGMA table_info(UTILISATEURS)")
    existing_cols = {row[1] for row in cursor.fetchall()}

    migrations = [
        ("id_carte",          "TEXT"),
        ("commentaire",       "TEXT"),
        ("formation_3d",      "INTEGER DEFAULT 0"),
        ("formation_laser",   "INTEGER DEFAULT 0"),
        ("formation_brodeuse","INTEGER DEFAULT 0"),
        ("montant",           "REAL DEFAULT 0.0"),
        ("certifications",    "TEXT DEFAULT '[]'"),
        ("date_inscription",  "TEXT DEFAULT CURRENT_TIMESTAMP"),
    ]

    for col_name, col_def in migrations:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE UTILISATEURS ADD COLUMN {col_name} {col_def}")

    # Index unique sur id_carte
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_utilisateurs_id_carte
        ON UTILISATEURS(id_carte) WHERE id_carte IS NOT NULL
    """)

    # Récupération et conversion des anciennes données
    cursor.execute("SELECT id, formation_3d, formation_laser, formation_brodeuse, certifications FROM UTILISATEURS")
    utilisateurs = cursor.fetchall()
    
    for u in utilisateurs:
        uid = u[0]
        f_3d = u[1]
        f_laser = u[2]
        f_brod = u[3]
        certifs_actuelles = u[4]
        
        if not certifs_actuelles or certifs_actuelles == '[]':
            anciennes_certifs = []
            if f_3d: anciennes_certifs.append("Impression 3D")
            if f_laser: anciennes_certifs.append("Découpe Laser")
            if f_brod: anciennes_certifs.append("Brodeuse Numérique")
            
            if anciennes_certifs:
                nouveau_json = json.dumps(anciennes_certifs)
                cursor.execute("UPDATE UTILISATEURS SET certifications = ? WHERE id = ?", (nouveau_json, uid))


def _migrate_paiements_table(cursor):
    """Ajoute la colonne moyen_paiement si elle n'existe pas"""
    cursor.execute("PRAGMA table_info(PAIEMENTS)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    if "moyen_paiement" not in existing_cols:
        cursor.execute("ALTER TABLE PAIEMENTS ADD COLUMN moyen_paiement TEXT")


def init_database():
    """Initialiser la base de données avec les tables nécessaires"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS UTILISATEURS (
            id TEXT PRIMARY KEY,
            id_carte TEXT UNIQUE,
            nom TEXT NOT NULL,
            prenom TEXT NOT NULL,
            email TEXT,
            statut TEXT NOT NULL,
            commentaire TEXT,
            formation_3d INTEGER DEFAULT 0,
            formation_laser INTEGER DEFAULT 0,
            formation_brodeuse INTEGER DEFAULT 0,
            montant REAL DEFAULT 0.0,
            certifications TEXT DEFAULT '[]',
            date_inscription TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ENTREE (
            id_entree INTEGER PRIMARY KEY AUTOINCREMENT,
            id_utilisateur TEXT NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            type_projet TEXT,
            zone_travail TEXT,
            commentaire TEXT,
            FOREIGN KEY (id_utilisateur) REFERENCES UTILISATEURS(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS MACHINES (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS PAIEMENTS (
            id_paiement INTEGER PRIMARY KEY AUTOINCREMENT,
            id_utilisateur TEXT NOT NULL,
            date DATETIME DEFAULT CURRENT_TIMESTAMP,
            nom TEXT,
            description TEXT,
            commentaire TEXT,
            projet_nom TEXT,
            projet_type TEXT,
            projet_tuteur TEXT,
            numero_operation TEXT,
            type_mouvement TEXT,
            montant REAL,
            materiau TEXT,
            poids REAL,
            moyen_paiement TEXT,
            FOREIGN KEY (id_utilisateur) REFERENCES UTILISATEURS(id) ON DELETE CASCADE
        )
    """)
    
    _migrate_legacy_users_table(cursor)
    _migrate_paiements_table(cursor)

    conn.commit()
    conn.close()


def research_user_by_id(id_user):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nom, prenom FROM UTILISATEURS WHERE id = ?", (id_user,))
    result = cursor.fetchone()
    conn.close()
    return result


def research_user_by_id_carte(id_carte):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nom, prenom FROM UTILISATEURS WHERE id_carte = ?", (id_carte,))
    result = cursor.fetchone()
    conn.close()
    return result


def update_user(id_user, nom, prenom, statut, id_moodle=None, certifications_list=None):
    """Mettre à jour le profil et les certifications d'un coup"""
    conn = get_connection()
    cursor = conn.cursor()
    certifs_json = json.dumps(certifications_list if certifications_list is not None else [])

    cursor.execute(
        """
        UPDATE UTILISATEURS
        SET nom = ?, prenom = ?, statut = ?, email = ?, certifications = ?
        WHERE id = ?
        """,
        (nom, prenom, statut, id_moodle, certifs_json, id_user),
    )
    conn.commit()
    conn.close()


def link_id_carte(id_user, id_carte):
    conn = get_connection()
    cursor = conn.cursor()
    valeur_carte = id_carte if id_carte and id_carte.strip() != "" else None
    cursor.execute("UPDATE UTILISATEURS SET id_carte = ? WHERE id = ?", (valeur_carte, id_user))
    conn.commit()
    conn.close()


def add_entry(id_utilisateur, type_projet="", zone_travail="", commentaire=""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO ENTREE (id_utilisateur, type_projet, zone_travail, commentaire) VALUES (?, ?, ?, ?)",
        (id_utilisateur, type_projet, zone_travail, commentaire),
    )
    conn.commit()
    conn.close()


def list_users(search="", statut="", page=1, page_size=50):
    conn = get_connection()
    cursor = conn.cursor()

    where_clauses = []
    params = []
    clean_search = (search or "").strip().lower()
    clean_statut = (statut or "").strip()

    if clean_search:
        where_clauses.append("(LOWER(nom) LIKE ? OR LOWER(prenom) LIKE ? OR LOWER(email) LIKE ?)")
        like_value = f"%{clean_search}%"
        params.extend([like_value, like_value, like_value])

    if clean_statut and clean_statut != "all":
        where_clauses.append("statut = ?")
        params.append(clean_statut)

    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

    cursor.execute(f"SELECT COUNT(*) FROM UTILISATEURS {where_sql}", params)
    total = cursor.fetchone()[0]

    safe_page = max(1, int(page))
    safe_page_size = max(1, min(int(page_size), 200))
    offset = (safe_page - 1) * safe_page_size

    cursor.execute(
        f"""
        SELECT id, email, nom, prenom, statut, montant
        FROM UTILISATEURS
        {where_sql}
        ORDER BY nom, prenom
        LIMIT ? OFFSET ?
        """,
        params + [safe_page_size, offset],
    )
    rows = cursor.fetchall()
    conn.close()
    return rows, total


def get_all_entries(limit=50):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT datetime(e.date, 'localtime'), u.statut, u.nom, u.prenom,
               e.type_projet, e.zone_travail, e.commentaire
        FROM ENTREE e
        JOIN UTILISATEURS u ON e.id_utilisateur = u.id
        ORDER BY e.date DESC LIMIT ?
        """,
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return rows


def get_stats(periode="semaine", statut="all", certif="all", zone="all", motif="all"):
    conn = get_connection()
    cursor = conn.cursor()
    base_join = "FROM ENTREE e JOIN UTILISATEURS u ON e.id_utilisateur = u.id"
    
    user_where = []
    user_params = []
    if statut and statut != "all":
        user_where.append("u.statut = ?")
        user_params.append(statut)
    if certif and certif != "all":
        user_where.append("u.certifications LIKE ?")
        user_params.append(f'%"{certif}"%')
        
    entry_where = []
    entry_params = []
    if zone and zone != "all":
        entry_where.append("e.zone_travail = ?")
        entry_params.append(zone)
    if motif and motif != "all":
        entry_where.append("e.type_projet = ?")
        entry_params.append(motif)

    all_where = user_where + entry_where
    all_params = user_params + entry_params
    statut_filter = f"WHERE {' AND '.join(all_where)}" if all_where else ""
    and_statut_filter = f"AND {' AND '.join(all_where)}" if all_where else ""

    u_where_sql = f"WHERE {' AND '.join(user_where)}" if user_where else ""
    cursor.execute(f"SELECT COUNT(*) FROM UTILISATEURS u {u_where_sql}", user_params)
    total_users = cursor.fetchone()[0]

    cursor.execute(f"SELECT COUNT(*) {base_join} {statut_filter}", all_params)
    total_entries = cursor.fetchone()[0]

    now = datetime.datetime.now()
    today_params = [now.strftime("%Y-%m-%d") + "%"] + all_params
    cursor.execute(f"SELECT COUNT(*) {base_join} WHERE e.date LIKE ? {and_statut_filter}", today_params)
    today_entries = cursor.fetchone()[0]

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
    cursor.execute(f"SELECT COUNT(*) {base_join} WHERE e.date >= ? {and_statut_filter}", period_params)
    period_entries = cursor.fetchone()[0]

    cursor.execute(f"SELECT {group_by} as d, COUNT(*) {base_join} WHERE e.date >= ? {and_statut_filter} GROUP BY d ORDER BY d", period_params)
    chart_data = {row[0]: row[1] for row in cursor.fetchall()}

    cursor.execute(f"SELECT u.statut, COUNT(*) {base_join} WHERE e.date >= ? {and_statut_filter} GROUP BY u.statut ORDER BY COUNT(*) DESC", period_params)
    profiles = [{"name": row[0], "count": row[1]} for row in cursor.fetchall()]

    cursor.execute(f"SELECT datetime(e.date, 'localtime'), u.nom, u.prenom, u.statut, e.zone_travail, e.type_projet {base_join} {statut_filter} ORDER BY e.date DESC LIMIT 20", all_params)
    recent = [{"date": r[0], "nom": f"{r[2]} {r[1]}", "statut": r[3], "zone": r[4], "projet": r[5]} for r in cursor.fetchall()]

    conn.close()
    return {
        "total_users": total_users,
        "total_entries": total_entries,
        "today_entries": today_entries,
        "period_entries": period_entries,
        "chart_data": chart_data,
        "profiles": profiles,
        "recent_entries": recent
    }


def get_user_by_scan_id(scan_id):
    """Retourne toutes les infos d'un utilisateur, incluant les certifications décodées"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, nom, prenom, statut, email, id_carte, montant, certifications
        FROM UTILISATEURS
        WHERE id = ? OR id_carte = ?
    """, (scan_id, scan_id))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        certifs = []
        if row[7]:
            try:
                certifs = json.loads(row[7])
            except Exception:
                certifs = []
        return {
            "id": row[0],
            "nom": row[1],
            "prenom": row[2],
            "statut": row[3],
            "email": row[4],
            "id_carte": row[5] or "",
            "montant": row[6] or 0.0,
            "certifications": certifs
        }
    return None


def delete_user(id_user):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM UTILISATEURS WHERE id = ?", (id_user,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def add_payment(id_utilisateur, nom, description, commentaire, projet_nom, projet_type, projet_tuteur, numero_operation, type_mouvement, montant, materiau=None, poids=None, moyen_paiement=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO PAIEMENTS (id_utilisateur, nom, description, commentaire, projet_nom, projet_type, projet_tuteur, numero_operation, type_mouvement, montant, materiau, poids, moyen_paiement)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (id_utilisateur, nom, description, commentaire, projet_nom, projet_type, projet_tuteur, numero_operation, type_mouvement, montant, materiau, poids, moyen_paiement),
    )
    if type_mouvement == "CREDIT" or moyen_paiement == "Rechargement Solde":
        cursor.execute("UPDATE UTILISATEURS SET montant = montant + ? WHERE id = ?", (montant, id_utilisateur))
    elif type_mouvement == "DEBIT" and moyen_paiement and "Solde" in moyen_paiement:
        cursor.execute("UPDATE UTILISATEURS SET montant = montant - ? WHERE id = ?", (montant, id_utilisateur))
    conn.commit()
    conn.close()


def get_payments(id_user=None, project_name=None, limit=50, search_user=None):
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT p.id_paiement, p.id_utilisateur, p.date, p.nom, p.description, p.commentaire, 
               p.projet_nom, p.projet_type, p.projet_tuteur, p.numero_operation, p.type_mouvement, p.montant, p.materiau, p.poids,
               u.nom, u.prenom, p.moyen_paiement
        FROM PAIEMENTS p
        JOIN UTILISATEURS u ON p.id_utilisateur = u.id
    """
    where_clauses = []
    params = []
    if id_user:
        where_clauses.append("p.id_utilisateur = ?")
        params.append(id_user)
    if project_name:
        where_clauses.append("p.projet_nom LIKE ?")
        params.append(f"%{project_name}%")
    if search_user:
        where_clauses.append("(u.nom LIKE ? OR u.prenom LIKE ?)")
        params.extend([f"%{search_user}%", f"%{search_user}%"])
    if where_clauses:
        query += " WHERE " + " AND ".join(where_clauses)
    query += " ORDER BY p.date DESC LIMIT ?"
    params.append(limit)
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    payments = []
    for r in rows:
        payments.append({
            "id": r[0], "user_id": r[1], "date": r[2], "nom": r[3], "description": r[4], 
            "commentaire": r[5], "projet_nom": r[6], "projet_type": r[7], "projet_tuteur": r[8], 
            "numero_operation": r[9], "type_mouvement": r[10], "montant": r[11], 
            "materiau": r[12], "poids": r[13], "user_nom": r[14], "user_prenom": r[15],
            "moyen_paiement": r[16]
        })
    return payments


def search_projects(query, limit=10):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT projet_nom FROM PAIEMENTS WHERE projet_nom LIKE ? LIMIT ?", (f"%{query}%", limit))
    rows = cursor.fetchall()
    conn.close()
    return [r[0] for r in rows if r[0]]