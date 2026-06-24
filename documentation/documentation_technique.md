# Documentation Technique - FabScan
<table style="width: 100%; border: none; border-collapse: collapse;">
  <tr>
    <td style="width: 60%; vertical-align: top; border: none; padding-right: 20px;">
      <strong>Version du document :</strong> 23/06/2026<br>
      <strong>Public cible :</strong> Toute personne souhaitant modifier notre
travail<br>
      <strong>Objet :</strong> Notice de code
    </td>
    <td style="width: 40%; vertical-align: top; border: none; border-left: 1px solid #ddd; padding-left: 20px; text-align: left;">
      <small>
        <strong>Réalisé par l'équipe du PE-63 :</strong><br>
        Skander Kaidali, Marceau Cottin, Hévan Rehel, Gabriel Sokolowski, Zaccary Nebout
      </small>
    </td>
  </tr>
</table>

---

## 1. Architecture du système

L'application repose sur une architecture simple composée de trois briques principales :

### Frontend (Client)
Une application monopage (SPA) développée en HTML5, CSS3 et JavaScript moderne. Elle ne nécessite pas de compilateur ou de framework complexe (React/Vue), ce qui facilite sa modification directe. La communication avec le serveur se fait exclusivement via des appels asynchrones (Fetch API).

### Backend (Serveur)
Un serveur Python léger utilisant la bibliothèque standard `http.server`. Il fait office de serveur de fichiers statiques pour le frontend et de serveur API pour les données. Il centralise la logique métier et les interactions avec la base de données.

### Acquisition (Matériel)
Une passerelle logicielle qui fait le pont entre le monde physique (lecteurs RFID via Arduino) et le monde numérique (API Web). Elle transforme les signaux série en requêtes HTTP.

<BR>

## 2. Structure des fichiers et rôles des scripts

### Racine du projet
- `start.bat` : Script de lancement principal pour Windows. Il installe les dépendances, démarre le serveur, lance le script d'acquisition et ouvre le navigateur.

### Dossier `/server`
- `serveur.py` : Le point d'entrée. Il configure le `RequestHandler` pour servir le dossier `/client` et redirige les requêtes commençant par `/api` vers `routes_api.py`.
- `routes_api.py` : Le contrôleur de routage. Il définit les endpoints GET (stats, users, config) et POST (scan, add_user, add_payment). Il extrait les données des requêtes et appelle les fonctions de `gestionnaires.py` ou `sql_request.py`.
- `gestionnaires.py` : Le moteur de logique métier. Il contient les algorithmes complexes (calcul des statistiques, import Excel avec détection de doublons, génération de QR codes).
- `sql_request.py` : La couche d'accès aux données. Il contient toutes les requêtes SQL brutes et gère les migrations de schéma de la base SQLite.
- `traitementQR.py` : Script utilitaire pour la gestion historique des QR codes sur disque. Le script n'est pas utilisé par les dernières versions du code, mais peux toujours servir.

### Dossier `/client`
- `index.html` : Structure de base de l'application (Header, Navigation, Conteneur principal).
- `index.js` : Le routeur frontend. Il charge dynamiquement les fichiers HTML du dossier `views/` dans le conteneur principal en fonction de l'ancre URL (`#home`, `#scan`, etc.).
- `assets/js/moteurScan.js` : **Script critique.** Il unifie les trois modes d'identification : lecture RFID (polling API), scannette QR (écouteur clavier rapide) et recherche manuelle (datalist dynamique).
- `assets/js/[page].js` : Chaque page possède son script dédié (ex: `home.js`, `bills.js`) contenant une fonction `init[Page]Page()` appelée par le routeur.

### Dossier `/database`
- `config.json` : Cœur de la configuration. Définit les statuts (1A, 2A, etc.), les zones de travail, les motifs d'entrée et les tarifs des matériaux.
- `database.db` : La base de données SQLite (générée automatiquement au premier lancement).

### Dossier `/acquisition`
- `data_treatment.py` : Script Python qui lit les données série de l'Arduino et effectue un POST vers `/api/scan`.

<BR>

## 3. Fonctions clés et logique métier

### Identification utilisateur (`moteurScan.js`)
La fonction `ecouter` configure des écouteurs globaux. Elle distingue une saisie clavier humaine d'une scannette QR en mesurant le temps entre deux frappes (seuil de 40ms). Si les frappes sont trop rapides, elles sont traitées comme un code QR.

### Importation Excel (`gestionnaires.py` -> `import_users_excel_logic`)
Cette fonction traite des fichiers Excel complexes. Elle utilise `difflib.SequenceMatcher` pour détecter les doublons même si l'orthographe du nom varie légèrement (ratio de similarité > 0.85). Elle nettoie également les accents pour générer des adresses e-mail standardisées.

### Système de paiement (`sql_request.py` -> `add_payment`)
La fonction gère la double écriture : elle enregistre une ligne dans la table `PAIEMENTS` et met à jour simultanément le champ `montant` dans la table `UTILISATEURS` si le mouvement est de type "CREDIT" ou un débit sur solde.

### Statistiques dynamiques (`gestionnaires.py` -> `get_stats_logic`)
Génère des données agrégées pour les graphiques. Elle utilise des fonctions SQL `strftime` pour grouper les entrées par heure, jour ou mois selon la période demandée par l'utilisateur.

<BR>
<BR>

## 4. Guide de modification

### Modifier l'interface utilisateur
1. Pour changer le style global : éditez `client/assets/css/style.css`.
2. Pour modifier une page spécifique : éditez le fichier correspondant dans `client/views/` et son script associé dans `client/assets/js/`.

### Ajouter une nouvelle fonctionnalité API
1. Ajoutez la méthode de requête dans `sql_request.py`.
2. Créez le point d'entrée (route) dans `routes_api.py`.
3. Si un traitement de donnée est nécessaire, ajoutez une fonction dans `gestionnaires.py`.

### Personnaliser les options du FabLab
La plupart des changements opérationnels (nouveaux matériaux, nouveaux types de projets) ne nécessitent aucun code. Il suffit de modifier le fichier `database/config.json`.

<BR>

## 5. Maintenance et sécurité

### RGPD
Le système inclut une fonction de maintenance annuelle (`execute_rgpd_maintenance`) qui anonymise les entrées de plus d'un an et supprime les profils inactifs depuis plus de 5 ans, conformément aux réglementations sur la protection des données.

### Sauvegarde
La sauvegarde du système consiste simplement à copier le fichier `database/database.db` et `database/config.json`.
