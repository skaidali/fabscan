# import_history.py
import os
import sqlite3
import openpyxl
from datetime import datetime

# --- CONFIGURATION INITIALE ---
DB_PATH = 'fablab.db'  # Chemin vers ton fichier de base de données SQLite
EXCEL_PATH = 'ancien_fichier_fablab.xlsx'  # Nom de ton fichier Excel historique

def générer_email_lyon(prenom, nom, statut):
    """Génère automatiquement l'adresse mail institutionnelle selon le statut."""
    if not prenom or not nom:
        return ""
    # Nettoyage des caractères et espaces
    p_clean = prenom.strip().lower().replace(' ', '-')
    n_clean = nom.strip().lower().replace(' ', '-')
    
    groupes_etu = ["1A", "2A", "3A", "Alternant·e", "Master"]
    
    if statut in groupes_etu:
        return f"{p_clean}.{n_clean}@etu.ec-lyon.fr"
    else:
        return f"{p_clean}.{n_clean}@ec-lyon.fr"

def importer_utilisateurs_excel():
    if not os.path.exists(EXCEL_PATH):
        print(f"❌ Erreur : Le fichier Excel '{EXCEL_PATH}' est introuvable.")
        return

    print(f"🔄 Lecture du fichier Excel : {EXCEL_PATH}...")
    # data_only=True permet de lire le résultat des formules si jamais il y en a
    wb = openpyxl.load_workbook(EXCEL_PATH, data_only=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    total_ajoutes = 0
    total_doublons = 0
    index_secours = 0

    # On boucle sur toutes les fenêtres (les onglets MOIS)
    for nom_onglet in wb.sheetnames:
        sheet = wb[nom_onglet]
        print(f"📂 Analyse de l'onglet : {nom_onglet}...")
        
        # On commence à la ligne 2 pour sauter l'en-tête (Date, Statut, Nom, Prenom)
        for ligne in sheet.iter_rows(min_row=2, values_only=True):
            # Sécurité si la ligne est vide ou s'il manque le Nom/Prénom
            if not ligne or ligne[2] is None or ligne[3] is None:
                continue
            
            # Récupération et nettoyage des données
            statut = str(ligne[1]).strip() if ligne[1] else "Inconnu"
            nom = str(ligne[2]).strip().upper()
            prenom = str(ligne[3]).strip().title()
            email = générer_email_lyon(prenom, nom, statut)

            # Vérification stricte anti-doublon dans la base sqlite
            cursor.execute("SELECT id FROM users WHERE UPPER(nom) = ? AND LOWER(prenom) = ?", (nom, prenom.lower()))
            existe = cursor.fetchone()
            
            if not existe:
                # Génération de l'identifiant unique basé sur l'horodatage + un index incrémental
                id_unique = datetime.now().strftime("%Y%m%d%H%M%S") + str(index_secours)
                index_secours += 1
                
                try:
                    cursor.execute("""
                        INSERT INTO users (id, nom, prenom, statut, email, id_carte, montant, certifications) 
                        VALUES (?, ?, ?, ?, ?, '', 0.0, '[]')
                    """, (id_unique, nom, prenom, statut, email))
                    total_ajoutes += 1
                except sqlite3.Error as e:
                    print(f"⚠️ Erreur lors de l'insertion de {prenom} {nom}: {e}")
            else:
                total_doublons += 1

    # Validation définitive des écritures dans le fichier de base de données
    conn.commit()
    conn.close()
    
    print("\n🏁 --- RAPPORT D'IMPORTATION ---")
    print(f"✅ Nouveaux utilisateurs importés en BDD : {total_ajoutes}")
    print(f"ℹ️ Doublons ignorés (déjà existants) : {total_doublons}")
    print("---------------------------------\n")

if __name__ == "__main__":
    importer_utilisateurs_excel()