// Fichier : netlify/functions/generer-tableau.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

// Cette fonction traite UN SEUL nom scientifique.
async function processSingleTaxon(name, locationId) {
    try {
        // Étape 1 : Récupérer l'ID du taxon (cd_nom)
        const searchParams = new URLSearchParams({ q: name });
        const taxonSearchResp = await fetch(`${API_BASE}/taxa/search?${searchParams}`, { headers: HEADERS });
        if (!taxonSearchResp.ok) throw new Error(`API TAXREF (search) a échoué`);

        const taxonSearchData = await taxonSearchResp.json();
        const taxonId = taxonSearchData?._embedded?.taxa?.[0]?.id;

        if (!taxonId) {
            return { "Nom scientifique": name, "Erreur": "Taxon non trouvé" };
        }

        // Étape 2 : Récupérer les statuts pour ce taxon, en utilisant le locationId s'il est fourni
        const statusParams = new URLSearchParams({ taxrefId: taxonId, size: 200 });
        if (locationId) {
            // Le paramètre de l'API pour la localité est 'locationId'
            statusParams.append('locationId', locationId);
        }
        
        const statusResp = await fetch(`${API_BASE}/status/search/lines?${statusParams}`, { headers: HEADERS });
        if (!statusResp.ok) throw new Error(`API TAXREF (status) a échoué`);

        const statusData = await statusResp.json();
        const statuses = statusData?._embedded?.taxonStatuses || [];

        // Étape 3 : Agréger les statuts
        const aggregated_statuses = { "Nom scientifique": name, "ID Taxon (cd_nom)": taxonId };
        for (const status of statuses) {
            const statusTypeName = status.statusTypeName || "Statut inconnu";
            const statusValue = status.statusName || status.statusCode || "Oui";
            
            // Pour ne pas écraser les statuts (ex: plusieurs protections régionales)
            if (!aggregated_statuses[statusTypeName]) {
                aggregated_statuses[statusTypeName] = statusValue;
            } else {
                aggregated_statuses[statusTypeName] += ` ; ${statusValue}`;
            }
        }
        return aggregated_statuses;

    } catch (err) {
        return { "Nom scientifique": name, "Erreur": err.message };
    }
}

// Fonction handler principale que Netlify exécute.
exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { scientific_names, locationId } = JSON.parse(event.body);
        if (!scientific_names || !Array.isArray(scientific_names)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Le champ 'scientific_names' doit être une liste." }) };
        }

        // Création d'un tableau de promesses. Chaque promesse correspond au traitement d'un taxon.
        const promises = scientific_names
            .filter(name => name.trim())
            .map(name => processSingleTaxon(name, locationId));

        // Exécution de toutes les promesses en parallèle.
        const results = await Promise.all(promises);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results)
        };

    } catch (err) {
        return { statusCode: 400, body: JSON.stringify({ error: "Corps JSON invalide ou erreur interne." }) };
    }
};
