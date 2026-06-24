# -*- coding: utf-8 -*-
"""
Gestion de la base de données FabLab - Requêtes SQL
"""
from pathlib import Path
import sqlite3
import datetime
import json

ROOT = Path(__file__).resolve().parent.parent
DATABASE_PATH = ROOT / "database" / "database.db"

def get_connection():
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def _migrate_legacy_users_table(cursor):
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

    cursor.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_utilisateurs_id_carte ON UTILISATEURS(id_carte) WHERE id_carte IS NOT NULL")

def _migrate_paiements_table(cursor):
    cursor.execute("PRAGMA table_info(PAIEMENTS)")
    existing_cols = {row[1] for row in cursor.fetchall()}
    if "moyen_paiement" not in existing_cols:
        cursor.execute("ALTER TABLE PAIEMENTS ADD COLUMN moyen_paiement TEXT")

def init_database():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS UTILISATEURS (
            id TEXT PRIMARY KEY, nom TEXT NOT NULL, prenom TEXT NOT NULL, email TEXT, statut TEXT NOT NULL,
            commentaire TEXT, formation_3d INTEGER DEFAULT 0, formation_laser INTEGER DEFAULT 0,
            formation_brodeuse INTEGER DEFAULT 0, montant REAL DEFAULT 0.0, certifications TEXT DEFAULT '[]',
            date_inscription TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ENTREE (
            id_entree INTEGER PRIMARY KEY AUTOINCREMENT, 
            id_utilisateur TEXT, 
            date DATETIME DEFAULT CURRENT_TIMESTAMP, 
            type_projet TEXT, 
            zone_travail TEXT, 
            commentaire TEXT,
            user_nom TEXT,
            user_prenom TEXT,
            user_statut TEXT,
            FOREIGN KEY (id_utilisateur) REFERENCES UTILISATEURS(id) ON DELETE SET NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS PAIEMENTS (
            id_paiement INTEGER PRIMARY KEY AUTOINCREMENT, 
            id_utilisateur TEXT, 
            date DATETIME DEFAULT CURRENT_TIMESTAMP, 
            nom TEXT, description TEXT, commentaire TEXT,
            projet_nom TEXT, projet_type TEXT, projet_tuteur TEXT, numero_operation TEXT,
            type_mouvement TEXT, montant REAL, materiau TEXT, poids REAL, moyen_paiement TEXT,
            user_nom TEXT,
            user_prenom TEXT,
            user_statut TEXT,
            FOREIGN KEY (id_utilisateur) REFERENCES UTILISATEURS(id) ON DELETE SET NULL
        )
    """)
    _migrate_legacy_users_table(cursor)
    _migrate_paiements_table(cursor)
    conn.commit()
    conn.close()

def check_email_exists(email):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, prenom, nom FROM utilisateurs WHERE LOWER(email) = ?", (email.lower(),))
    res = cursor.fetchone()
    conn.close()
    return res

def insert_user(user_id, nom, prenom, statut, email, id_carte, date_inscription=None):
    conn = get_connection()
    cursor = conn.cursor()
    if date_inscription:
        cursor.execute("""
            INSERT INTO utilisateurs (id, nom, prenom, statut, email, id_carte, montant, certifications, date_inscription) 
            VALUES (?, ?, ?, ?, ?, ?, 0.0, '[]', ?)
        """, (user_id, nom, prenom, statut, email, id_carte, date_inscription))
    else:
        cursor.execute("""
            INSERT INTO utilisateurs (id, nom, prenom, statut, email, id_carte, montant, certifications) 
            VALUES (?, ?, ?, ?, ?, ?, 0.0, '[]')
        """, (user_id, nom, prenom, statut, email, id_carte))
    conn.commit()
    conn.close()

def update_user(id_user, nom, prenom, statut, email, certifications_list):
    conn = get_connection()
    cursor = conn.cursor()
    certifs_json = json.dumps(certifications_list if certifications_list is not None else [])
    cursor.execute("""
        UPDATE UTILISATEURS SET nom = ?, prenom = ?, statut = ?, email = ?, certifications = ? WHERE id = ?
    """, (nom, prenom, statut, email, certifs_json, id_user))
    conn.commit()
    conn.close()

def link_id_carte(id_user, id_carte):
    conn = get_connection()
    cursor = conn.cursor()
    valeur_carte = id_carte if id_carte and id_carte.strip() != "" else None
    cursor.execute("UPDATE UTILISATEURS SET id_carte = ? WHERE id = ?", (valeur_carte, id_user))
    conn.commit()
    conn.close()

def research_user_by_id(id_user):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nom, prenom FROM UTILISATEURS WHERE id = ?", (id_user,))
    res = cursor.fetchone()
    conn.close()
    return res

def research_user_by_id_carte(id_carte):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, nom, prenom FROM UTILISATEURS WHERE id_carte = ?", (id_carte,))
    res = cursor.fetchone()
    conn.close()
    return res

def add_entry(id_utilisateur, type_projet="", zone_travail="", commentaire=""):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nom, prenom, statut FROM UTILISATEURS WHERE id = ?", (id_utilisateur,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise ValueError(f"L'utilisateur avec l'ID {id_utilisateur} n'existe pas.")

    u_nom, u_prenom, u_statut = user
    cursor.execute("""
        INSERT INTO ENTREE (id_utilisateur, type_projet, zone_travail, commentaire, user_nom, user_prenom, user_statut) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (id_utilisateur, type_projet, zone_travail, commentaire, u_nom, u_prenom, u_statut))
    conn.commit()
    conn.close()

def list_users(search="", statut="", page=1, page_size=50):
    conn = get_connection()
    cursor = conn.cursor()
    where_clauses, params = [], []
    clean_search = (search or "").strip().lower()
    
    if clean_search:
        where_clauses.append("""
            (LOWER(nom) LIKE ? 
             OR LOWER(prenom) LIKE ? 
             OR LOWER(email) LIKE ? 
             OR LOWER(prenom || ' ' || nom) LIKE ? 
             OR LOWER(nom || ' ' || prenom) LIKE ?)
        """)
        like_val = f"%{clean_search}%"
        params.extend([like_val, like_val, like_val, like_val, like_val])
        
    if statut and statut != "all":
        where_clauses.append("statut = ?")
        params.append(statut)
        
    where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
    cursor.execute(f"SELECT COUNT(*) FROM UTILISATEURS {where_sql}", params)
    total = cursor.fetchone()[0]
    offset = (max(1, int(page)) - 1) * int(page_size)
    cursor.execute(f"SELECT id, email, nom, prenom, statut, montant FROM UTILISATEURS {where_sql} ORDER BY nom, prenom LIMIT ? OFFSET ?", params + [int(page_size), offset])
    rows = cursor.fetchall()
    conn.close()
    return rows, total

def get_all_entries(limit=50):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT datetime(e.date, 'localtime'), e.user_statut, e.user_nom, e.user_prenom, e.type_projet, e.zone_travail, e.commentaire
        FROM ENTREE e ORDER BY e.date DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return rows

def execute_rgpd_maintenance():
    conn = get_connection()
    cursor = conn.cursor()
    
    # Au bout d'un an, on efface l'identité (Nom/Prénom) 
    # MAIS on conserve précieusement le "user_statut" et la "zone_travail" pour les graphiques !
    cursor.execute("""
        UPDATE ENTREE 
        SET id_utilisateur = 'ANONYME', 
            user_nom = 'Anonyme', 
            user_prenom = 'Membre',
            commentaire = 'Données anonymisées (Contrainte RGPD 1 an)'
        WHERE datetime(date) < datetime('now', '-1 year')
    """)
    anonymes = cursor.rowcount
    
    # Purge des profils d'utilisateurs totalement inactifs depuis plus de 5 ans
    cursor.execute("""
        DELETE FROM UTILISATEURS WHERE id NOT IN (
            SELECT DISTINCT id_utilisateur FROM ENTREE WHERE datetime(date) >= datetime('now', '-5 years')
        ) AND datetime(date_inscription) < datetime('now', '-5 years')
    """)
    purges = cursor.rowcount
    
    conn.commit()
    conn.close()
    return anonymes, purges

def get_all_users_light():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT prenom, nom, email FROM utilisateurs")
    rows = cursor.fetchall()
    conn.close()
    return rows

def get_user_by_scan_id(scan_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, nom, prenom, statut, email, id_carte, montant, certifications FROM UTILISATEURS WHERE id = ? OR id_carte = ?", (scan_id, scan_id))
    row = cursor.fetchone()
    conn.close()
    return row

def delete_user(id_user):
    conn = get_connection()
    cursor = conn.cursor()
    
    # ANONYMISATION IMMÉDIATE : Avant de supprimer l'user, on nettoie ses entrées.
    # On efface son nom et son prénom, mais on laisse intact le "user_statut" pour les stats !
    cursor.execute("""
        UPDATE ENTREE 
        SET user_nom = 'Anonyme', 
            user_prenom = 'Membre',
            commentaire = 'Identité retirée suite à la suppression du compte'
        WHERE id_utilisateur = ?
    """, (id_user,))
    
    # Maintenant on peut supprimer l'utilisateur de la table
    cursor.execute("DELETE FROM UTILISATEURS WHERE id = ?", (id_user,))
    deleted = cursor.rowcount > 0
    
    conn.commit()
    conn.close()
    return deleted

def add_payment(id_utilisateur, nom, description, commentaire, projet_nom, projet_type, projet_tuteur, numero_operation, type_mouvement, montant, materiau=None, poids=None, moyen_paiement=None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nom, prenom, statut FROM UTILISATEURS WHERE id = ?", (id_utilisateur,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        raise ValueError(f"Impossible d'imputer un paiement : l'utilisateur {id_utilisateur} est introuvable.")

    u_nom, u_prenom, u_statut = user
    cursor.execute("""
        INSERT INTO PAIEMENTS (id_utilisateur, nom, description, commentaire, projet_nom, projet_type, projet_tuteur, numero_operation, type_mouvement, montant, materiau, poids, moyen_paiement, user_nom, user_prenom, user_statut)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (id_utilisateur, nom, description, commentaire, projet_nom, projet_type, projet_tuteur, numero_operation, type_mouvement, montant, materiau, poids, moyen_paiement, u_nom, u_prenom, u_statut))
    
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
        SELECT p.id_paiement, p.id_utilisateur, datetime(p.date, 'localtime'), p.nom, p.description, p.commentaire, 
               p.projet_nom, p.projet_type, p.projet_tuteur, p.numero_operation, p.type_mouvement, p.montant, p.materiau, p.poids,
               p.user_nom, p.user_prenom, p.moyen_paiement, p.user_statut FROM PAIEMENTS p
    """
    w, params = [], []
    if id_user: w.append("p.id_utilisateur = ?"); params.append(id_user)
    if project_name: w.append("p.projet_nom LIKE ?"); params.append(f"%{project_name}%")
    if search_user: w.append("(p.user_nom LIKE ? OR p.user_prenom LIKE ?)"); params.extend([f"%{search_user}%", f"%{search_user}%"])
    if w: query += " WHERE " + " AND ".join(w)
    query += " ORDER BY p.date DESC LIMIT ?"
    cursor.execute(query, params + [limit])
    rows = cursor.fetchall()
    conn.close()
    return rows

def search_projects(query, limit=10):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT projet_nom FROM PAIEMENTS WHERE projet_nom LIKE ? LIMIT ?", (f"%{query}%", limit))
    rows = cursor.fetchall()
    conn.close()
    return [r[0] for r in rows if r[0]]

def get_stats_db_raw(all_params, user_params, u_where_sql, base_join, statut_filter, and_statut_filter, today_params, period_params, group_by):
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Décompte de la communauté 
    if u_where_sql.startswith("FROM"):
        cursor.execute(f"SELECT COUNT(*) {u_where_sql}", user_params)
    else:
        cursor.execute(f"SELECT COUNT(*) FROM UTILISATEURS u {u_where_sql}", user_params)
    total_users = cursor.fetchone()[0]
   
    # 2. Total historique filtré
    cursor.execute(f"SELECT COUNT(*) {base_join} {statut_filter}", all_params)
    total_entries = cursor.fetchone()[0]
    
    # 3. Entrées aujourd'hui
    cursor.execute(f"SELECT COUNT(*) {base_join} WHERE e.date LIKE ? {and_statut_filter}", today_params)
    today_entries = cursor.fetchone()[0]
    
    # 4. Entrées dans la dernière heure
    cursor.execute(f"SELECT COUNT(*) {base_join} WHERE e.date >= datetime('now', '-1 hour') {and_statut_filter}", all_params)
    hourly_entries = cursor.fetchone()[0]
    
    # 5. Entrées période
    cursor.execute(f"SELECT COUNT(*) {base_join} WHERE e.date >= ? {and_statut_filter}", period_params)
    period_entries = cursor.fetchone()[0]
    
    # 6. Graphique linéaire
    cursor.execute(f"SELECT {group_by} as d, COUNT(*) {base_join} WHERE e.date >= ? {and_statut_filter} GROUP BY d ORDER BY d", period_params)
    chart_data = {row[0]: row[1] for row in cursor.fetchall()}
    
    # 7. Répartition par profils (✨ FIX : On utilise e.user_statut au lieu de u.statut car u n'existe plus ici)
    col_statut = "u.statut" if "UTILISATEURS" in base_join else "e.user_statut"
    cursor.execute(f"SELECT {col_statut}, COUNT(*) {base_join} WHERE e.date >= ? {and_statut_filter} GROUP BY {col_statut} ORDER BY COUNT(*) DESC", period_params)
    profiles = [{"name": row[0] if row[0] else "Inconnu", "count": row[1]} for row in cursor.fetchall()]
    
    # 8. Tableau des entrées récentes (✨ FIX : On va chercher directement les infos gravées en dur)
    if "UTILISATEURS" in base_join:
        sql_recent = f"SELECT datetime(e.date, 'localtime'), u.nom, u.prenom, u.statut, e.zone_travail, e.type_projet {base_join} {statut_filter} ORDER BY e.date DESC LIMIT 20"
    else:
        sql_recent = f"SELECT datetime(e.date, 'localtime'), e.user_nom, e.user_prenom, e.user_statut, e.zone_travail, e.type_projet {base_join} {statut_filter} ORDER BY e.date DESC LIMIT 20"
        
    cursor.execute(sql_recent, all_params)
    recent = [{"date": r[0], "nom": f"{r[2]} {r[1]}" if (r[1] or r[2]) else "Ancien Membre", "statut": r[3] or "Supprimé", "zone": r[4], "projet": r[5]} for r in cursor.fetchall()]
    
    conn.close()
    return total_users, total_entries, today_entries, hourly_entries, period_entries, chart_data, profiles, recent