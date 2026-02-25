# sql_request 
Module s'occupant de la communication entre le serveur et la base de donnée à l'aide du module sqlite3.

## Fonctions 

-`get_connection()` connecte à la base de donnée.
-`research_user_by_id_qr(id_qr)` recherche l'utilisateur à partir de son QRcode 
-`research_user_by_id_carte(id_carte)` recherche l'utilisateur à partir de sa carte
-`add_user(id,nom, prenom,statut,commentaire)` ajoute un utilisateur dans la table UTILISATEUR (formations mise à FALSE). L'id de la carte n'est pas ajouté dans cette fonction. 
-`add_entry(id_utilisateur, type_projet, zone_travail, commentaire)` ajoute une entrée dans la table ENTREE (date générée par le programme)
-`link_id_carte` Permet de faire le lien entre la carte et le qr code. 
-`to_excel` Génère un excel à partir de la base de donnée avec le même format 