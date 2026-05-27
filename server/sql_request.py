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
    ]

    for col_name, col_def in migrations:
        if col_name not in existing_cols:
            cursor.execute(f"ALTER TABLE UTILISATEURS ADD COLUMN {col_name} {col_def}")

    # Index unique sur id_carte (exclut les NULL pour autoriser plusieurs utilisateurs sans carte)
    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_utilisateurs_id_carte
        ON UTILISATEURS(id_carte) WHERE id_carte IS NOT NULL
    """)


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

    # Machines table: id, name, type, slots (JSON array of times)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS MACHINES (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT
        )
    """)

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
    cursor.execute("UPDATE UTILISATEURS SET id_carte = ? WHERE id = ?", (id_carte, id_user))
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
    clean_statut = (statut or "").strip().lower()

    if clean_search:
        where_clauses.append("(LOWER(nom) LIKE ? OR LOWER(prenom) LIKE ? OR LOWER(email) LIKE ?)")
        like_value = f"%{clean_search}%"
        params.extend([like_value, like_value, like_value])

    if clean_statut and clean_statut != "all":
        if clean_statut == "etudiants":
            where_clauses.append("LOWER(statut) LIKE '%etudiant%'")
        elif clean_statut == "personnel":
            where_clauses.append("LOWER(statut) LIKE '%personnel%'")
        elif clean_statut == "externes":
            where_clauses.append("LOWER(statut) LIKE '%externe%'")

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
        SELECT e.date, u.statut, u.nom, u.prenom,
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


def get_stats(periode="semaine"):
    """Récupérer les statistiques générales filtrées par période"""
    import datetime
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Chiffres globaux fixes
    cursor.execute("SELECT COUNT(*) FROM UTILISATEURS")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM ENTREE")
    total_entries = cursor.fetchone()[0]

    now = datetime.datetime.now()
    today_str = now.strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) FROM ENTREE WHERE date LIKE ?", (today_str + "%",))
    today_entries = cursor.fetchone()[0]

    # 2. Logique de calcul selon la période demandée
    if periode == "jour":
        # 24 dernières heures -> on groupe par heure
        start_date = (now - datetime.timedelta(days=1)).strftime("%Y-%m-%d %H:%M:%S")
        group_by = "strftime('%Y-%m-%d %H:00', date)" 
    elif periode == "mois":
        # 30 derniers jours -> on groupe par jour
        start_date = (now - datetime.timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")
        group_by = "strftime('%Y-%m-%d', date)"
    elif periode == "annee":
        # 365 derniers jours -> on groupe par mois
        start_date = (now - datetime.timedelta(days=365)).strftime("%Y-%m-%d %H:%M:%S")
        group_by = "strftime('%Y-%m', date)"
    else:
        # Par défaut : "semaine" (7 derniers jours) -> on groupe par jour
        start_date = (now - datetime.timedelta(days=7)).strftime("%Y-%m-%d %H:%M:%S")
        group_by = "strftime('%Y-%m-%d', date)"

    # Nombre d'entrées sur la période choisie
    cursor.execute("SELECT COUNT(*) FROM ENTREE WHERE date >= ?", (start_date,))
    period_entries = cursor.fetchone()[0]

    # 3. Données pour le Graphique dynamique
    cursor.execute(f"""
        SELECT {group_by} as d, COUNT(*)
        FROM ENTREE
        WHERE date >= ?
        GROUP BY d ORDER BY d
    """, (start_date,))
    chart_data = {row[0]: row[1] for row in cursor.fetchall()}

    # 4. Répartition par Zone (filtrée sur la période pour plus de pertinence)
    cursor.execute("""
        SELECT zone_travail, COUNT(*)
        FROM ENTREE
        WHERE zone_travail IS NOT NULL AND zone_travail != '' AND date >= ?
        GROUP BY zone_travail
    """, (start_date,))
    zones = [{"name": row[0], "count": row[1]} for row in cursor.fetchall()]

    # 5. Les 5 dernières entrées
    cursor.execute("""
        SELECT e.date, u.nom, u.prenom, e.zone_travail, e.type_projet
        FROM ENTREE e
        JOIN UTILISATEURS u ON e.id_utilisateur = u.id
        ORDER BY e.date DESC
        LIMIT 5
    """)
    recent = [{"date": r[0], "nom": f"{r[2]} {r[1]}", "zone": r[3], "projet": r[4]} for r in cursor.fetchall()]

    conn.close()
    
    return {
        "total_users": total_users,
        "total_entries": total_entries,
        "today_entries": today_entries,
        "period_entries": period_entries, # La valeur dynamique
        "chart_data": chart_data,
        "zones": zones,
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









