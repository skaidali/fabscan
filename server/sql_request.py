import sqlite3 
import datetime
import pandas 

connexion = sqlite3.connect("Database.db")
cursor = connexion.cursor()


def research_user_by_id(id_user):
    request = "SELECT NOM, PRENOM FROM UTILISATEURS WHERE ID = ?"
    cursor.execute((request, (id_user,)))



def add_user(idUser, nom, prenom, statut, f_3d  = False, f_cout = False, f_laser = False):
    query = """
        INSERT INTO UTILISATEURS
        (ID, Nom, Prenom, Statut, Formation3d, FormationCouture, Formationlaser)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """
    cursor.execute(query, (idUser, nom, prenom, statut, f_3d, f_cout, f_laser))

    
def add_entry(IdEntry, IdUser):
    date = datetime.datetime()
    query = """
        INSERT INTO ENTREE
        (ID, ID_Utilisateurs, date)
        VALUES (?, ?, ?)
    """
    cursor.execute(query, (IdEntry, IdUser,date))
    

def check_entries_by_user(Id_User):
    query = """
        SELECT u.Nom, u.Prenom, e.date
        FROM Utilisateurs u
        JOIN Entree e ON u.ID = e.ID_Utilisateurs
        WHERE u.ID = ?
        ORDER BY e.date DESC
    """
    cursor.execute(query, (Id_User,))
    return cursor.fetchall()


def to_excel():
    pass

def check_formations(Id_User):
    query = """
        SELECT
               Formation3d,
               FormationLaser,
               FormationCouture
        FROM Utilisateurs
        WHERE u.ID = ? 
    """
    cursor.execute(query, (Id_User,))
    return cursor.fetchall()


def add_formation(Id_User, f3d=False, flaser=False, fcouture=False):
    query = """
        UPDATE Utilisateurs
        SET Formation3d = ?,
            FormationLaser = ?,
            FormationCouture = ?
        WHERE ID = ?
    """
    cursor.execute(query, (f3d, flaser, fcouture, Id_User))
 

def add_comment(Id_User, commentaire, zone):
    query = """
        INSERT INTO Commentaires_Utilisateurs
        (commentaire, zone_de_travail, ID_Utilisateurs)
        VALUES (?, ?, ?)
    """
    cursor.execute(query, (commentaire, zone, Id_User))

def check_comments(Id_User):
    query = """
        SELECT commentaire, zone_de_travail
        FROM Commentaires_Utilisateurs
        WHERE ID_Utilisateurs = ?
        ORDER BY ID DESC
    """
    cursor.execute(query, (Id_User,))
    return cursor.fetchall()


def check_status(Id_User):
    query = """
        SELECT Nom, Prenom, Statut
        FROM Utilisateurs
        WHERE ID = ?
    """
    cursor.execute(query, (Id_User,))
    return cursor.fetchone()


def end():
    connexion.commit()
    connexion.close()








    
    