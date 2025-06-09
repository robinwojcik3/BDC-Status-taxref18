// Fichier : netlify/functions/generer-tableau.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

// Dictionnaire de correspondance pour standardiser les clés de statuts.
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

exports.handler = async function(event, context) {
    // Augmentation du temps d'exécution pour cette fonction spécifique
    context.callbackWaitsForEmptyEventLoop = false;

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { scientific_names, locationId } = JSON.parse(event.body);
        if (!scientific_names || !Array.isArray(scientific_names)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Le champ 'scientific_names' doit être une liste." }) };
        }

        // Nettoyage robuste des noms saisis par l'utilisateur.
        const validNames = scientific_names
            .map(name => name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim())
            .filter(Boolean);

        if (validNames.length === 0) {
            return { statusCode: 200, body: JSON.stringify([]) };
        }

        // --- ÉTAPE 1 : OBTENIR TOUS LES ID DE TAXONS EN UN SEUL APPEL API ---
        const searchParams = new URLSearchParams();
        validNames.forEach(name => searchParams.append('scientificNames', name));
        searchParams.append('size', validNames.length);

        const taxaSearchResp = await fetch(`${API_BASE}/taxa/search?${searchParams}`, { headers: HEADERS });
        if (!taxaSearchResp.ok) throw new Error(`L'API TAXREF (recherche taxons) a retourné une erreur ${taxaSearchResp.status}`);
        
        const taxaSearchData = await taxaSearchResp.json();
        const foundTaxa = taxaSearchData?._embedded?.taxa || [];

        const nameToIdMap = new Map();
        foundTaxa.forEach(taxon => {
            nameToIdMap.set(taxon.scientificName, { id: taxon.id, name: taxon.scientificName });
        });

        const foundIds = Array.from(nameToIdMap.values()).map(t => t.id);
        
        // --- ÉTAPE 2 : OBTENIR TOUS LES STATUTS EN UN SEUL APPEL API ---
        let statusesById = {};
        if (foundIds.length > 0) {
            const statusParams = new URLSearchParams();
            foundIds.forEach(id => statusParams.append('taxrefId', id));
            statusParams.append('size', 500); // Taille suffisante pour de nombreux statuts
            if (locationId) {
                statusParams.append('locationId', locationId);
            }

            const statusResp = await fetch(`${API_BASE}/status/search/lines?${statusParams}`, { headers: HEADERS });

            if (statusResp.ok) {
                const statusData = await statusResp.json();
                const allStatuses = statusData?._embedded?.taxonStatuses || [];
                
                allStatuses.forEach(status => {
                    const taxonId = status.taxon.id;
                    if (!statusesById[taxonId]) statusesById[taxonId] = [];
                    statusesById[taxonId].push(status);
                });
            } else if (statusResp.status !== 404) {
                throw new Error(`L'API TAXREF (recherche statuts) a retourné une erreur ${statusResp.status}`);
            }
        }
        
        // --- ÉTAPE 3 : COMBINER LES RÉSULTATS ---
        const finalResults = validNames.map(originalName => {
            const foundTaxon = nameToIdMap.get(originalName);

            if (!foundTaxon) {
                return { "Nom scientifique": originalName, "Erreur": "Taxon non trouvé" };
            }

            const { id: taxonId, name: scientificName } = foundTaxon;
            const result = { "Nom scientifique": scientificName, "ID Taxon (cd_nom)": taxonId };
            const taxonStatuses = statusesById[taxonId] || [];

            for (const status of taxonStatuses) {
                const apiStatusName = status.statusTypeName;
                const simpleKey = STATUS_TYPE_MAP[apiStatusName];

                if (simpleKey) {
                    const statusValue = status.statusName || status.statusCode || "Oui";
                    result[simpleKey] = (result[simpleKey] ? result[simpleKey] + ' ; ' : '') + statusValue;
                }
            }
            return result;
        });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalResults)
        };

    } catch (err) {
        console.error("Erreur dans la fonction serverless:", err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: `Erreur interne du serveur: ${err.message}` }) 
        };
    }
};
