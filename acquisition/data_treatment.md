# Acquisition RFID

## Rôle

Ce programme assure la liaison entre le lecteur RFID Arduino et le serveur FabScan.

Il détecte automatiquement le port série de l'Arduino, lit les identifiants des cartes RFID puis les transmet au serveur via une requête HTTP.

## Dépendances

- `pyserial` (`serial`) : communication avec le port série de l'Arduino.
- `serial.tools.list_ports` : détection automatique du port série utilisé par le lecteur RFID.
- `requests` : envoi des données au serveur via l'API HTTP.
- `time` : gestion des temporisations lors de l'initialisation de la communication série.

## Fonctionnement

### Recherche du lecteur

La fonction `find_arduino_port()` parcourt les ports série disponibles et recherche un périphérique dont la description contient :

- `Arduino`
- `CH340`
- `USB`

Le premier port correspondant est utilisé.

### Acquisition des données

La fonction `data_acquisition()` :

1. détecte le port série 
2. ouvre la communication à `9600 bauds` 
3. attend l'initialisation de l'Arduino 
4. lit en continu les données reçues sur le port série

### Traitement des identifiants

Chaque ligne reçue est :

- convertie en chaîne de caractères ,
- nettoyée des caractères parasites ,
- interprétée comme un identifiant RFID.

### Gestion des erreurs

Le programme détecte :
- l'absence de lecteur RFID,
- les erreurs de communication série,
- l'indisponibilité du serveur.

Des messages explicites correspondant à chaque erreur sont affichés dans la console afin de faciliter le diagnostic. 