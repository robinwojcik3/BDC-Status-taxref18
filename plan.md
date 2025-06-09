# Plan de Développement : Application de Synthèse de Statuts Écologiques

**Auteur :** Robin Wojcik
**Version :** 1.0
**Date :** 09/06/2025

---

## 1. Objectif du Projet

L'objectif est de développer une application web permettant à un utilisateur de saisir une liste de noms de taxons (noms scientifiques latins) et d'obtenir en retour un tableau de synthèse structuré. Ce tableau sera automatiquement enrichi avec les données réglementaires, de conservation et écologiques les plus à jour, en interrogeant en temps réel l'API publique TAXREF de l'INPN.

L'application doit être performante, intuitive et fournir des données fiables et exportables.

---

## 2. Architecture Technique Globale

* **Backend :** API RESTful développée en **Python** avec le micro-framework **Flask**. Responsable de la logique métier, des appels à l'API externe de l'INPN et de la transformation des données.
* **Frontend :** Interface web monopage (SPA) développée en **HTML5, CSS3 et JavaScript** natif. Responsable de l'interaction avec l'utilisateur et de l'affichage dynamique des données.
* **Source de données :** API RESTful publique **TAXREF de l'INPN** (https://taxref.mnhn.fr/api).

---

## 5. Phase 3 : Finalisation et Déploiement

**Objectif de la phase :** Polir l'application, gérer les cas d'erreurs et la rendre facilement utilisable.

### Tâche 3.1 : Gestion des États et des Erreurs

* **Objectif :** Fournir un retour visuel à l'utilisateur pendant les temps de chargement et en cas de problème.
* **Moyens Techniques :**
    * **Frontend :** Afficher un indicateur de chargement ("spinner") après le clic sur le bouton et le cacher une fois la réponse reçue. En cas d'échec de la requête, afficher un message d'erreur clair à l'utilisateur.
    * **Backend :** Retourner des codes d'erreur HTTP pertinents (e.g., `400 Bad Request` si la liste d'espèces est vide).
* **Critères de Succès :** L'application est perçue comme réactive et robuste, même en cas d'erreur.

### Tâche 3.2 : Ajout de l'Export CSV

* **Objectif :** Permettre à l'utilisateur de télécharger les résultats pour une utilisation hors ligne.
* **Moyens Techniques :**
    * Ajout d'un bouton "Exporter en CSV" sur l'interface.
    * Développement d'une fonction JavaScript qui convertit le tableau de données JSON en une chaîne de caractères au format CSV, puis qui simule un clic sur un lien de téléchargement pour sauvegarder le fichier.
* **Critères de Succès :** Un fichier `.csv` contenant les données du tableau est téléchargé sur le poste de l'utilisateur.

### Tâche 3.3 : Documentation et Déploiement

* **Objectif :** Documenter le projet pour assurer sa maintenabilité et le rendre exécutable par d'autres utilisateurs.
* **Moyens Techniques :**
    * Rédaction d'un fichier `README.md` à la racine du projet, expliquant :
        1.  L'objectif de l'application.
        2.  La procédure d'installation (clonage, création du venv, installation des dépendances).
        3.  La procédure de lancement (`flask run`).
        4.  Comment accéder à l'application (ouvrir le fichier `frontend/index.html`).
* **Critères de Succès :** Une personne tierce peut, en suivant le `README.md`, installer et lancer l'application avec succès.
