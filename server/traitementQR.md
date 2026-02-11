## Traitement QR

module gérant le traitement des QRcode (génération, vérification de l'existence)

# Fonctions : 

-`generateID()` 
génère un id pour le QRcode à partir de la date.

-`createQR(create_id=True,id=None)` 
crée et sauvegarde le QRcode dans `database/QRcode` tout en renvoyant l'id utilisé pour générer le QRcode (pour l'ajouter à la base de donnée)

Par défaut, l'identifiant est généré à partir de `generateID()` mais pour réaliser des tests on peut utiliser un identifiant choisi par l'utilisateur `(create_id = False, id = [ID])`

-`qr_exists(ID)` 
renvoie vrai si il existe un QRcode associé à l'id dans `database/QRcode`





