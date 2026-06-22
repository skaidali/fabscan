# Documentation "boitier" - FABSCAN

Cette documentation détaille la liste du matériel nécessaire, les instructions d'impression 3D ainsi que les étapes de câblage et d'assemblage du boîtier.


## 1. Liste du matériel


- **1x** Arduino Nano
- **1x** Module RFID RC522
- **1x** LED verte
- **1x** Résistance de 100 Ω
- **Lot de câbles** Dupont (femelle - femelle)
- **3x** Pièces imprimées en 3D (Boîtier, Porte, Support LED)



## 2. Impression 3D des boîtiers

Les fichiers STL nécessaires à l'impression sont disponibles en téléchargement en cliquant sur **[ce lien](https://ecloud.myecl.fr/s/2JnsZxnKDqR7NKA)**, ou en scannant le QR code ci dessous :
<div align="center">
<img src="images/qr-code.png" alt="qr code des impressions 3D" width="300" />
</div>

### 2.1 Paramètres du Slicer (Trancheur)

L'architecture du boîtier et de son support a été optimisée pour minimiser l'utilisation de supports d'impression. 

#### Orientation des pièces
Pour un résultat optimal et économique en matériau, disposez les pièces sur le plateau de la manière suivante :

![Disposition des pièces sur le plateau](./images/disposition.png)

> **Note :** Pour positionner les éléments ainsi, vous devrez séparer le boîtier de sa porte. Sur votre slicer, faites un clic droit sur le modèle 3D, puis sélectionnez **"Scinder"** -> **"Vers les objets"**.

![Option scinder le modèle](./images/scinder.png)


<BR>


#### Gestion des supports
Seul le support de la LED nécessite des supports d'impression. Pour les placer précisément sans surcharger la pièce, utilisez l'option **"Peindre les supports"** de votre logiciel de trancheur, et peignez les de la manière suivante :

![Peindre les supports](./images/support.png)


## 3. Câblage électronique

Effectuez les connexions en suivant le schéma ci-dessous.

![Schéma de câblage complet](./images/cablage.jpg)


## 4. Intégration des composants

Une fois l'impression terminée, nettoyez les pièces de leur supports, avant de procéder à l'intégration des composants électroniques.

<BR>

Glissez les cartes dans leurs rails respectifs comme indiqué ci-dessous. Le module RFID se place dans la partie supérieure, tandis que l'Arduino Nano vient se loger juste en dessous.

<div align="center">
<img src="./images/emplacement1.png" alt="Emplacement RFID et Arduino" width="430" />
</div>



<BR>

La LED verte s'insère dans le support dédié, présent en bas de l'image :

<div align="center">
<img src="./images/emplacement2.png" alt="Emplacement de la LED" width="430" />
</div>