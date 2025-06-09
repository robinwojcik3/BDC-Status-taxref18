# Application de Synthèse de Statuts Écologiques - BDC Status TAXREF18

**Auteur :** Robin Wojcik
**Version :** 1.0

---

## 1. Objectif de l'application

Cette application web permet de récupérer et de synthétiser les statuts réglementaires, de conservation et écologiques pour une liste de taxons. L'utilisateur saisit une liste de noms scientifiques, et l'application interroge en temps réel l'API publique **TAXREF** de l'Inventaire National du Patrimoine Naturel (INPN) pour générer un tableau structuré des statuts.

## 2. Architecture

* **Backend :** API RESTful en Python avec Flask.
* **Frontend :** Page web monopage (SPA) en HTML, CSS, et JavaScript natif.
* **Source de données :** API TAXREF (v18) - `https://taxref.mnhn.fr/api`

## 3. Procédure d'Installation

Pour exécuter cette application en local, vous aurez besoin de Python 3.8+ et d'un terminal (comme PowerShell ou bash).

### Étape 1 : Cloner le Dépôt

Clonez ou téléchargez les fichiers du projet dans un dossier local.

### Étape 2 : Préparer l'Environnement Backend

Naviguez dans le dossier du projet et exécutez les commandes suivantes pour créer et activer un environnement virtuel Python.

```powershell
# Naviguer à la racine du projet où se trouve le fichier app.py
# Créer l'environnement virtuel
python -m venv venv

# Activer l'environnement virtuel
# Sur Windows (PowerShell)
.\venv\Scripts\Activate.ps1
# Sur macOS/Linux (bash)
# source venv/bin/activate
