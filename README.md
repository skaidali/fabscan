# Projet d'Études 63 : FabScan

## Description
**FabScan** est une application Web qui a pour but de centrer tous les outils et éléments nécessaires à la gestion d'un FabLab ou structure équivalente. Il propose plusieurs fonctionnalités à disposition des personnels de ces établissements :
- La gestion des entrées des utilisateur·ices, grâce à un système rapide et efficace ;
- La gestion des machines, ainsi que leur réservation ;
- La gestion des utilisateur·ices, ainsi que la liaison avec une carte RFID ou un code QR.

## Visuals
L'application se présente comme une page web hebergée localement, avec plusieurs onglets qui permettent de gérer les différentes facettes du FabLab :

- home, machines, reservations, users, stats, bills, scan, registration

## Installation

Pour pouvoir installer correctement l'ensemble du logiciel, vous allez avoir besoin de :
- Un Raspberry Pi (4 ou supérieur)
- *(si utilisation RFID)* Un Arduino Nano avec un lecteur RFID
- Des câbles USB

**TODO : voir si on peut ne pas le faire comme ça ; option portable ?**

### Requirements

**TODO : fichier .requirements doit être fait par Zac**

## Usage

**TODO : à faire !!**

## Support

**TODO : à faire !!**

## Contributing
Les contributions sont acceptées mais doivent rester dans le contexte d'étude. Merci de respecter la volonté du projet original !

## Authors and acknowledgment
Ce projet a été créé dans le contexte du Projet d'Études de l'École Centrale de Lyon, qui s'est déroulé d'octobre 2025 à juin 2026.
Nous remercions les conceptrices de ce projet : Chloé Laurent et [Clara Rigaud](https://github.com/Clararigaud) qui nous ont aidé et guidé tout au long du projet !

## License
Pas encore décidé, voir si MIT ou quelque chose du genre la licence anti-capitaliste ?
'Fin je veux juste pas que ce projet soit vendu en quelconque matière parce que c'est un projet étudiant et qu'il y a aucune raison que ça en sorte

# TODO: Choses à faire
- [ ] (!) Mettre des LEDs dans le boitier qui sera en plexiglas pour indiquer l'état du lecteur (reconnu, refusé)
- [ ] (!!) Faire en sorte de faire fonctionner le scan et de sortir du mode lecture de carte après un court temps / bouton. Aussi ajouter les raisons de venue et les commentaires au scan.js
- [ ] (!) Relier la fonction de scan présente dans registration.js sur scan.js
- [ ] (!!!) Continuer à ajouter les autres fonctionnalités dans les tabs, notamment actions récentes et stats

- [ ] Dans un futur lointain, config file qui régiera toutes les sélections + traductabilité


- [ ] Perspective d'amélioration : ajouter une option qui permet d'importer les données d'une base de données déjà existante (ex: si le fablab a déjà une base de données d'utilisateur·ices, pouvoir l'importer facilement dans notre système)

## Retours Chloé et Clara 1 avril
- [ ] mettre en ligne les fichiers 3d (sketch fab) 
- [X] travailler sur les readme. 
- [ ] replicabilité des branchmeents arduino avec shemas.
- [ ] photos !!
- [ ] antipciper les tests de mise en place du boitier
- [ ] Tracer les directions rgpd rapidement (qu'on puisse anticiper rapidement)

## Retours Chloé et Clara mars

- [X] Dans clients : séparez les fichiers html / css / js dans une architecture view / assets. 
- [X] Listez les dépendances python (qrcode)
- [X] Sortez le javascript du html
- [X] Supprimer les fichiers inutiles ( index.html par exemple) ; d'une maniere générale 1 site = plusieurs vues ( html) 1 ou quelques fichiers css et 1 ou quelques fichiers js.
- [X] Nommage des variables : (exemple r2 dans home.js) choisissez des noms de variables explicites pour qu'on comprenne facilement quelle variable est quoi dans la lecture du code.
- [ ] Tres bien le fichier sql_request pour separer les requetes db du serveur et la petite doc qui va avec. Attention à bien la mettre à jour en meme temps que les modifications dans le code :)  

OPTION QR CODE: 
est ce qu'on garde la solution en plan B ? et si oui > reflechir à comment integrer la scannette au systeme dans le cas ou les personnes n'ont pas de carte ? 
- [ ] Sinon, enlever la solution et dependances li&es au QRcode dans le python