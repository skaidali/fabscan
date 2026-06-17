# Serveur 

## Présentation

Ce fichier est le serveur de l'application Fabscan. 
Il permet de faire le lien entre l'interface web (pages html,CSS, Javascript),l'interface réelle (boitier, arduino) et la base de données (database.db) pour traiter les diverses demandes : 

- la gestion des utilisateurs (inscription, modifications d'informations, lien entre utilisateurs et carte, etc),
- la gestion des entrées ,
- la gestions des statistiques,
- la maintenance de la base de données. 

On utilise le port 8000 sans vérifier qu'il n'est pas déjà utilisé par le PC. Il est donc essentiel que le port ne soit pas utilisé par le PC pour pouvoir lancer l'application. 


## Dépendances 

`serveur.py` possède de nombreuses dépendances :  
- `sql_request.py` contenant les fonctions de gestion de la base de données.
- `traitementQR.py` contenant les fonctions lié à la gestion des QR codes.
- `pathlib.Path` permettant de manipuler les chemins de fichiers et dossiers.
- `http.server` fournissant les classes de base nécessaires à la création du serveur HTTP.
- `socketserver` permettant la mise en écoute sur un port réseau et la gestion des connexions clientes.
- `urllib.parse` (`urlparse`, `parse_qs`) permettant d'analyser les URLs et de récupérer les paramètres des requêtes GET.
- `json` permettant l'encodage et le décodage des données échangées au format JSON entre le client et le serveur.
- `datetime` permettant de manipuler les dates et heures,on l'utilise notamment pour générer des identifiants utilisateurs uniques.


