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

## 3. Phase 1 : Le Backend - Moteur de l'Application

**Objectif de la phase :** Construire un serveur API robuste et fonctionnel qui sert de fondation à toute l'application. Ce serveur sera le seul à communiquer avec l'API de l'INPN.

### Tâche 1.1 : Initialisation du Projet

* **Objectif :** Mettre en place une structure de dossiers propre et un environnement de développement Python isolé pour garantir la reproductibilité du projet.
* **Moyens Techniques :**
    * Utilisation du terminal **PowerShell**.
    * Création de la structure de dossiers : `BDC-Status-taxref18/backend/`.
    * Création d'un environnement virtuel avec `python -m venv venv`.
    * Activation de l'environnement avec `.\venv\Scripts\Activate.ps1`.
    * Installation des dépendances via `pip install Flask requests`.
* **Critères de Succès :** L'environnement virtuel est actif dans le terminal et les librairies Flask et Requests sont installées sans erreur.

### Tâche 1.2 : Implémentation de l'Accès à l'API TAXREF

* **Objectif :** Développer les fonctions Python de base pour communiquer avec l'API de l'INPN, en se concentrant sur les deux endpoints essentiels : la recherche de taxon et la récupération des statuts par colonnes.
* **Moyens Techniques :**
    * Création du fichier `backend/app.py`.
    * Implémentation de la fonction `get_taxon_id(scientific_name)` qui interroge `GET /api/taxa/search` et retourne le `cd_nom`.
    * Implémentation de la fonction `get_taxon_statuses_columns(cd_nom)` qui interroge `GET /taxa/{cd_nom}/status/columns` et retourne un dictionnaire de statuts.
    * Intégration d'une gestion d'erreurs robuste (`try...except`, `response.raise_for_status()`) pour gérer les cas où l'API est indisponible ou si un taxon n'est pas trouvé.
* **Critères de Succès :** Les deux fonctions peuvent être testées dans un script Python simple et retournent les données attendues pour un `cd_nom` connu.

### Tâche 1.3 : Création de la Logique de Transformation

* **Objectif :** Transformer les données brutes reçues de l'API INPN en un format structuré qui correspond exactement aux colonnes du tableau final désiré.
* **Moyens Techniques :**
    * Développement d'une nouvelle fonction `format_species_data(api_data)`.
    * Cette fonction prend en entrée le dictionnaire JSON de l'endpoint `/status/columns`.
    * Elle crée un nouveau dictionnaire "propre" dont les clés correspondent aux en-têtes de votre tableau (e.g., `Liste_Rouge_Nationale`, `Protection`, `Directive_Habitat`).
    * Elle implémente la logique de correspondance pour remplir ces clés.
* **Critères de Succès :** La fonction `format_species_data` transforme avec succès un objet JSON brut de l'API en un dictionnaire Python simple et structuré.

### Tâche 1.4 : Exposition via un Endpoint API

* **Objectif :** Rendre la logique de traitement accessible via une URL web que le frontend pourra interroger.
* **Moyens Techniques :**
    * Utilisation du décorateur `@app.route('/api/generer-tableau', methods=['POST'])` de Flask.
    * Cette fonction recevra une liste de noms latins au format JSON.
    * Elle orchestrera l'appel successif à `get_taxon_id`, `get_taxon_statuses_columns` et `format_species_data` pour chaque espèce de la liste.
    * Elle retournera une liste de dictionnaires structurés au format JSON avec `jsonify()`.
* **Critères de Succès :** Le serveur Flask peut être démarré (`flask run`) et un test via PowerShell (`Invoke-RestMethod`) sur l'URL de l'API retourne une réponse JSON correctement formatée et prête à être affichée.

---

## 4. Phase 2 : Le Frontend - Interface Utilisateur

**Objectif de la phase :** Créer une interface web intuitive et réactive qui permette à l'utilisateur d'interagir avec le backend de manière transparente.

### Tâche 2.1 : Structure HTML et CSS

* **Objectif :** Construire le squelette visuel de l'application.
* **Moyens Techniques :**
    * Création d'un dossier `frontend/` avec un fichier `index.html`.
    * Utilisation de balises sémantiques HTML5 : `<header>`, `<main>`, `<footer>`.
    * Création des éléments d'interaction : une `<textarea>` pour la saisie des noms latins, un `<button>` pour lancer la génération, et un `<div>` vide avec un `id="result-table"` pour accueillir les résultats.
    * Création d'un fichier `style.css` pour définir l'apparence générale, la disposition des éléments et les styles de base du tableau.
* **Critères de Succès :** La page `index.html` s'affiche correctement dans un navigateur et présente tous les éléments d'interface, bien que non fonctionnels à ce stade.

### Tâche 2.2 : Logique d'Interaction JavaScript

* **Objectif :** Rendre la page dynamique en capturant les actions de l'utilisateur et en communiquant avec le backend.
* **Moyens Techniques :**
    * Création d'un fichier `app.js` lié à `index.html`.
    * Utilisation de `document.addEventListener` pour détecter le clic sur le bouton "Générer".
    * Lecture du contenu de la `<textarea>` et transformation de la liste de noms en un tableau JavaScript, puis en une chaîne JSON.
    * Utilisation de l'API `fetch()` pour envoyer une requête `POST` asynchrone à l'endpoint `/api/generer-tableau` du backend, avec les données JSON dans le corps de la requête.
* **Critères de Succès :** Un clic sur le bouton déclenche un appel réseau visible dans l'onglet "Réseau" des outils de développement du navigateur.

### Tâche 2.3 : Affichage et Mise en Forme des Données

* **Objectif :** Interpréter la réponse du backend et l'utiliser pour construire le tableau de résultats HTML.
* **Moyens Techniques :**
    * Traitement de la promesse retournée par `fetch()`.
    * Une fois les données JSON reçues, une fonction JavaScript (`displayResults(data)`) se chargera de :
        1.  Vider le conteneur de résultats.
        2.  Créer les en-têtes du tableau (`<thead>`).
        3.  Boucler sur chaque objet du tableau JSON et créer une ligne (`<tr>`) et des cellules (`<td>`) pour chaque donnée.
        4.  Appliquer des classes CSS conditionnelles aux cellules en fonction de leur valeur (e.g., `class="status-lc"` si la valeur est "LC") pour la mise en couleur.
* **Critères de Succès :** Le tableau de résultats s'affiche correctement sur la page avec les données et les couleurs correspondantes après une requête réussie.

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
