# BDC Status TAXREF18

Cette application permet de saisir une liste de noms scientifiques et d'obtenir en retour les statuts réglementaires depuis l'API TAXREF.

## Installation

```bash
python3 -m venv venv
source venv/bin/activate
pip install Flask requests
```

## Lancement du backend

```bash
FLASK_APP=backend/app.py flask run
```

## Utilisation

Ouvrir `frontend/index.html` dans un navigateur. Entrer les noms latins (un par ligne) puis cliquer sur **Générer**. Un bouton **Exporter en CSV** permet de sauvegarder le tableau obtenu.

## Tests

Pour vérifier que le backend se charge correctement :

```bash
python3 -m py_compile backend/app.py
```
