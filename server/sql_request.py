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
    ]

    for col_name, col_def in migrations:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE UTILISATEURS ADD COLUMN {col_name} {col_def}")

    # Index unique sur id_carte
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_utilisateurs_id_carte
        ON UTILISATEURS(id_carte) WHERE id_carte IS NOT NULL
    """)

    # =========================================================
    # SAUVETAGE DES ANCIENNES DONNÉES (Migration vers JSON)
    # =========================================================
    import json
    # On récupère tous les utilisateurs avec leurs anciennes colonnes
    cursor.execute("SELECT id, formation_3d, formation_laser, formation_brodeuse, certifications FROM UTILISATEURS")
    utilisateurs = cursor.fetchall()
    
    for u in utilisateurs:
        uid = u[0]
        f_3d = u[1]
        f_laser = u[2]
        f_brod = u[3]
        certifs_actuelles = u[4]
        
        # Si le nouveau tiroir "certifications" est vide ou vierge ('[]')
        if not certifs_actuelles or certifs_actuelles == '[]':
            anciennes_certifs = []
            
            # On recrée la liste en lisant les anciennes cases
            if f_3d: anciennes_certifs.append("Impression 3D")
            if f_laser: anciennes_certifs.append("Découpe Laser")
            if f_brod: anciennes_certifs.append("Brodeuse Numérique")
            
            # Si on a trouvé des anciennes certifs, on les injecte dans le nouveau tiroir !
            if anciennes_certifs:
                nouveau_json = json.dumps(anciennes_certifs)
                cursor.execute("UPDATE UTILISATEURS SET certifications = ? WHERE id = ?", (nouveau_json, uid))


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
            montant REAL DEFAULT 0.0
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
            type_mouvement TEXT, -- 'CREDIT' ou 'DEBIT'
            montant REAL,
            materiau TEXT,
            poids REAL,
            FOREIGN KEY (id_utilisateur) REFERENCES UTILISATEURS(id) ON DELETE CASCADE
        )
    """)
    
    # Migration des utilisateurs (pour les certifications dynamiques)
    _migrate_legacy_users_table(cursor)

    conn.commit()
    conn.close()


def _normalize_user_row(row):
    return {
        "id": row[0],
        "id_moodle": row[1],
        "nom": row[2],
        "prenom": row[3],
        "statut": row[4],
        "formation_3d": bool(row[5]),
        "formation_laser": bool(row[6]),
        "formation_brodeuse": bool(row[7]),
        "montant": row[8],
    }


def research_user_by_id(id_user):
    """Rechercher un utilisateur par son ID"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nom, prenom FROM UTILISATEURS WHERE id = ?", (id_user,))
    result = cursor.fetchone()
    conn.close()
    return result


def research_user_by_id_qr(id_qr):
    """Alias compatibilité recherche par ID QR"""
    return research_user_by_id(id_qr)


def research_user_by_id_carte(id_carte):
    """Rechercher un utilisateur par son ID carte"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nom, prenom FROM UTILISATEURS WHERE id_carte = ?", (id_carte,))
    result = cursor.fetchone()
    conn.close()
    return result

def add_user(id_user, nom, prenom, statut, id_moodle="", commentaire=""):
    """Ajouter un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO UTILISATEURS (id, nom, prenom, statut, email, commentaire)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (id_user, nom, prenom, statut, id_moodle or None, commentaire or None),
    )
    conn.commit()
    conn.close()


def update_user(id_user, nom, prenom, statut, id_moodle=None):
    """Mettre à jour les informations principales d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()

    if id_moodle is None:
        cursor.execute(
            """
            UPDATE UTILISATEURS
            SET nom = ?, prenom = ?, statut = ?
            WHERE id = ?
            """,
            (nom, prenom, statut, id_user),
        )
    else:
        cursor.execute(
            """
            UPDATE UTILISATEURS
            SET nom = ?, prenom = ?, statut = ?, email = ?
            WHERE id = ?
            """,
            (nom, prenom, statut, id_moodle, id_user),
        )

    conn.commit()
    conn.close()


def link_id_carte(id_user, id_carte):
    """Associer une carte RFID à un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Si id_carte est vide, on le transforme en None (NULL en SQL)
    valeur_carte = id_carte if id_carte and id_carte.strip() != "" else None
    
    cursor.execute("UPDATE UTILISATEURS SET id_carte = ? WHERE id = ?", (valeur_carte, id_user))
    conn.commit()
    conn.close()


def add_entry(id_utilisateur, type_projet="", zone_travail="", commentaire=""):
    """Ajouter une entrée"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO ENTREE (id_utilisateur, type_projet, zone_travail, commentaire)
        VALUES (?, ?, ?, ?)
        """,
        (id_utilisateur, type_projet, zone_travail, commentaire),
    )
    conn.commit()
    conn.close()


def get_all_users():
    """Récupérer tous les utilisateurs"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, email, nom, prenom, statut,
               formation_3d, formation_laser, formation_brodeuse, montant
        FROM UTILISATEURS
        ORDER BY nom, prenom
        """
    )
    rows = cursor.fetchall()
    conn.close()
    return rows


def list_machines():
    """Retourner la liste des machines (id,name,type,slots_json)"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, type, slots FROM MACHINES ORDER BY name")
    rows = cursor.fetchall()
    conn.close()
    machines = []
    for r in rows:
        machines.append({
            "id": r[0],
            "name": r[1],
            "type": r[2],
            "slots": [] if r[3] is None else json.loads(r[3])
        })
    return machines


def add_machine(id_machine, name, type_machine, slots_list):
    """Ajouter une machine avec une liste de slots (list)"""
    conn = get_connection()
    cursor = conn.cursor()
    slots_json = json.dumps(slots_list or [])
    cursor.execute("INSERT OR REPLACE INTO MACHINES (id, name, type, slots) VALUES (?, ?, ?, ?)",
                   (id_machine, name, type_machine, slots_json))
    conn.commit()
    conn.close()


def update_machine(id_machine, name=None, type_machine=None, slots_list=None):
    """Mettre à jour une machine existante"""
    conn = get_connection()
    cursor = conn.cursor()
    # build update dynamically
    parts = []
    params = []
    if name is not None:
        parts.append('name = ?')
        params.append(name)
    if type_machine is not None:
        parts.append('type = ?')
        params.append(type_machine)
    if slots_list is not None:
        parts.append('slots = ?')
        params.append(json.dumps(slots_list))
    if not parts:
        conn.close(); return
    params.append(id_machine)
    sql = f"UPDATE MACHINES SET {', '.join(parts)} WHERE id = ?"
    cursor.execute(sql, params)
    conn.commit()
    conn.close()


def delete_machine(id_machine):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM MACHINES WHERE id = ?", (id_machine,))
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed


def list_users(search="", statut="", page=1, page_size=50):
    """Lister les utilisateurs avec recherche, filtre statut et pagination"""
    conn = get_connection()
    cursor = conn.cursor()

    where_clauses = []
    params = []

    clean_search = (search or "").strip().lower()
    
    # On garde le statut exact (sans le passer en minuscules) pour faire une recherche précise
    clean_statut = (statut or "").strip()

    if clean_search:
        where_clauses.append("(LOWER(nom) LIKE ? OR LOWER(prenom) LIKE ? OR LOWER(email) LIKE ?)")
        like_value = f"%{clean_search}%"
        params.extend([like_value, like_value, like_value])

    # NOUVELLE LOGIQUE DE FILTRE : Correspondance exacte
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
        SELECT id, email, nom, prenom, statut,
               formation_3d, formation_laser, formation_brodeuse, montant
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
    """Récupérer les dernières entrées"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT datetime(e.date, 'localtime'), u.statut, u.nom, u.prenom,
               e.type_projet, e.zone_travail, e.commentaire
        FROM ENTREE e
        JOIN UTILISATEURS u ON e.id_utilisateur = u.id
        ORDER BY e.date DESC
        LIMIT ?
        """,
        (limit,),
    )
    rows = cursor.fetchall()
    conn.close()
    return rows


def get_stats(periode="semaine", statut="all", certif="all", zone="all", motif="all"):
    """Récupère les statistiques filtrées dynamiquement par profil, visite et période"""
    import datetime
    conn = get_connection()
    cursor = conn.cursor()

    base_join = "FROM ENTREE e JOIN UTILISATEURS u ON e.id_utilisateur = u.id"
    
    # 1. Construction dynamique des requêtes SQL selon les filtres choisis
    user_where = []
    user_params = []
    if statut and statut != "all":
        user_where.append("u.statut = ?")
        user_params.append(statut)
    if certif and certif != "all":
        # Le JSON ressemble à '["Impression 3D", "Laser"]', on cherche donc la chaîne exacte
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

    # Fusion des filtres
    all_where = user_where + entry_where
    all_params = user_params + entry_params

    # Création des clauses WHERE intelligentes
    statut_filter = f"WHERE {' AND '.join(all_where)}" if all_where else ""
    and_statut_filter = f"AND {' AND '.join(all_where)}" if all_where else ""

    # ==================================
    # REQUÊTES
    # ==================================
    
    # Total Utilisateurs (on n'applique que les filtres "Utilisateur" ici)
    u_where_sql = f"WHERE {' AND '.join(user_where)}" if user_where else ""
    cursor.execute(f"SELECT COUNT(*) FROM UTILISATEURS u {u_where_sql}", user_params)
    total_users = cursor.fetchone()[0]

    # Total Entrées (Tout confondu)
    cursor.execute(f"SELECT COUNT(*) {base_join} {statut_filter}", all_params)
    total_entries = cursor.fetchone()[0]

    now = datetime.datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    
    # Entrées du jour
    today_params = [today_str + "%"] + all_params
    cursor.execute(f"SELECT COUNT(*) {base_join} WHERE e.date LIKE ? {and_statut_filter}", today_params)
    today_entries = cursor.fetchone()[0]

    # Logique temporelle pour les graphiques
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

    # Entrées sur la période dynamique
    period_params = [start_date] + all_params
    cursor.execute(f"SELECT COUNT(*) {base_join} WHERE e.date >= ? {and_statut_filter}", period_params)
    period_entries = cursor.fetchone()[0]

    # Données pour le Graphique en barres
    cursor.execute(f"""
        SELECT {group_by} as d, COUNT(*)
        {base_join}
        WHERE e.date >= ? {and_statut_filter}
        GROUP BY d ORDER BY d
    """, period_params)
    chart_data = {row[0]: row[1] for row in cursor.fetchall()}

    # Répartition par PROFIL (1A, 2A...)
    cursor.execute(f"""
        SELECT u.statut, COUNT(*)
        {base_join}
        WHERE e.date >= ? {and_statut_filter}
        GROUP BY u.statut
        ORDER BY COUNT(*) DESC
    """, period_params)
    profiles = [{"name": row[0], "count": row[1]} for row in cursor.fetchall()]

    # Dernières entrées détaillées (Filtres appliqués !)
    cursor.execute(f"""
        SELECT datetime(e.date, 'localtime'), u.nom, u.prenom, u.statut, e.zone_travail, e.type_projet
        {base_join}
        {statut_filter}
        ORDER BY e.date DESC
        LIMIT 20
    """, all_params)
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


def check_status(id_user):
    """Vérifier le statut d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT nom, prenom, statut FROM UTILISATEURS WHERE id = ?", (id_user,))
    result = cursor.fetchone()
    conn.close()
    return result


def check_formations(id_user):
    """Vérifier les formations d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT formation_3d, formation_laser, formation_brodeuse FROM UTILISATEURS WHERE id = ?",
        (id_user,),
    )
    result = cursor.fetchone()
    conn.close()
    return result


def add_formation(id_user, f3d=False, flaser=False, fbrodeuse=False):
    """Ajouter ou modifier les formations d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        UPDATE UTILISATEURS
        SET formation_3d = ?, formation_laser = ?, formation_brodeuse = ?
        WHERE id = ?
        """,
        (int(f3d), int(flaser), int(fbrodeuse), id_user),
    )
    conn.commit()
    conn.close()


def get_user_details(id_user):
    """Récupérer un profil utilisateur enrichi"""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, email, nom, prenom, statut,
               formation_3d, formation_laser, formation_brodeuse, montant
        FROM UTILISATEURS
        WHERE id = ?
        """,
        (id_user,),
    )
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    cursor.execute(
        """
        SELECT date, type_projet, zone_travail, commentaire
        FROM ENTREE
        WHERE id_utilisateur = ?
        ORDER BY date DESC
        LIMIT 20
        """,
        (id_user,),
    )
    entries = cursor.fetchall()
    conn.close()

    user = _normalize_user_row(row)
    user["entries"] = [
        {"date": e[0], "type_projet": e[1], "zone": e[2], "commentaire": e[3]}
        for e in entries
    ]
    user["comments"] = [
        {"commentaire": e[3], "zone": e[2], "date": e[0]}
        for e in entries
        if e[3]
    ]
    return user


def delete_user(id_user):
    """Supprimer un utilisateur et ses entrées"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM UTILISATEURS WHERE id = ?", (id_user,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


def check_entries_by_user(id_user):
    """Vérifier les entrées d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT u.nom, u.prenom, e.date
        FROM UTILISATEURS u
        JOIN ENTREE e ON u.id = e.id_utilisateur
        WHERE u.id = ?
        ORDER BY e.date DESC
        """,
        (id_user,),
    )
    rows = cursor.fetchall()
    conn.close()
    return rows


def add_comment(id_user, commentaire, zone=""):
    """Ajouter un commentaire via une entrée dédiée"""
    add_entry(id_user, type_projet="Commentaire", zone_travail=zone, commentaire=commentaire)


def check_comments(id_user):
    """Récupérer les commentaires associés aux entrées"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT commentaire, zone_travail, date
        FROM ENTREE
        WHERE id_utilisateur = ? AND commentaire IS NOT NULL AND commentaire != ''
        ORDER BY date DESC
        """,
        (id_user,),
    )
    rows = cursor.fetchall()
    conn.close()
    return rows


def import_csv_data():
    """Importer des données CSV si des fichiers de test existent"""
    users_file = ROOT / "test_data" / "users.csv"
    entries_file = ROOT / "test_data" / "entrees.csv"

    conn = get_connection()
    cursor = conn.cursor()

    if users_file.exists():
        try:
            with users_file.open("r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute(
                        """
                        INSERT OR IGNORE INTO UTILISATEURS
                        (id, nom, prenom, statut, email)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (
                            row.get("ID", ""),
                            row.get("NOM", ""),
                            row.get("PRENOM", ""),
                            row.get("STATUT", "Etudiant"),
                            row.get("ID_MOODLE", ""),
                        ),
                    )
            print(f"Utilisateurs importés depuis {users_file}")
        except Exception as exc:
            print(f"Erreur import users: {exc}")

    if entries_file.exists():
        try:
            with entries_file.open("r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute(
                        """
                        INSERT INTO ENTREE (id_utilisateur, date, type_projet, zone_travail, commentaire)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (
                            row.get("ID_UTILISATEUR", ""),
                            row.get("DATE", datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
                            row.get("TYPE_PROJET", ""),
                            row.get("ZONE_TRAVAIL", ""),
                            row.get("COMMENTAIRE", ""),
                        ),
                    )
            print(f"Entrées importées depuis {entries_file}")
        except Exception as exc:
            print(f"Erreur import entries: {exc}")

    conn.commit()
    conn.close()


def to_excel():
    """Placeholder export Excel"""
    pass

def update_certifications(id_user, certifications_list):
    """Met à jour la liste des certifications d'un utilisateur"""
    import json
    conn = get_connection()
    cursor = conn.cursor()
    # Transforme la liste Python en texte JSON
    certifs_json = json.dumps(certifications_list)
    cursor.execute("UPDATE UTILISATEURS SET certifications = ? WHERE id = ?", (certifs_json, id_user))
    conn.commit()
    conn.close()

def get_user_by_scan_id(scan_id):
    """Trouve un utilisateur et renvoie ses infos avec ses certifications dynamiques"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # On ajoute "certifications" au SELECT
    cursor.execute("""
        SELECT id, nom, prenom, statut, email, id_carte, certifications
        FROM UTILISATEURS
        WHERE id = ? OR id_carte = ?
    """, (scan_id, scan_id))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        import json
        # Si la colonne est vide, on renvoie une liste vide []
        certifs = json.loads(row[6]) if row[6] else []
        
        return {
            "id": row[0],
            "nom": row[1],
            "prenom": row[2],
            "statut": row[3],
            "email": row[4],
            "has_rfid": bool(row[5]),
            "id_carte": row[5] or "",
            "certifications": certifs
        }
    return None

def add_payment(id_utilisateur, nom, description, commentaire, projet_nom, projet_type, projet_tuteur, numero_operation, type_mouvement, montant, materiau=None, poids=None):
    """Ajouter un paiement"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO PAIEMENTS (id_utilisateur, nom, description, commentaire, projet_nom, projet_type, projet_tuteur, numero_operation, type_mouvement, montant, materiau, poids)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (id_utilisateur, nom, description, commentaire, projet_nom, projet_type, projet_tuteur, numero_operation, type_mouvement, montant, materiau, poids),
    )
    conn.commit()
    conn.close()

def get_payments(id_user=None, project_name=None, limit=100):
    """Récupérer les paiements avec filtres optionnels"""
    conn = get_connection()
    cursor = conn.cursor()
    
    query = """
        SELECT p.id_paiement, p.id_utilisateur, p.date, p.nom, p.description, p.commentaire, 
               p.projet_nom, p.projet_type, p.projet_tuteur, p.numero_operation, p.type_mouvement, p.montant, p.materiau, p.poids,
               u.nom, u.prenom
        FROM PAIEMENTS p
        JOIN UTILISATEURS u ON p.id_utilisateur = u.id
    """
    params = []
    where_clauses = []
    
    if id_user:
        where_clauses.append("p.id_utilisateur = ?")
        params.append(id_user)
    
    if project_name:
        where_clauses.append("p.projet_nom LIKE ?")
        params.append(f"%{project_name}%")
        
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
            "id": r[0],
            "user_id": r[1],
            "date": r[2],
            "nom": r[3],
            "description": r[4],
            "commentaire": r[5],
            "projet_nom": r[6],
            "projet_type": r[7],
            "projet_tuteur": r[8],
            "numero_operation": r[9],
            "type_mouvement": r[10],
            "montant": r[11],
            "materiau": r[12],
            "poids": r[13],
            "user_nom": r[14],
            "user_prenom": r[15]
        })
    return payments

def search_projects(query, limit=10):
    """Rechercher des noms de projets existants"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT DISTINCT projet_nom FROM PAIEMENTS WHERE projet_nom LIKE ? LIMIT ?",
        (f"%{query}%", limit)
    )
    rows = cursor.fetchall()
    conn.close()
    return [r[0] for r in rows if r[0]]

