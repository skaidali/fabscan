# TODO

[ ] Images : mettre des éléments en surbrillance et les numéroter
[ ] Images : mettre en situation réelle où les bases de données sont pleines à craquer 
[ ] Faire une FAQ

# Introduction

Cette documentation a pour objet de présenter le fonctionnement de l'application Web **FabScan** et les différentes fonctionnalités qu'elle contient.

Dans la suite du document, nous nous référerons à :
- le **FabLab**, qui désigne l'emplacement physique où se situe le dispositif **FabScan**. (*Voir la page [Wikipédia](https://fr.wikipedia.org/wiki/Fab_lab) pour plus de précisions.*)
- l'**Application**, qui désigne l'interface Web du dispositif.
- le **Personnel**, ou « Vous », ici considéré comme un.e gestionnaire de FabLab, qui utilise l'Application et à qui cette documentation s'adresse.
- l'**Utilisateur**, qui désigne un.e membre (externe au Personnel) qui utilise les installations du FabLab.
- le **Mode d'Identification**, qui désigne l'élément que l'Utilisateur va pouvoir utiliser pour s'identifier :
    - soit un QR code sur le téléphone de l'Utilisateur,
    - soit une carte multiservice (resp. carte étudiante, resp. carte de personnel resp. badge) en possession de l'Utilisateur.

# Prérequis
A partir de cette section, nous nous plaçons dans le cas où le Personnel vient de s'installer à son poste de travail au FabLab et souhaite utiliser l'Application. 
Le Personnel doit donc :
- allumer l'ordinateur sur lequel l'Application est installée et s'assurer qu'une connexion internet est disponible. 
- double-cliquer sur l'icône "FabScan" disponible sur le bureau. La fenêtre du terminal (fond noir) s'ouvre. Patienter jusqu'à ce que l'Application se lance automatiquement dans le navigateur par défaut. La page d'accueil de l'Application s'ouvre. L'Application est alors prête à être utilisée.

*Note liminaire :*
La connexion internet n'est pas indispensable pour le fonctionnement de l'Application, mais reste recommandée pour une utilisation optimale de l'ensemble des fonctionnalités, notamment pour la rubrique \ref{ref:Inscription_QR}. En cas de perte de connexion, l'Application continuera de fonctionner.

# Présentation de l'interface
*L'interface est conçue pour être intuitive et facile à utiliser, même pour les personnes qui ne sont pas familières avec les technologies numériques. Chaque onglet est décrit en détail dans les sections suivantes. La description se fera graduellement de haut en bas et accompagnée de captures d'écran.*

L'Application est composée de plusieurs onglets, chacun correspondant à une fonctionnalité spécifique. Ces onglets sont accessibles via la barre de navigation située en haut de la page. L'onglet *Accueil* est celui qui s'affiche par défaut à l'ouverture de l'Application.

Les onglets sont les suivants : *Accueil*, *Scanner*, *Utilisateurs*, *Comptabilité*, *Statistiques* et *Inscription*.
L'onglet actif est mis en évidence par un fond coloré.

## Onglet « Accueil »

Onglet par défaut de l'Application, il se charge à chaque nouveau lancement de l'Application.
 
![Extrait de l'onglet « Accueil »](./images/1_pageaccueil.png)

L'*Accueil* se présente de la manière suivante :
- Le titre de l'onglet ("Tableau de bord") est affiché à gauche de la page. Un bouton cliquable "Mode Manuel" ainsi que la date et l'heure sont affichées à droite de l'écran.
Lorsque le bouton "Mode Manuel" est cliqué, il bascule sur "Mode Automatique" et inversement. Le mode automatique est expliqué dans la section \ref{ref:Mode_Automatique}.
- Des statistiques générales sur l'activité du FabLab sont affichées par la suite. Ces statistiques incluent : le nombre total d'entrées sur la dernière heure à compter de l'heure actuelle, le nombre d'entrées sur sur la date du jour, et le nombre d'utilisateurs inscrits au FabLab. Ces statistiques sont mises à jour en temps réel. Pour plus de détails sur les statistiques, veuillez vous référer à la section \ref{ref:Statistiques}.
- Un tableau récapitulatif des dernières entrées est affiché en bas de la page. Il contient les informations suivantes : l'heure d'entrée en vert, le nom et le prénom de l'Utilisateur, son statut, la zone de travail utilisée, le projet associé à l'entrée. Ce tableau est mis à jour en temps réel. Si l'entrée a été enregistrée en mode automatique, l'heure d'entrée sera affichée en rouge. Il est possible d'accéder à la fiche de l'Utilisateur en cliquant sur son nom. Pour plus de détails sur les entrées, veuillez vous référer à la section \ref{ref:Scanner}.

## Onglet « Scanner »


En cliquant sur l'onglet « Scanner », vous accédez à l'interface de gestion des entrées au FabLab. Cet onglet vous permet de scanner les badges (carte multiservice) ou QR codes des Utilisateurs et d'enregistrer leurs entrées dans la base de données.

![Extrait de l'onglet « Scanner »](./images/2_pagescan.png)

La page de l'onglet « Scanner » se compose de deux parties principales : 
- à gauche: la zone d'affichage des informations de l'Utilisateur scanné ;
- à droite: la zone de saisie des informations de l'Utilisateur ;

Un bouton "Mode Automatique" est disponible en haut à droite de l'onglet. Il permet de basculer entre le mode manuel et le mode automatique pour l'enregistrement des entrées. Le mode automatique est expliqué dans la section \ref{ref:Mode_Automatique}.

A gauche :
Une barre de recherche est d'abord disponible en haut de la zone pour retrouver un Utilisateur par son nom ou son prénom, si l'Utilisateur n'a sur lui ni badge ni QR code.
Dans le cas très récurrent où un Utilisateur présente un QR code plutôt qu'un badge, il convient de cliquer sur le champ de saisie prévu à cet effet, puis de scanner le QR code avec le scanner. Le scan remplit la barre de recherche avec un identifiant unique de l'Utilisateur (et non son nom ou prénom).
Lorsqu'un champ (identifiant OU nom OU prénom) est rempli dans la barre de recherche, une ou plusieurs suggestions d'Utilisateur s'affichent en dessous. Il est possible de cliquer sur l'Utilisateur recherché pour afficher ses informations dans le cadre "Profil scanné".

Le cadre "Profil scanné" affiche les informations de l'Utilisateur identifié.
Lorsqu'un utilisateur n'est pas encore identifié, elle est "En attente de scan..." et les informations de l'Utilisateur ne sont pas affichées.
Les informations accessibles sont : 
- le prénom, le nom.
- le statut
- le solde (se référer à la section \ref{ref:Comptabilite} pour plus de détails sur le solde)
- la carte RFID (associée ou non à l'Utilisateur)
- les certifications machines (associées ou nonà l'Utilisateur)


A droite : 
Un cadre Validation de l'entrée est disponible. Il contient les champs suivants :
- un menu déroulant pour sélectionner le motif de la visite (obligatoire)
- un menu déroulant pour sélectionner la zone de travail (obligatoire)
- un champ de texte pour saisir un commentaire (optionnel)
- un bouton "Valider l'entrée" pour enregistrer l'entrée de l'Utilisateur dans la base de données.



## Onglet « Utilisateurs »

Cet onglet sert à l'affichage, la recherche, gestion des informations des différents Utilisateurs présents dans la base de données. 

![Extrait de l'onglet « Utilisateurs »](./images/4_pageusers.png)

L'onglet « Utilisateurs » se compose de deux parties principales :
- à gauche : la zone d'affichage des informations de l'Utilisateur sélectionné ;
- à droite : la zone de recherche et le tableau des Utilisateurs ;

Un bouton "Ajouter un Utilisateur" est disponible en haut à droite de l'onglet. Il permet d'accéder à l'onglet « Inscription » pour créer un nouveau profil d'Utilisateur. L'onglet « Inscription » est expliqué dans la section \ref{ref:Inscription}.

A gauche :
Lorsqu'un Utilisateur est sélectionné dans le tableau de droite, ses informations s'affichent dans le cadre "Profil Utilisateur". Toutes les informations connues y apparaissent et sont modifiables depuis ce cadre. On y voit :
- le QR code de l'Utilisateur associé à son identifiant unique;
- les informations de base : le prénom, le nom, l'e-mail et le statut de l'Utilisateur ;
- l'identifiant de la carte RFID associée à l'Utilisateur (si elle existe). Il est possible de retirer la carte (en cliquant sur l'icône corbeille) ou d'en associer une nouvelle (en cliquant sur Modifier la carte). Le bouton "Modifier la carte" permet également d'associer une carte RFID à l'Utilisateur s'il n'en a pas encore. Il est important de ne pas oublier de sauvegarder les modifications après avoir associé une nouvelle carte.
- les certifications machines associées à l'Utilisateur (si elles existent). Il est possible de cocher ou décocher les certifications machines pour l'Utilisateur. Il est important de ne pas oublier de sauvegarder les modifications après avoir modifié les certifications machines.
- Un bouton Sauvegarder pour enregistrer les modifications apportées aux informations de l'Utilisateur.
- Un bouton "Envoyer le QR" pour renvoyer le QR code à l'Utilisateur par e-mail. La procédure d'envoi du QR code est expliquée dans la section \ref{ref:Envoyer le QR}.
- Un bouton rouge "Supprimer cet utilisateur" pour supprimer l'Utilisateur de la base de données. La suppression d'un Utilisateur est irréversible et nécessite une confirmation avant d'être effectuée. Cette confirmation apparaît sous la forme d'une fenêtre pop-up demandant au Personnel de confirmer la suppression. Il est important de noter que la suppression d'un Utilisateur entraîne la perte de toutes les informations associées à ce profil. Les entrées sont affectées dans la mesure où le nom et prénom sont supprimés, mais le statut est conservé. Une entrée précédent la suppression d'un Utilisateur sera tout de même comptabilisée, le nom et prénom seront remplacés par "Membre supprimé". Les paiements ne sont en revanche pas affectés par la suppression d'un Utilisateur. Une transaction d'un Utilisateur supprimé sera quand même affichée et ses informations seront conservées.
- L'historique des paiements de l'Utilisateur, qui permet de consulter les dernières transactions liées à cet Utilisateur. L'historique des paiements est expliqué dans la section \ref{ref:Comptabilite}.

A droite
La table des Utilisateurs affiche la liste de tous les Utilisateurs présents dans la base de données. Il est possible de rechercher un Utilisateur par son nom, prénom ou e-mail grâce à la barre de recherche située en haut du tableau. Il est également possible de filtrer les Utilisateurs par statut grâce au menu déroulant situé à côté de la barre de recherche. Le tableau affiche les informations suivantes pour chaque Utilisateur : le prénom, le nom, et le statut. Il est possible de cliquer sur un Utilisateur pour afficher ses informations dans le cadre "Profil Utilisateur" à gauche dont la description est donnée ci-dessus.
Deux boutons "Précédent" et "Suivant" sont disponibles en bas du tableau pour naviguer entre les pages de la liste des Utilisateurs. Le nombre d'Utilisateurs affichés par page est limité à 20.


## Onglet « Comptabilité »

Cet onglet vous permet de gérer les transactions financières des Utilisateurs. Vous pouvez enregistrer des paiements, ajouter un montant (calculé en équivalent Matériau) au solde d'un Utilisateur, ou encore consulter l'historique des transactions d'un Utilisateur ou d'un Projet.



![Extrait de l'onglet « Comptabilité »](images/11_compta.png)

L'onglet « Comptabilité » se compose de deux parties principales, assez similaires à l'onglet « Scanner » ; ainsi qu'une troisième partie en bas de page :
- à gauche : la zone d'affichage des informations de l'Utilisateur sélectionné ;
- à droite : la zone de saisie des informations de l'Utilisateur et d'enregistrement des transactions.
- en bas de page : l'historique des transactions, qui permet de consulter les dernières transactions enregistrées dans la base de données.

Une barre de recherche est disponible en haut de la zone de gauche pour retrouver un Utilisateur par son nom ou son prénom, si l'Utilisateur n'a sur lui ni badge ni QR code. Dans le cas très récurrent où un Utilisateur présente un QR code plutôt qu'un badge, il convient de cliquer sur le champ de saisie prévu à cet effet, puis de scanner le QR code avec le scanner. Le scan remplit la barre de recherche avec un identifiant unique de l'Utilisateur (et non son nom ou prénom). Lorsqu'un champ (identifiant OU nom OU prénom) est rempli dans la barre de recherche, une ou plusieurs suggestions d'Utilisateur s'affichent en dessous. Il est possible de cliquer sur l'Utilisateur recherché pour afficher ses informations dans le cadre "Profil sélectionné".

A gauche :
Le cadre "Profil sélectionné" affiche les informations de l'Utilisateur identifié. Lorsqu'un utilisateur n'est pas encore identifié, elle est "En attente..." et les informations de l'Utilisateur ne sont pas affichées.
Les informations accessibles sont :
- le prénom, le nom.
- le statut
- le solde (se référer à la section \ref{ref:Comptabilite} pour plus de détails sur le solde)
- l'e-mail de l'Utilisateur
- l'information si l'Utilisateur possède une carte RFID associée ou non
- Les dernières transactions de l'Utilisateur, avec le nom de la transaction, la date, le projet lié à la transaction (si applicable), et le montant de la transaction.

A droite :
Un formulaire de saisie est disponible pour enregistrer une nouvelle transaction pour l'Utilisateur sélectionné. Le formulaire contient les champs suivants :
- le nom de l'opération (obligatoire)
- le numéro d'opération (optionnel) - très souvent lié à des opérations bancaires internes à l'établissement.
- une description (optionnelle)
- Un menu déroulant pour sélectionner le type de projet (obligatoire). Par défaut, le type de projet est "Aucun projet". Si un projet est sélectionné, il est possible de saisir le nom du projet (obligatoire) et le responsable du projet (optionnel). Le nom du projet peut-être un nom ou un numéro de projet. Le champ "Nom du projet" est muni (comme pour la barre de recherche d'un Utilisateur) d'une fonctionnalité de recherche pour retrouver un projet existant dans la base de données, si un projet a déjà été entré auparavant. 
Dans le cas où le projet a déjà été entré auparavant, il est possible de le sélectionner dans la liste de suggestions qui s'affiche. Le responsable de projet est alors automatiquement rempli. Le responsable du projet peut être un nom et/ou un prénom.
- Type de mouvement (obligatoire) : Crédit ou Débit. Le type de mouvement détermine si le montant saisi sera ajouté ou retiré du solde de l'Utilisateur. 
Dans le cas d'un mouvement de type Crédit (Ajout), il est possible de sélectionner un matériau (optionnel), une quantité ou un poids (obligatoire si matériau choisi), et le prix est calculé automatiquement en fonction du matériau et de la quantité/poids saisis. Le prix est affiché en temps réel dans le formulaire dans le champ suivant "Montant final de l'opération".
Dans le cas d'un mouvement de type Débit (Retrait), il est possible de sélectionner un matériau (optionnel), une quantité ou un poids (obligatoire si matériau choisi), et le prix est calculé automatiquement en fonction du matériau et de la quantité/poids saisis. Le prix est affiché en temps réel dans le formulaire dans le champ suivant "Montant final de l'opération"
- Le champ Montant final de l'opération est affiché en temps réel dans le formulaire. Il est calculé automatiquement en fonction du type de mouvement, du matériau et de la quantité/poids saisis. Le montant final de l'opération est affiché en euros (€) avec deux décimales. Il est possible de saisir un montant directement dans le champ "Montant final de l'opération" si le type de mouvement est Crédit (resp. Débit). Dans ce cas, le montant saisi sera ajouté (resp. retiré) au solde de l'Utilisateur.
- Un champ de texte pour saisir un commentaire (optionnel)
- Un bouton "Enregistrer l'opération" pour enregistrer la transaction dans la base de données. Si le formulaire n'est pas correctement rempli, un message d'erreur s'affiche et la transaction n'est pas enregistrée. Si le formulaire est correctement rempli, la transaction est enregistrée et l'historique des transactions de l'Utilisateur est mis à jour.

En bas de page :
L'historique des transactions affiche les dernières transactions enregistrées dans la base de données. 

Dans le tableau de l'historique des transactions :

Il est possible de filtrer les transactions par type de projet.
Il est également possible de filtrer les transactions par nom de projet grâce à la barre de recherche située en haut du tableau. Après avoir saisi le nom du projet, il est nécessaire de cliquer sur le bouton "Rechercher" pour appliquer le filtre. Le bouton "Réinitialiser les filtres" permet de retirer le filtre et d'afficher toutes les transactions.
Le tableau affiche les informations suivantes pour chaque transaction : la date, le nom de l'Utilisateur, le type de Projet, le nom du Projet (ou le numéro), le montant, le type de mouvement, et le nom de l'opération. Il est possible de cliquer sur une transaction pour afficher ses détails (et donc l'ensemble des information recueillies) dans un panneau latéral. Le panneau latéral peut être retiré en cliquant sur le bouton "Fermer" en haut à droite du panneau. 

Un bouton "Exporter l'historique" est disponible pour exporter l'historique des transactions au format CSV (lisible sur LibrOffice, Excel, etc.). Le fichier CSV contient toutes les informations enregistrées pour chaque transaction. Les informations sont les suivantes : Date, Heure,	Nom,	Prénom,	Nom de l'Opération,	N° Opération,	Moyen de paiement,	Nom du Projet,  Type de Projet,	Tuteur	, Matériau	, Quantité	, Type de Mouvement	(Crédit ou Débit), Montant,	Description,	Commentaire. Les filtres appliquées dans l'historique des transactions sont également appliqués à l'exportation. Le fichier CSV est enregistré dans le dossier "Téléchargements" de l'ordinateur utilisé pour accéder à l'Application sous le nom "Transactions_FabLab.csv".











## Onglet « Statistiques »

L'onglet « Statistiques » vous permet d'obtenir une vue d'ensemble de l'activité du FabLab sur une période donnée (jour, semaine, mois, année). Il est conçu pour vous aider à analyser la fréquentation du FabLab, en fournissant des données détaillées sur les entrées, les profils d'utilisateurs et les passages récents.
Toutes les données affichées dans cet onglet sont basées sur les entrées enregistrées dans la base de données, que ce soit en mode manuel ou automatique. Il est donc important de s'assurer que toutes les entrées sont correctement enregistrées pour obtenir des statistiques précises.


![Extrait de l'onglet « Statistiques »](images/6_pagestats.png)

L'onglet « Statistiques » se compose de quatre sections, chacune offrant des fonctionnalités spécifiques pour analyser les données d'entrée au FabLab :
1. La première section, située en haut de la page, est la zone **Filtres d’analyse** sur laquelle il faut cliquer pour dérouler l'ensemble des filtres. Elle permet de sélectionner la période que vous souhaitez analyser et d'appliquer des filtres supplémentaires pour affiner les résultats. Par défaut, aucun filtre n'est appliqué et la période sélctionné est celle des 7 derniers jours. Vous avez à votre disposition deux types de filtres :
- Filtres liés à la visite : par période d'activité, zone de travail, motif de visite, mode d'enregistrement.
- Filtres liés aux caractéristiques de l'Utilisateur : par statut, certification machine.

Il est possible d'appliquer un seul filtre ou de combiner plusieurs filtres pour obtenir des statistiques plus précises. Par exemple, vous pouvez choisir d'afficher uniquement les entrées des membres ayant une certification machine spécifique sur une période donnée.
Afin d'afficher les statistiques correspondant à vos filtres, il est nécessaire de cliquer sur le bouton **Appliquer les filtres**. Les données affichées dans les sections suivantes seront alors mises à jour en fonction des filtres sélectionnés.
Si vous souhaitez revenir à l'affichage initial, il est possible de cliquer sur le bouton **Réinitialiser**. Cela supprimera tous les filtres appliqués et affichera les statistiques globales pour la période sélectionnée.

2. La deuxième section, située au centre de la page, est composée de trois blocs d’indicateurs clés : le nombre d’entrées aujourd'hui, les entrées sur la période sélectionnée, et le nombre de membres total correspondants. Ces indicateurs vous donnent une lecture rapide de l’activité du FabLab sur la période sélectionnée. 
Tous les indicateurs sont mis à jour lors de l'application des filtres. Si aucun filtre n'est appliqué, les indicateurs affichent les statistiques globales pour la période sélectionnée. Le filtre "Période d'activité" n'a aucun incidence sur le premier indicateur "Entrées aujourd'hui", qui est toujours calculé sur la journée en cours.

3. La troisième section, située sous les indicateurs clés, est le bloc **Activités**.
Il affiche à gauche un histogramme représentant l’évolution des passages au FabLab sur la période sélectionnée. L’axe horizontal représente le temps tandis que l’axe vertical indique le nombre d’entrées. Sur chaque barre de l'histogramme, le nombre affiché en bas est le nombre d'entrées. Pour connaître la date (ou l'heure), il suffit de passer la souris sur la barre correspondante. 
Ce graphique vous permet de visualiser rapidement les tendances d’activité et d’identifier les périodes de forte ou faible fréquentation.
A droite, des statistiques de répartition par profils sont affichées. L'application des filtre a une incidence sur ces statistiques. Elles permettent de connaître le nombre d'Utilisateurs par statut ayant fréquenté le FabLab sur la période sélectionnée. 

4. La quatrième et dernière section, située en bas de la page, est le tableau **Dernières entrées filtrées**. Il affiche les 20 passages les plus récents correspondant à votre recherche. 
Vous y retrouvez la date et l'heure de passage, le nom et prénom, le statut, la zone utilisée et le projet associé à chaque entrée, ce qui permet de vérifier rapidement les derniers mouvements enregistrés. Ce tableau est similaire à celui de l'onglet « Accueil ». Il est donc possible de cliquer sur le nom d'un Utilisateur pour accéder à sa fiche dans l'onglet « Utilisateurs ». Une entrée enregistrée en mode automatique (resp. mode manuel) est signalée par un texte rouge (resp. vert) dans la colonne "Type d'entrée". Le tableau ne se met pas à jour automatiquement lors de nouvelles entrées. Le tableau est mis à jour en temps réel lors de l'application des filtres. Si aucun filtre n'est appliqué, le tableau affiche les 20 dernières entrées globales pour la période sélectionnée.

Enfin, un bouton **Exporter l'historique** est disponible tout en haut de la page pour exporter les données affichées dans le tableau au format CSV (lisible sur LibreOffice, Excel, etc.). Le fichier CSV contient toutes les informations enregistrées pour chaque entrée. Les informations sont les suivantes : Date et Heure, Nom et Prénom, Statut, Zone occupée, Projet, Type d'Entrée. Les filtres appliqués dans le tableau sont également appliqués à l'exportation. Le fichier CSV est enregistré dans le dossier "Téléchargements" de l'ordinateur utilisé pour accéder à l'Application sous le nom "Historique_Entrees_FabLab.csv".
Un bouton **Actualiser** est également disponible pour mettre à jour les données affichées dans le tableau en fonction des filtres appliqués. Il est important de cliquer sur ce bouton pour actualiser les données en cas de nouvelles entrées ou de modifications dans la base de données.


## Onglet « Inscription »

L'onglet « Inscription » vous permet d'inscrire un nouvel Utilisateur dans la base de données du FabLab. Il s'agit de l'un des onglets les plus cruciales et complets de l'Application. Il est important de noter que l'inscription d'un Utilisateur est une étape préalable à son identification et à l'enregistrement de ses entrées au FabLab. 

Cet onglet est accessible depuis l'onglet « Utilisateurs » en cliquant sur le bouton "Ajouter un Utilisateur" ou directement depuis la barre de navigation en haut de la page.

Cet onglet permet de créer la fiche d'un nouvel Utilisateur en renseignant ses informations personnelles et professionnelles. Il est important de remplir correctement tous les champs obligatoires pour garantir que l'Utilisateur puisse être identifié et enregistré correctement lors de ses visites au FabLab.
Il permet également d'importer une base de données d'Utilisateurs depuis un fichier CSV, ce qui est particulièrement utile pour les FabLabs ayant un grand nombre d'Utilisateurs à gérer. L'importation de la base de données est soumise à certaines conditions de normalisation expliquée dans la section \ref{ref:Importation}. Cette fonction n'est pas vouée à être utilisée régulièrement, mais plutôt lors de la mise en place initiale de l'Application ou lors d'une mise à jour majeure de la base de données. 
Il permet également de réaliser une maintenance réglementaire (RGPD) recquise par la CNIL, en supprimant les Utilisateurs qui n'ont pas été actifs depuis un certain temps (5 ans) et en anonymisant les entrées. Cette fonctionnalité est expliquée dans la section \ref{ref:Maintenance}.

L'onglet est composé d'un seul et même bloc, qui contient un formulaire d'inscription. Le formulaire contient les champs suivants :
- le statut (obligatoire) : il s'agit d'un menu déroulant permettant de sélectionner le statut de l'Utilisateur (ex : étudiant, enseignant, personnel, etc.). Le choix du statut est important car il permet d'adapter automatiquement l'adresse e-mail proposée pour l'Utilisateur, afin d'éviter de la saisir manuellement.
- Le prénom (obligatoire) : il s'agit d'un champ de texte permettant de saisir le prénom de l'Utilisateur.
- Le nom (obligatoire) : il s'agit d'un champ de texte permettant de saisir le nom de l'Utilisateur.
- L'adresse e-mail (obligatoire mais pré-remplie) : il s'agit d'un champ de texte pré-rempli contenant l'adresse e-mail de l'Utilisateur. Si le statut de l'Utilisateur est sélectionné, l'adresse e-mail est automatiquement proposée en fonction du statut choisi. Il est possible de modifier cette adresse e-mail si nécessaire.
- Le motif de la visite (obligatoire) : il s'agit de bulles à sélectionner permettant de choisir le motif de la visite de l'Utilisateur. Les motifs disponibles sont les mêmes que ceux proposés dans l'onglet « Scanner ».
- Un bouton "Associer la carte" (facultatif) permettant d'associer une carte RFID à l'Utilisateur. Il est possible de cliquer sur ce bouton pour faire passer la carte sur le boîtier et l'associer à l'Utilisateur. Si l'Utilisateur n'a pas de carte, il est possible de laisser ce champ vide.
- Un bouton "Enregistrer l'utilisateur" permettant de valider l'inscription de l'Utilisateur dans la base de données. Il est important de vérifier que tous les champs obligatoires sont correctement remplis avant de cliquer sur ce bouton. Une erreur s'affichera si un champ obligatoire n'est pas rempli ou si l'Utilisateur existe déjà dans la base de données du FabLab.
En cliquant sur "Enregistrer l'utilisateur", une fenêtre pop-up s'affiche et ouvrira le client de messagerie de l'établissement (dans notre cas Zimbra de l'Ecole Centrale de Lyon) pour envoyer un e-mail à l'Utilisateur avec son QR code d'identification. Il est important de vérifier que l'adresse e-mail de l'Utilisateur est correcte avant d'envoyer le QR code. Vous pouvez fermer la fenêtre pop-up après avoir envoyé l'e-mail. Cette fenêtre est indépendant de l'Application et n'a aucun effet sur son fonctionnement. Il est donc possible de fermer la fenêtre pop-up sans envoyer l'e-mail, mais il est fortement recommandé d'envoyer le QR code à l'Utilisateur pour qu'il puisse s'identifier lors de ses prochaines visites au FabLab.
La procédure d'envoi du QR code est délicate, sans être complexe, il faut donc bien respecter les étapes décrites dans la section \ref{ref:Envoyer le QR} pour s'assurer que l'Utilisateur reçoit correctement son QR code.
En revenant sur l'Application, un message de confirmation s'affiche pour indiquer que l'Utilisateur a été correctement enregistré dans la base de données. Il est possible de cliquer sur "Renvoyer le QR Code" si besoin afin de relancer la procédure citée ci-dessus. Il est également possible de cliquer sur le bouton "Inscription suivante" pour fermer ce message et inscrire un autre Utilisateur si nécessaire.

Un bouton "Importer un fichier Excel historique (.xlsx)" est disponible en bas de l'onglet. Il permet d'importer une base de données d'Utilisateurs depuis un fichier Excel. Lors du clic, la fenêtre de l'Explorateur de fichier s'ouvre afin de sélectionner le fichier Excel à importer. Cette fonctionnalité est expliquée dans la section \ref{ref:Importation}.

Enfin, un bouton "Maintenance réglementaire" est disponible en bas de l'onglet. Il permet de supprimer les Utilisateurs qui n'ont pas été actifs depuis un certain temps (5 ans) et d'anonymiser les entrées. Cette fonctionnalité est expliquée dans la section \ref{ref:Maintenance}. Lors d'un clic sur cette section, un bouton rouge "Lancer la maintenance annuelle" apparaît. Ce bouton a une action irreversible sur la base de données. Il est donc naturellement sécurisé par deux fenêtres pop-up demandant au Personnel de confirmer l'action avant de la lancer. Une identification par mot de passe est également demandée pour s'assurer que l'action est bien réalisée par un membre du Personnel autorisé. Cette identification est indépendante de l'Application et n'a aucun effet sur son fonctionnement, elle est réalisée par le système d'authentification Windows de l'ordinateur utilisé pour accéder à l'Application.



Lorsqu'un Utilisateur entre au FabLab et ne s'est pas encore identifié pour la première fois (i.e. n'est pas présent dans la base de données), il vous faudra l'inscrire en utilisant l'onglet Inscription. Cet ongleet vous permet de créer sa fiche en renseignant ses informations rapidement, afin qu’il soit reconnu lors de ses prochaines visites.

![Extrait de l'onglet « Inscription »](./images/7_pageinscrip.png)

1. Commencez par choisir son **statut** dans le menu déroulant. Ensuite, renseignez son **prénom** et son **nom** dans les zones de texte. Choisissez ensuite le **motif de la visite** (comme pour l'onglet « Scanner »).
(*PS: le choix du statut sert aussi à adapter automatiquement l’adresse e-mail proposée, pour éviter de la saisir à la main.*)

2. Si l'Utilisateur doit utiliser une carte d’accès physique, cliquez sur **Associer la carte** puis faites passer le badge. La carte sera liée à l'Utilisateur, ce qui facilitera ses futurs passages. 

3. Laissez l’option **Envoyer le QR code par email** cochée si vous souhaitez que la personne reçoive un QR code par e-mail. (Ceci peut être un mode d'Identification en plus de la carte physique.)

4. Une fois que toutes les informations ont été vérifiées, cliquez sur **Enregistrer l’utilisateur** pour valider l’inscription.


# Déroulement d'une entrée au FabLab
Deux possibilités s’offrent à vous pour enregistrer l’entrée d’un Utilisateur au FabLab : le **Mode manuel** et le **Mode automatique**. Le mode manuel est celui par défaut, mais vous pouvez basculer sur le mode automatique en cliquant sur le bouton « Mode Automatique » situé en haut à droite de l’onglet « Accueil » ou « Scanner ».

## Mode manuel
Lorsqu’un Utilisateur entre au FabLab, il faudra basculer sur l’onglet « Scanner » ; la page suivante s’affiche :
1. Demander à l'Utilisateur les informations suivantes, que vous renseignerez dans les listes déroulantes : **un motif de visite** ainsi qu'une **zone de travail** dans laquelle l’Utilisateur souhaite travailler.

Le motif de la visite ainsi que la zone de travail sont des champs obligatoires. Le commentaire est optionnel ; vous pouvez le renseigner grâce à la zone de texte prévue à cet effet. 

2. Inviter l’Utilisateur à passer sa **Carte** sur le boîtier. Lorsque la carte est détectée, la fiche de l’Utilisateur s’affichera sur le côté gauche de l’écran, comme suit : 

![Extrait de l'onglet « Scanner » quand un Utilisateur a été identifié](images/80_scanned.png)

3. Avant de valider l’entrée, s’assurer que l’Utilisateur possède bien les **Certifications Machine** nécessaires à l’utilisation des machines relatives à la zone de travail donné par l’Utilisateur. Une fois que les champs sont entrés, cliquer sur le bouton « Valider l’entrée ».

## Mode automatique

En cliquant sur la boîte **Mode automatique**, vous pouvez activer le mode automatique. Il est assez simple de voir si ce mode est activé par le fait que la partie **Validation de l'entrée** se grise. 

![Mode automatique](images/81_modeauto.png)

Dans ce mode, vous n'avez pas à renseigner les informations des Utilisateurs. Chaque badge scanné est comptabilisé dans la base de données sans information complémentaire sur la zone de travail ou le motif de visite.


1. Commencez par ouvrir la zone **Filtres d’analyse** si elle est repliée, puis choisissez la **période** que vous souhaitez observer avec le menu dépliant : aujourd’hui, les 7 derniers jours, les 30 derniers jours ou les 12 derniers mois. Vous pouvez ensuite préciser la **zone de travail**, le **motif de visite**, le **statut** ou même une **certification machine**.

![Menu de filtrage](images/85_filtrage.png)

2. Une fois vos filtres définis, cliquez sur **Appliquer les filtres** ou **Actualiser** pour mettre les données à jour. Les indicateurs en haut de page vous donnent alors une lecture rapide du nombre d’entrées sur la période, du volume observé et du nombre de membres correspondants.

![Statistiques affichées](images/88_statsplus.png)

3. Le bloc **Activité temporelle** vous montre l’évolution des passages sur la période sélectionnée. Il est utile pour repérer les journées plus calmes, les pics d’activité ou l’effet d’un événement particulier au FabLab. 

4. La section **Répartition par profils** vous aide à voir quels types d’utilisateurs fréquentent le plus le lieu. C’est pratique pour comprendre si le FabLab attire surtout certains statuts, et d'une manière plus poussée pour adapter l’accueil ou les créneaux d’ouverture.

5. Le tableau **Dernières entrées filtrées** affiche les 20 passages les plus récents correspondant à votre recherche. Vous y retrouvez le nom, le profil, la zone utilisée et le projet associé à chaque entrée, ce qui permet de vérifier rapidement les derniers mouvements enregistrés. 

6. Le bouton **Réinitialiser** vous permet de revenir à l’affichage initial (le même que quand vous arrivez sur l'onglet). Le bouton **Exporter l'historique** sert à télécharger les données en format `.csv` pour les exploiter dans un tableur ou les intégrer à un compte-rendu.
