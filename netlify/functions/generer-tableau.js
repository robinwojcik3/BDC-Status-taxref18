// Fichier : netlify/functions/generer-tableau.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

// --- DICTIONNAIRE DE CORRESPONDANCE ---
// Traduit les noms de statuts de l'API en clés simples et stables.
const STATUS_TYPE_MAP = {
    "Liste rouge mondiale UICN": "lrm",
    "Liste rouge européenne UICN": "lre",
    "Liste rouge nationale UICN": "lrn",
    "Liste rouge régionale": "lrr",
    "Protection nationale": "pn",
    "Protection régionale": "pr",
    "Protection départementale": "pd",
    "Directive \"Habitats, Faune, Flore\"": "dh",
    "Directive \"Oiseaux\"": "do",
    "Convention de Berne": "bern",
    "Convention de Bonn": "bonn",
    "Convention OSPAR": "ospar",
    "Convention de Barcelone": "barc",
    "Déterminant ZNIEFF de type 1": "zdet",
    "Réglementation des espèces exotiques envahissantes": "regl"
};

// Fonction pour traiter un seul nom scientifique
async function processSingleTaxon(name, locationId) {
    try {
        // Étape 1 : Recherche individuelle pour plus de fiabilité
        const searchParams = new URLSearchParams({ q: name.trim() });
        const taxaSearchResp = await fetch(`${API_BASE}/taxa/search?${searchParams}`, { headers: HEADERS });

        if (!taxaSearchResp.ok) {
            return { "Nom scientifique": name, "Erreur": `API Taxon (HTTP ${taxaSearchResp.status})` };
        }
        
        const taxaSearchData = await taxaSearchResp.json();
        const taxon = taxaSearchData?._embedded?.taxa?.[0];

        if (!taxon) {
            return { "Nom scientifique": name, "Erreur": "Taxon non trouvé" };
        }

        const taxonId = taxon.id;
        const result = { 
            "Nom scientifique": taxon.scientificName, 
            "ID Taxon (cd_nom)": taxonId 
        };

        // Étape 2 : Récupération des statuts pour cet ID
        const statusParams = new URLSearchParams({ taxrefId: taxonId, size: 200 });
        if (locationId) {
            statusParams.append('locationId', locationId);
        }

        const statusResp = await fetch(`${API_BASE}/status/search/lines?${statusParams}`, { headers: HEADERS });

        if (statusResp.ok) {
            const statusData = await statusResp.json();
            const statuses = statusData?._embedded?.taxonStatuses || [];
            
            // Étape 3 : Traduction et agrégation des statuts
            for (const status of statuses) {
                const apiStatusName = status.statusTypeName;
                const simpleKey = STATUS_TYPE_MAP[apiStatusName]; // Utilise le dictionnaire

                if (simpleKey) { // Si le statut nous intéresse
                    const statusValue = status.statusName || status.statusCode || "Oui";
                    result[simpleKey] = (result[simpleKey] ? result[simpleKey] + ' ; ' : '') + statusValue;
                }
            }
        } else if (statusResp.status !== 404) {
            // Ignorer l'erreur 404 (pas de statuts), mais logger les autres erreurs
            console.warn(`Avertissement: L'API des statuts a retourné ${statusResp.status} pour le taxon ${taxonId}`);
        }
        
        return result;

    } catch (err) {
        console.error(`Erreur critique lors du traitement de "${name}":`, err);
        return { "Nom scientifique": name, "Erreur": "Erreur de traitement" };
    }
}


exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { scientific_names, locationId } = JSON.parse(event.body);
        if (!scientific_names || !Array.isArray(scientific_names)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Le champ 'scientific_names' doit être une liste." }) };
        }

        const validNames = scientific_names
            .map(name => name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim())
            .filter(Boolean);

        if (validNames.length === 0) {
            return { statusCode: 200, body: JSON.stringify([]) };
        }

        // Exécution des recherches en parallèle pour la performance
        const promises = validNames.map(name => processSingleTaxon(name, locationId));
        const results = await Promise.all(promises);

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(results)
        };

    } catch (err) {
        console.error("Erreur dans la fonction handler:", err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: `Erreur interne du serveur: ${err.message}` }) 
        };
    }
};
