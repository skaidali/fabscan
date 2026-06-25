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

Pour pouvoir installer et utiliser correctement l'ensemble du logiciel, vous allez avoir besoin de :
- Un Arduino Nano avec un lecteur RFID (dont les branchements sont détaillés par un fichier svg dans le dossier "case")
- Une scannette de QR codes
- Un boitier et son support (dont les fichiers sont accessibles dans le dossier "case", en `.step` et en `.stl`)

> Note : une documentation concernant la fabrication et l'assemblage du boitier peut être trouvée dans le dossier "documentation"

## Contributing
Les contributions sont acceptées mais doivent rester dans le contexte d'étude. Merci de respecter la volonté du projet original !

## Authors and acknowledgment
Ce projet a été créé dans le contexte du Projet d'Études de l'École Centrale de Lyon, qui s'est déroulé d'octobre 2025 à juin 2026.
Nous remercions les conceptrices de ce projet : Chloé Laurent et [Clara Rigaud](https://github.com/Clararigaud) qui nous ont aidé et guidé tout au long du projet !

# Perspectives d'amélioration :
- [ ] Dans un futur lointain, config file qui régiera toutes les sélections + traductabilité

# Remarques sur le code
- La database enregistre les heures en UTC, mais le serveur les convertit en heure locale pour l'affichage. Il faut donc faire attention à ce que les heures soient bien converties. Normalement, pas de problème lors de l'export en csv.