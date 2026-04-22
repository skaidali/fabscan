# sql_request 
Module s'occupant de la communication entre le serveur et la base de donnée à l'aide du module sqlite3.

## Fonctions 

### Fonctions de management

-`get_connection` permet de se connecter à la base de donnée. Nécéssaire pour toute interaction avec la base de donnée.
-`init_database` permet d'assurer que la base de donnée existe et possède la bonne forme. Dans le cas contraire, on la crée/ajoute les catégories manquantes.
-`import_csv_data` permet d'ajouter des données à la base de donnée à partir d'un CSV. Surtout utile pour les tests. 
-`_normalize_user_row` permet de standardiser les données. 


### Fonctions d'actualisation

-`add_user` permet d'ajouter un utilisateur. Il est nécéssaire de connaître le nom, prénom et statut. Cette fonction n'est pas sensé être appellée seule, car ce n'est pas elle qui génère l'id lié à l'utilisateurs. 
-`update_user` permet de mettre à jour les informations d'un utilisateur. 
-`link_id_card` permet d'associer l'id d'une carte à un utilisateur à partir de son id.

-`add_entry` permet d'ajouter une entrée lié à un utilisateur. 

-`add_machine` permet d'ajouter une machine.
-`update_machine` permet de mettre à jour les informations d'une machines.
-`delete_machine` permet d'enlever une machine de la table.





### Fonctions de recherche

-`research_user_by_id` permet de rechercher un utilisateur par son id (l'id généré en même temps que le QRcode). L'id du QR_code marche toujours. 
-`research_user_by_id_carte` permet de rechercher un utilisateur par l'identifiant obtenu sur sa carte. ATTENTION, ne peut marcher que s'il la carte a déjà été lié à l'utilisateur (avec `link_id_card()` ) 
-`get_all_users` permet d'obtenir la totalité des utilisateurs, trié par ordre alphabétique (nom,prénom)
-`list_users` permet d'obtenir la liste des utilisateurs avec option de filtrage (nom, prénom, statut) et pagination.


-`get_all_entries` permet d'obtenir les dernières entrées (maximum 50)

-`list_machines`permet d'obtenir la liste des machines. 

-`get_stats` récupère les stats générales suivantes : 
nombre d'utilisateurs, nombre total d'entrée, nombre d'entrée aujourd'hui, nombre d'entrée sur les 7 derniers jours. 


