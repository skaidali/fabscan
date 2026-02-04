# -*- coding: utf-8 -*-
"""
Fonctions de gestion de la base de données FabLab
PE-63
"""

import sqlite3
import datetime
import csv
import os

DATABASE_PATH = "./databases/fablab.db"


def get_connection():
    """Créer une connexion à la base de données"""
    os.makedirs("./databases", exist_ok=True)
    return sqlite3.connect(DATABASE_PATH)


def init_database():
    """Initialiser la base de données avec les tables nécessaires"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Table UTILISATEURS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS UTILISATEURS (
            ID TEXT PRIMARY KEY,
            ID_MOODLE TEXT,
            NOM TEXT NOT NULL,
            PRENOM TEXT NOT NULL,
            STATUT TEXT DEFAULT 'Etudiant',
            FORMATION_3D INTEGER DEFAULT 0,
            FORMATION_LASER INTEGER DEFAULT 0,
            FORMATION_BRODEUSE INTEGER DEFAULT 0,
            MONTANT REAL DEFAULT 0.0
        )
    """)
    
    # Table ENTREES
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ENTREES (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            ID_UTILISATEUR TEXT NOT NULL,
            DATE_ENTREE TEXT NOT NULL,
            TYPE_PROJET TEXT,
            ZONE_TRAVAIL TEXT,
            FOREIGN KEY (ID_UTILISATEUR) REFERENCES UTILISATEURS(ID)
        )
    """)
    
    # Table COMMENTAIRES_UTILISATEURS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS COMMENTAIRES_UTILISATEURS (
            ID INTEGER PRIMARY KEY AUTOINCREMENT,
            ID_UTILISATEUR TEXT NOT NULL,
            COMMENTAIRE TEXT,
            ZONE_TRAVAIL TEXT,
            DATE_COMMENTAIRE TEXT,
            FOREIGN KEY (ID_UTILISATEUR) REFERENCES UTILISATEURS(ID)
        )
    """)
    
    conn.commit()
    conn.close()
    print("✓ Base de données initialisée")


def research_user_by_id(id_user):
    """Rechercher un utilisateur par son ID"""
    conn = get_connection()
    cursor = conn.cursor()
    request = "SELECT NOM, PRENOM FROM UTILISATEURS WHERE ID = ?"
    cursor.execute(request, (id_user,))
    result = cursor.fetchone()
    conn.close()
    return result



def add_user(id_user, nom, prenom, statut, id_moodle=""):
    """Ajouter un nouvel utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        INSERT INTO UTILISATEURS
        (ID, ID_MOODLE, NOM, PRENOM, STATUT)
        VALUES (?, ?, ?, ?, ?)
    """
    cursor.execute(query, (id_user, id_moodle, nom, prenom, statut))
    conn.commit()
    conn.close()

def add_entry(id_user, type_projet="", zone="", commentaire=""):
    """Ajouter une nouvelle entrée"""
    conn = get_connection()
    cursor = conn.cursor()
    date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = """
        INSERT INTO ENTREES
        (ID_UTILISATEUR, DATE_ENTREE, TYPE_PROJET, ZONE_TRAVAIL)
        VALUES (?, ?, ?, ?)
    """
    cursor.execute(query, (id_user, date, type_projet, zone))
    
    # Ajouter un commentaire si fourni
    if commentaire:
        add_comment(id_user, commentaire, zone)
    
    conn.commit()
    conn.close()


def get_all_users():
    """Récupérer tous les utilisateurs"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT ID, ID_MOODLE, NOM, PRENOM, STATUT, 
               FORMATION_3D, FORMATION_LASER, FORMATION_BRODEUSE, MONTANT
        FROM UTILISATEURS
        ORDER BY NOM, PRENOM
    """)
    results = cursor.fetchall()
    conn.close()
    return results


def get_all_entries(limit=50):
    """Récupérer les dernières entrées"""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT e.DATE_ENTREE, u.STATUT, u.NOM, u.PRENOM, 
               e.TYPE_PROJET, e.ZONE_TRAVAIL, c.COMMENTAIRE
        FROM ENTREES e
        JOIN UTILISATEURS u ON e.ID_UTILISATEUR = u.ID
        LEFT JOIN COMMENTAIRES_UTILISATEURS c ON e.ID_UTILISATEUR = c.ID_UTILISATEUR
        ORDER BY e.DATE_ENTREE DESC
        LIMIT ?
    """, (limit,))
    results = cursor.fetchall()
    conn.close()
    return results


def get_stats():
    """Récupérer les statistiques générales"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Nombre total d'utilisateurs
    cursor.execute("SELECT COUNT(*) FROM UTILISATEURS")
    total_users = cursor.fetchone()[0]
    
    # Nombre total d'entrées
    cursor.execute("SELECT COUNT(*) FROM ENTREES")
    total_entries = cursor.fetchone()[0]
    
    # Entrées du jour
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) FROM ENTREES WHERE DATE_ENTREE LIKE ?", (today + "%",))
    today_entries = cursor.fetchone()[0]
    
    # Entrées de la semaine
    week_ago = (datetime.datetime.now() - datetime.timedelta(days=7)).strftime("%Y-%m-%d")
    cursor.execute("SELECT COUNT(*) FROM ENTREES WHERE DATE_ENTREE >= ?", (week_ago,))
    week_entries = cursor.fetchone()[0]
    
    conn.close()
    
    return {
        "total_users": total_users,
        "total_entries": total_entries,
        "today_entries": today_entries,
        "week_entries": week_entries
    }
    

def check_entries_by_user(id_user):
    """Vérifier les entrées d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT u.NOM, u.PRENOM, e.DATE_ENTREE
        FROM UTILISATEURS u
        JOIN ENTREES e ON u.ID = e.ID_UTILISATEUR
        WHERE u.ID = ?
        ORDER BY e.DATE_ENTREE DESC
    """
    cursor.execute(query, (id_user,))
    results = cursor.fetchall()
    conn.close()
    return results


def to_excel():
    pass

def check_formations(id_user):
    """Vérifier les formations d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT FORMATION_3D, FORMATION_LASER, FORMATION_BRODEUSE
        FROM UTILISATEURS
        WHERE ID = ? 
    """
    cursor.execute(query, (id_user,))
    result = cursor.fetchone()
    conn.close()
    return result


def add_formation(id_user, f3d=False, flaser=False, fbrodeuse=False):
    """Ajouter ou modifier les formations d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        UPDATE UTILISATEURS
        SET FORMATION_3D = ?,
            FORMATION_LASER = ?,
            FORMATION_BRODEUSE = ?
        WHERE ID = ?
    """
    cursor.execute(query, (int(f3d), int(flaser), int(fbrodeuse), id_user))
    conn.commit()
    conn.close()
 

def add_comment(id_user, commentaire, zone=""):
    """Ajouter un commentaire pour un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    date = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    query = """
        INSERT INTO COMMENTAIRES_UTILISATEURS
        (ID_UTILISATEUR, COMMENTAIRE, ZONE_TRAVAIL, DATE_COMMENTAIRE)
        VALUES (?, ?, ?, ?)
    """
    cursor.execute(query, (id_user, commentaire, zone, date))
    conn.commit()
    conn.close()


def check_comments(id_user):
    """Vérifier les commentaires d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT COMMENTAIRE, ZONE_TRAVAIL, DATE_COMMENTAIRE
        FROM COMMENTAIRES_UTILISATEURS
        WHERE ID_UTILISATEUR = ?
        ORDER BY ID DESC
    """
    cursor.execute(query, (id_user,))
    results = cursor.fetchall()
    conn.close()
    return results


def check_status(id_user):
    """Vérifier le statut d'un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
        SELECT NOM, PRENOM, STATUT
        FROM UTILISATEURS
        WHERE ID = ?
    """
    cursor.execute(query, (id_user,))
    result = cursor.fetchone()
    conn.close()
    return result


def import_csv_data():
    """Importer les données depuis les fichiers CSV"""
    conn = get_connection()
    cursor = conn.cursor()
    
    # Import des utilisateurs
    users_file = "../test_data/users.csv"
    if os.path.exists(users_file):
        try:
            with open(users_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute("""
                        INSERT OR IGNORE INTO UTILISATEURS 
                        (ID, NOM, PRENOM, STATUT, ID_MOODLE)
                        VALUES (?, ?, ?, ?, ?)
                    """, (row.get('ID', ''), row.get('NOM', ''), 
                          row.get('PRENOM', ''), row.get('STATUT', 'Etudiant'),
                          row.get('ID_MOODLE', '')))
            print(f"✓ Utilisateurs importés depuis {users_file}")
        except Exception as e:
            print(f"⚠ Erreur import users: {e}")
    
    # Import des entrées
    entries_file = "../test_data/entrees.csv"
    if os.path.exists(entries_file):
        try:
            with open(entries_file, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    cursor.execute("""
                        INSERT INTO ENTREES 
                        (ID_UTILISATEUR, DATE_ENTREE, TYPE_PROJET)
                        VALUES (?, ?, ?)
                    """, (row.get('ID_UTILISATEUR', ''), 
                          row.get('DATE', ''), 
                          row.get('TYPE_PROJET', '')))
            print(f"✓ Entrées importées depuis {entries_file}")
        except Exception as e:
            print(f"⚠ Erreur import entries: {e}")
    
    conn.commit()
    conn.close()


def to_excel():
    """Exporter les données vers Excel (à implémenter)"""
    pass









    
    