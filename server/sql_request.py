# -*- coding: utf-8 -*-
"""
Fonctions de gestion de la base de données FabLab
PE-63
"""
import pathlib as Path
import sqlite3
import datetime
import csv
import os
root = Path(__file__).resolve().parent.parent
DATABASE_PATH = path / "./database/database.db"


def get_connection():
    """Créer une connexion à la base de données"""
    DATABASE_PATH.parent.mkdir(parents = True, exist_ok = True)
    return sqlite3.connect(DATABASE_PATH)


def research_user_by_id_qr(id_qr):
    """Rechercher un utilisateur par son ID QR"""
    conn = get_connection()
    cursor = conn.cursor()
    request = "SELECT NOM, PRENOM FROM UTILISATEURS WHERE ID = ?"
    cursor.execute(request, (id_qr,))
    result = cursor.fetchone()
    conn.close()
    return result

def research_user_by_id_carte(id_carte):
    """Rechercher un utilisateur par son ID CARTE"""
    conn = get_connection()
    cursor = conn.cursor()
    request = "SELECT NOM, PRENOM FROM UTILISATEURS WHERE ID = ?"
    cursor.execute(request, (id_carte,))
    result = cursor.fetchone()
    conn.close()
    return result

def add_entry(id_utilisateur, type_projet, zone_travail, commentaire):
    """Ajouter une entrée"""    
    conn = get_connection()
    cursor = conn.cursor()
    date = datetime.datetime 
    request = """INSERT INTO ENTREE (id_utilisateur, type_projet,zone_travail, commentaire,date)
    VALUES (?,?,?,?) """
    cursor.execute(request, (id_utilisateur, type_projet, zone_travail,commentaire, date))
    conn.close()
    
def add_user(id, nom, prenom,statut,commentaire):
    """Ajouter un utilisateur"""
    conn = get_connection()
    cursor = conn.cursor()
    request = """INSERT INTO UTILISATEURS (id, nom, prenom, statut,commentaire)
    VALUES (?,?,?,?) """
    cursor.execute(request, (id, nom, prenom, statut,commentaire))
    conn.close()


def link_id_carte(id, id_carte)
    """Fait le lien entre carte et QR"""
    conn = get_connection()
    cursor = conn.cursor()
    request = """
    UPDATE UTILISATEURS
    SET id_carte = ?
    WHERE id = ? """
    cursor.execute(request, (id_carte,id)) 
    conn.close() 

    








