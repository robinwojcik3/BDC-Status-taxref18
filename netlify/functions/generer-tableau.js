// Fichier : netlify/functions/generer-tableau.js

// Utilise la bibliothèque 'node-fetch' pour faire des requêtes HTTP, équivalent de 'requests' en Python.
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

// Fonction handler principale que Netlify va exécuter
exports.handler = async function(event, context) {
    // Les fonctions Netlify pour les requêtes POST reçoivent les données dans 'event.body'
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { scientific_names } = JSON.parse(event.body);
        if (!scientific_names || !Array.isArray(scientific_names)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Le champ 'scientific_names' doit être une liste." }) };
        }

        const results = [];
        for (const name of scientific_names) {
            if (!name.trim()) continue;

            try {
                // Étape 1 : Récupérer l'ID du taxon (cd_nom)
                const searchParams = new URLSearchParams({ q: name });
                const taxonSearchResp = await fetch(`${API_BASE}/taxa/search?${searchParams}`, { headers: HEADERS });
                if (!taxonSearchResp.ok) throw new Error(`Erreur API TAXREF (search) pour ${name}`);
                
                const taxonSearchData = await taxonSearchResp.json();
                const taxonId = taxonSearchData?._embedded?.taxa?.[0]?.id;

                if (!taxonId) {
                    results.push({ "Nom scientifique": name, "Erreur": "Taxon non trouvé" });
                    continue;
                }

                // Étape 2 : Récupérer les statuts pour ce taxon
                const statusParams = new URLSearchParams({ taxrefId: taxonId, size: 100 });
                const statusResp = await fetch(`${API_BASE}/status/search/lines?${statusParams}`, { headers: HEADERS });
                if (!statusResp.ok) throw new Error(`Erreur API TAXREF (status) pour ${name}`);

                const statusData = await statusResp.json();
                const statuses = statusData?._embedded?.taxonStatuses || [];

                // Étape 3 : Agréger les statuts
                const aggregated_statuses = { "Nom scientifique": name, "ID Taxon (cd_nom)": taxonId };
                for (const status of statuses) {
                    const statusTypeName = status.statusTypeName || "Statut inconnu";
                    const statusValue = status.statusName || status.statusCode || "Oui";
                    if (!aggregated_statuses[statusTypeName]) {
                        aggregated_statuses[statusTypeName] = statusValue;
                    } else {
                        aggregated_statuses[statusTypeName] += ` ; ${statusValue}`;
                    }
                }
                results.push(aggregated_statuses);

            } catch (err) {
                results.push({ "Nom scientifique": name, "Erreur": err.message });
            }
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results)
        };

    } catch (err) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) };
    }
};
