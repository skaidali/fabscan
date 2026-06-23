# FabScan - Documentation Utilisateur (version complète)

Version du document : 23/06/2026  
Public cible : Personnel de FabLab (gestionnaires)  
Objet : Utilisation quotidienne de l'application FabScan

---

## Table des matières

- [1. Introduction](#1-introduction)
- [2. Prérequis et démarrage](#2-prérequis-et-démarrage)
- [3. Présentation générale de l'interface](#3-présentation-générale-de-linterface)
- [4. Onglet Accueil](#4-onglet-accueil)
- [5. Onglet Scanner](#5-onglet-scanner)
- [6. Onglet Utilisateurs](#6-onglet-utilisateurs)
- [7. Onglet Comptabilité](#7-onglet-comptabilité)
- [8. Onglet Statistiques](#8-onglet-statistiques)
- [9. Onglet Inscription](#9-onglet-inscription)
- [10. Mise en pratique](#10-mise-en-pratique)
- [11. Déroulement d'une entrée au FabLab](#11-déroulement-dune-entrée-au-fablab)
- [12. Procédures liées](#12-procédures-liées)
- [13. FAQ](#13-faq)
- [14. Checklist avant export PDF / impression](#14-checklist-avant-export-pdf--impression)

---

## 1. Introduction

Cette documentation présente le fonctionnement de l'application Web **FabScan** et l'ensemble de ses fonctionnalités.

### 1.1 Définitions

Dans la suite du document :

- **FabLab** : emplacement physique où se situe le dispositif FabScan.
- **Application** : interface Web du dispositif FabScan.
- **Personnel** / **Vous** : gestionnaire du FabLab qui utilise l'Application.
- **Utilisateur** : membre externe au Personnel qui fréquente le FabLab.
- **Mode d'identification** : moyen utilisé par l'Utilisateur pour s'identifier :
  - QR code (sur téléphone),
  - carte multiservice / carte étudiante / badge.

### 1.2 Navigation dans ce document

- Pour une prise en main rapide : voir [10. Mise en pratique](#10-mise-en-pratique).
- Pour enregistrer une entrée : voir [11. Déroulement d'une entrée au FabLab](#11-déroulement-dune-entrée-au-fablab).
- Pour l'inscription d'un nouvel utilisateur : voir [9. Onglet Inscription](#9-onglet-inscription).

---

## 2. Prérequis et démarrage

Contexte : le Personnel s'installe à son poste de travail et souhaite lancer l'Application.

1. Allumer l'ordinateur où FabScan est installé.
2. Vérifier qu'une connexion Internet est disponible (recommandé).
3. Double-cliquer sur l'icône **FabScan** sur le bureau.
4. La fenêtre terminal (fond noir) s'ouvre.
5. Patienter jusqu'à l'ouverture automatique de l'Application dans le navigateur.

L'onglet **Accueil** apparaît : l'Application est prête à l'emploi.

> Note : la connexion Internet n'est pas indispensable au fonctionnement de base. En cas de perte de connexion, l'Application reste utilisable, mais certaines fonctions (notamment l'envoi de QR code) peuvent être dégradées.

---

## 3. Présentation générale de l'interface

L'interface est organisée en onglets accessibles depuis la barre de navigation :

- **Accueil**
- **Scanner**
- **Utilisateurs**
- **Comptabilité**
- **Statistiques**
- **Inscription**

L'onglet actif est mis en évidence par un fond coloré.

### 3.1 Logique commune à plusieurs onglets

Plusieurs écrans partagent la même logique :

- une zone de **recherche/identification** d'utilisateur,
- une zone de **profil** (informations affichées),
- une zone de **saisie/validation** (action métier),
- des **tableaux d'historique** filtrables.

---

## 4. Onglet Accueil

Onglet affiché par défaut au lancement.

![Extrait de l'onglet Accueil](./images/1_pageaccueil.png)

### 4.1 Contenu de l'écran

- Titre **Tableau de bord**.
- Bouton **Mode Manuel / Mode Automatique**.
- Date et heure courantes.
- Indicateurs d'activité :
  - entrées sur la dernière heure,
  - entrées du jour,
  - nombre total d'utilisateurs inscrits.
- Tableau des dernières entrées.

### 4.2 Points d'attention

- Les données de synthèse sont mises à jour en temps réel.
- Le tableau des dernières entrées permet de cliquer sur un nom pour ouvrir sa fiche utilisateur (voir [6. Onglet Utilisateurs](#6-onglet-utilisateurs)).
- Le mode automatique est détaillé dans [11.2 Mode automatique](#112-mode-automatique).

---

## 5. Onglet Scanner

Cet onglet sert à enregistrer les entrées au FabLab (badge RFID ou QR code).

![Extrait de l'onglet Scanner](./images/2_pagescan.png)

### 5.1 Organisation de la page

- À gauche : identification et affichage du **Profil scanné**.
- À droite : bloc **Validation de l'entrée**.
- En haut : bouton de bascule **Mode Automatique**.

### 5.2 Identification d'un utilisateur

Vous pouvez identifier un utilisateur via :

- son nom,
- son prénom,
- son identifiant (issu d'un QR code),
- sa carte RFID.

Lorsqu'une valeur est saisie, des suggestions apparaissent. Cliquer sur la bonne personne pour charger son profil.

### 5.3 Informations affichées dans Profil scanné

- prénom, nom,
- statut,
- solde,
- présence/absence de carte RFID,
- certifications machine.

Si aucun utilisateur n'est identifié : état **En attente de scan...**.

### 5.4 Validation d'une entrée

Champs de saisie :

- motif de visite (obligatoire),
- zone de travail (obligatoire),
- commentaire (optionnel).

Puis cliquer sur **Valider l'entrée**.

### 5.5 Références utiles

- Processus complet d'entrée : [11. Déroulement d'une entrée au FabLab](#11-déroulement-dune-entrée-au-fablab).
- Mode automatique : [11.2 Mode automatique](#112-mode-automatique).

---

## 6. Onglet Utilisateurs

Cet onglet permet de rechercher, consulter et modifier les profils utilisateurs.

![Extrait de l'onglet Utilisateurs](./images/4_pageusers.png)

### 6.1 Organisation de la page

- À gauche : fiche détaillée du **Profil Utilisateur** sélectionné.
- À droite : recherche, filtres et tableau des utilisateurs.

### 6.2 Actions disponibles sur une fiche

- Voir QR code et identifiant utilisateur.
- Modifier prénom, nom, e-mail, statut.
- Associer / retirer une carte RFID.
- Gérer les certifications machine.
- **Sauvegarder** les changements.
- **Envoyer le QR** par e-mail.
- **Supprimer cet utilisateur** (action irréversible, avec confirmation).
- Consulter l'historique des paiements liés à l'utilisateur.

### 6.3 Recherche et pagination

- Recherche par nom, prénom ou e-mail.
- Filtre par statut.
- Pagination via **Précédent / Suivant**.
- 20 utilisateurs affichés par page.

### 6.4 Effet d'une suppression

- Le profil utilisateur est supprimé définitivement.
- Les entrées passées restent comptabilisées mais le nom/prénom devient **Membre supprimé**.
- Les transactions comptables restent visibles.

\newpage

## 7. Onglet Comptabilité

Cet onglet sert à gérer les transactions financières des utilisateurs.

![Extrait de l'onglet Comptabilité](images/11_compta.png)

### 7.1 Organisation de la page

- À gauche : profil de l'utilisateur sélectionné.
- À droite : formulaire d'enregistrement d'une opération.
- En bas : historique global des transactions.

### 7.2 Recherche d'utilisateur

Même logique que [5.2 Identification d'un utilisateur](#52-identification-dun-utilisateur) :

- recherche textuelle,
- scan QR,
- suggestions cliquables.

### 7.3 Informations affichées (zone gauche)

- prénom, nom,
- statut,
- solde,
- e-mail,
- carte RFID associée (ou non),
- dernières transactions.

### 7.4 Saisie d'une opération (zone droite)

Champs principaux :

- nom de l'opération (obligatoire),
- numéro d'opération (optionnel),
- description (optionnelle),
- type de projet (obligatoire),
- nom du projet (obligatoire si projet sélectionné),
- responsable projet (optionnel),
- type de mouvement : **Crédit** ou **Débit** (obligatoire),
- matériau + quantité/poids (optionnel, mais quantité/poids obligatoire si matériau choisi),
- montant final de l'opération,
- commentaire (optionnel).

Le montant final peut être calculé automatiquement selon matériau et quantité/poids, ou saisi directement selon le cas d'usage.

### 7.5 Historique et export

Le tableau en bas de page permet :

- filtrage par type de projet,
- filtrage par nom de projet,
- ouverture du détail d'une transaction dans un panneau latéral,
- export CSV via **Exporter l'historique**.

Le fichier est enregistré dans **Téléchargements** sous le nom :
**Transactions_FabLab.csv**.

---

## 8. Onglet Statistiques

Cet onglet fournit une vue d'ensemble de la fréquentation sur une période donnée.

![Extrait de l'onglet Statistiques](images/6_pagestats.png)

### 8.1 Section Filtres d'analyse

Filtres disponibles :

- période (aujourd'hui, 7 jours, 30 jours, 12 mois),
- zone de travail,
- motif de visite,
- mode d'enregistrement,
- statut utilisateur,
- certification machine.

Actions :

- **Appliquer les filtres**,
- **Réinitialiser**.

### 8.2 Indicateurs clés

Trois indicateurs centraux :

- entrées aujourd'hui,
- entrées sur la période sélectionnée,
- nombre de membres correspondants.

### 8.3 Bloc Activités

- Histogramme d'évolution des passages.
- Répartition par profils (statuts).

### 8.4 Dernières entrées filtrées

- Tableau des 20 passages les plus récents selon les filtres.
- Colonnes : date/heure, nom/prénom, statut, zone, projet, type d'entrée.
- Clic sur un nom : ouverture de sa fiche utilisateur.

### 8.5 Export et actualisation

- **Exporter l'historique** : export CSV des données filtrées.
- **Actualiser** : mise à jour du tableau selon les filtres.

Fichier exporté : **Historique_Entrees_FabLab.csv** (dossier Téléchargements).

\newpage

## 9. Onglet Inscription

Cet onglet sert à créer un nouvel utilisateur dans la base de données.

![Extrait de l'onglet Inscription](./images/7_pageinscrip.png)

### 9.1 Objectif

L'inscription est nécessaire avant une première identification en Scanner.

### 9.2 Formulaire d'inscription

Champs et actions :

- statut (obligatoire),
- prénom (obligatoire),
- nom (obligatoire),
- e-mail (obligatoire, pré-rempli selon le statut),
- motif de visite (obligatoire),
- associer la carte (optionnel),
- enregistrer l'utilisateur.

### 9.3 Envoi du QR code

Après enregistrement, une fenêtre s'ouvre pour préparer l'envoi d'e-mail (ex. client de messagerie de l'établissement).

Bonnes pratiques :

1. Vérifier l'adresse e-mail.
2. Envoyer le QR code.
3. Revenir dans FabScan et confirmer la suite.

### 9.4 Import de base historique

Bouton : **Importer un fichier Excel historique (.xlsx)**.

Cette fonction sert principalement à l'initialisation ou à une migration de données.

### 9.5 Maintenance réglementaire

Bouton : **Maintenance réglementaire**.

Cette fonction permet de :

- supprimer les utilisateurs inactifs depuis longtemps (ex. 5 ans),
- anonymiser certaines données selon les règles applicables.

L'action est sécurisée par confirmations successives et authentification système.

---

## 10. Mise en pratique

### 10.1 Inscription d'un utilisateur (procédure rapide)

1. Ouvrir l'onglet **Inscription**.
2. Renseigner statut, prénom, nom, e-mail et motif.
3. Associer une carte si nécessaire.
4. Cliquer sur **Enregistrer l'utilisateur**.
5. Le client de messagerie de l'établissement (Zimbra) s'ouvre automatiquement.
6. Si vous n'êtes pas connecté au service CAS de l'établissement :
  - connectez-vous avec vos identifiants,
  - fermez la fenêtre,
  - revenez sur FabScan,
  - cliquez sur **Renvoyer le QR Code**.
7. Si vous êtes déjà connecté au service CAS :
  - un e-mail pré-rédigé s'ouvre,
  - collez le QR code dans le corps du message (**Ctrl+V** ou clic droit > Coller),
  - envoyez l'e-mail.

Voir aussi : [9. Onglet Inscription](#9-onglet-inscription).

### 10.2 Consultation rapide des statistiques

1. Ouvrir l'onglet **Statistiques**.
2. Déplier **Filtres d'analyse**.
3. Choisir la période et les filtres utiles.
4. Cliquer sur **Appliquer les filtres**.
5. Lire les indicateurs, graphiques et tableau des dernières entrées.

Voir aussi : [8. Onglet Statistiques](#8-onglet-statistiques).

\newpage

## 11. Déroulement d'une entrée au FabLab

Deux modes d'enregistrement existent : **manuel** et **automatique**.

### 11.1 Mode manuel

1. Aller dans l'onglet **Scanner**.
2. Saisir au minimum : motif de visite + zone de travail.
3. Inviter l'utilisateur à scanner sa carte ou son QR code.
4. Vérifier le profil et les certifications machine nécessaires.
5. Cliquer sur **Valider l'entrée**.

![Extrait Scanner avec utilisateur identifié](images/80_scanned.png)

### 11.2 Mode automatique

Activer **Mode automatique** depuis **Accueil** ou **Scanner**.

![Mode automatique](images/81_modeauto.png)

Comportement :

- la zone de validation se grise,
- chaque badge scanné est comptabilisé automatiquement,
- les informations détaillées (zone, motif) ne sont pas demandées.

---

## 12. Procédures liées

### 12.1 Filtrer les statistiques

![Menu de filtrage](images/85_filtrage.png)

1. Déplier **Filtres d'analyse**.
2. Choisir période + filtres complémentaires.
3. Cliquer sur **Appliquer les filtres** ou **Actualiser**.

![Statistiques affichées](images/88_statsplus.png)

### 12.2 Exporter des données

- Depuis **Statistiques** : export des entrées filtrées.
- Depuis **Comptabilité** : export des transactions filtrées.

Vérifier le dossier **Téléchargements** après export.

---

## 13. FAQ

### 13.1 L'application fonctionne-t-elle sans Internet ?

Oui, pour les usages principaux. Internet reste recommandé, notamment pour l'envoi de QR code.

### 13.2 Un utilisateur vous demande de renvoyer son QR code : que faire ?

Ouvrir l'onglet **Utilisateurs**, rechercher la personne concernée, puis cliquer sur **Envoyer le QR**. Le client de messagerie de l'établissement s'ouvre automatiquement. Si vous n'êtes pas connecté au service CAS, connectez-vous puis relancez l'action depuis FabScan.

Voir aussi : [10.1 Inscription d'un utilisateur (procédure rapide)](#101-inscription-dun-utilisateur-procédure-rapide).

### 13.3 Un utilisateur n'a ni badge ni QR code : que faire ?

Utiliser la recherche par nom/prénom dans **Scanner** ou l'inscrire via **Inscription** s'il n'existe pas encore.

### 13.4 Peut-on annuler la suppression d'un utilisateur ?

Non. La suppression est irréversible.

### 13.5 Pourquoi une entrée apparaît en rouge dans certains tableaux ?

Cela correspond à un enregistrement en mode automatique (selon la configuration d'affichage).

### 13.6 Où sont enregistrés les exports CSV ?

Dans le dossier **Téléchargements** de l'ordinateur utilisé.

---

## 14. Checklist avant export PDF / impression

Utiliser cette liste avant diffusion :

- [ ] Vérifier que toutes les images sont présentes et lisibles.
- [ ] Vérifier que les liens internes de la table des matières fonctionnent.
- [ ] Vérifier les captures d'écran (cohérence avec la version actuelle de l'interface).
- [ ] Vérifier l'orthographe des intitulés de boutons.
- [ ] Vérifier les noms de fichiers d'export CSV.
- [ ] Exporter en PDF puis contrôler la lisibilité à 100 % de zoom.
- [ ] Faire un test d'impression (A4, marges standard) sur 2 à 3 pages représentatives.

---

## Annexe - Actions de mise en forme encore possibles

Si vous souhaitez améliorer encore la version imprimée :

- ajouter des encadrés visuels de type "Attention" / "Astuce",
- numéroter explicitement les captures d'écran dans les légendes,
- ajouter des repères visuels sur les captures (flèches, cercles, zones colorées),
- adapter les sauts de page selon l'outil de conversion PDF utilisé.
