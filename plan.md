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

Toutes les tâches prévues dans les différentes phases ont été réalisées. L'application est prête à être utilisée.
