# FabScan - Documentation Utilisateur (version courte)

<table style="width: 100%; border: none; border-collapse: collapse;">
  <tr>
    <td style="width: 60%; vertical-align: top; border: none; padding-right: 20px;">
      <strong>Version du document :</strong> 23/06/2026<br>
      <strong>Public cible :</strong> Personnel de FabLab (gestionnaires)<br>
      <strong>Objet :</strong> Référence rapide pour l'utilisation quotidienne
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


## 1. Démarrage rapide

1. Allumer le poste FabScan.
2. Lancer l'application via le raccourci bureau FabScan.
3. Attendre l'ouverture automatique dans le navigateur.
4. Vérifier que l'onglet **Accueil** est affiché.

> Internet recommandé, mais non indispensable pour les fonctions principales.

<BR>

## 2. Enregistrer une entrée (mode manuel)

1. Ouvrir l'onglet **Scanner**.
2. Renseigner :
   - **Motif de visite** (obligatoire)
   - **Zone de travail** (obligatoire)
   - Commentaire (optionnel)
3. Identifier l'utilisateur :
   - badge RFID,
   - QR code,
   - ou recherche nom/prénom.
4. Vérifier le profil affiché.
5. Cliquer sur **Valider l'entrée**.

### Contrôle important

Avant validation, vérifier les **certifications machine** si la zone concernée l'exige.

<BR>

## 3. Mode automatique

Activation via **Mode Automatique** (onglet Accueil ou Scanner).

Effet :

- la validation manuelle est grisée,
- chaque badge est enregistré automatiquement,
- les champs zone/motif ne sont pas demandés.

À utiliser sur des périodes de flux continu et encadré.

## 4. Inscrire un nouvel utilisateur

1. Ouvrir l'onglet **Inscription**.
2. Renseigner les champs obligatoires :
   - statut,
   - prénom,
   - nom,
   - e-mail (pré-rempli normalement),
   - motif.
3. Associer une carte si nécessaire.
4. Cliquer sur **Enregistrer l'utilisateur**.
5. Envoyer le QR code si proposé.

<BR>

## 5. Gérer un utilisateur

Depuis l'onglet **Utilisateurs** :

- rechercher (nom/prénom/e-mail),
- modifier les informations,
- associer/retirer carte RFID,
- gérer certifications,
- sauvegarder,
- renvoyer QR,
- supprimer (irréversible).

<BR>

## 6. Comptabilité

Depuis l'onglet **Comptabilité** :

1. Identifier l'utilisateur.
2. Saisir l'opération :
   - nom,
   - type de projet,
   - crédit/débit,
   - montant (ou calcul via matériau + quantité),
   - commentaire si besoin.
3. Enregistrer l'opération.

Export CSV : bouton **Exporter l'historique**.

<BR>
<BR>
<BR>
<BR>
<BR>

## 7. Statistiques

Depuis l'onglet **Statistiques** :

1. Choisir la période.
2. Appliquer les filtres utiles.
3. Lire indicateurs + histogramme + dernières entrées.
4. Utiliser **Actualiser** si nécessaire.
5. Exporter via **Exporter l'historique**.

<BR>

## 8. Dépannage express

- Utilisateur introuvable : tester recherche nom/prénom, puis vérifier l'inscription.
- QR non exploitable : rechercher par nom, puis renvoyer QR depuis **Utilisateurs**.
- Export absent : vérifier le dossier **Téléchargements**.
- Erreur de saisie : corriger les champs obligatoires avant validation.

<BR>

## 9. FAQ rapide

### FabScan fonctionne sans Internet ?

Oui, pour les fonctions principales.

### Peut-on annuler une suppression d'utilisateur ?

Non, la suppression est définitive.

### Où sont les fichiers CSV ?

Dans **Téléchargements**.

### Un Utilisateur n'a pas de carte RFID, que faire ?

Il peut utiliser le QR code ou la recherche nom/prénom.


### Un Utilisateur dit n'avoir jamais reçu son QR code, que faire ?

Vérifier avec l'Utilisateur l'adresse e-mail connue par l'Application, puis renvoyer le QR code depuis l'onglet **Utilisateurs**.

<BR>

## 10. Impression / PDF

Checklist avant diffusion :

- [ ] Titres lisibles et pagination correcte.
- [ ] Images nettes en impression.
- [ ] Liens internes vérifiés.
- [ ] Test d'impression A4 effectué.

<BR>

## 11. Document complet

Pour le détail complet des fonctionnalités, utiliser :

- [Documentation complète](./user_documentation.md)
