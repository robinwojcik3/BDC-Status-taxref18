// Fichier : netlify/functions/generer-tableau.js

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { scientific_names, locationId } = JSON.parse(event.body);
        if (!scientific_names || !Array.isArray(scientific_names)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Le champ 'scientific_names' doit être une liste." }) };
        }

        const validNames = scientific_names.filter(name => name && name.trim());
        if (validNames.length === 0) {
            return { statusCode: 200, body: JSON.stringify([]) };
        }

        // ÉTAPE 1 : OBTENIR TOUS LES ID DE TAXONS EN UN SEUL APPEL API
        const searchParams = new URLSearchParams();
        validNames.forEach(name => searchParams.append('scientificNames', name));
        searchParams.append('size', validNames.length);

        const taxaSearchResp = await fetch(`${API_BASE}/taxa/search?${searchParams}`, { headers: HEADERS });
        if (!taxaSearchResp.ok) throw new Error(`L'API TAXREF (recherche taxons) a retourné une erreur ${taxaSearchResp.status}`);
        
        const taxaSearchData = await taxaSearchResp.json();
        const foundTaxa = taxaSearchData?._embedded?.taxa || [];

        const nameToIdMap = new Map();
        foundTaxa.forEach(taxon => {
            nameToIdMap.set(taxon.scientificName, taxon.id);
        });

        const foundIds = Array.from(nameToIdMap.values());
        
        // ÉTAPE 2 : OBTENIR TOUS LES STATUTS EN UN SEUL APPEL API
        let statusesById = {};
        if (foundIds.length > 0) {
            const statusParams = new URLSearchParams();
            foundIds.forEach(id => statusParams.append('taxrefId', id));
            statusParams.append('size', 500);
            if (locationId) {
                statusParams.append('locationId', locationId);
            }

            const statusResp = await fetch(`${API_BASE}/status/search/lines?${statusParams}`, { headers: HEADERS });

            // --- MODIFICATION CI-DESSOUS ---
            // Gestion spécifique de l'erreur 404
            if (statusResp.ok) {
                const statusData = await statusResp.json();
                const allStatuses = statusData?._embedded?.taxonStatuses || [];
                
                allStatuses.forEach(status => {
                    const taxonId = status.taxon.id;
                    if (!statusesById[taxonId]) {
                        statusesById[taxonId] = [];
                    }
                    statusesById[taxonId].push(status);
                });
            } else if (statusResp.status === 404) {
                // Ce n'est pas une erreur. L'API signifie juste "aucun statut trouvé".
                // On laisse statusesById vide, le reste du code fonctionnera.
                console.log("INFO: L'API TAXREF a retourné 404 pour la recherche de statuts, interprété comme un résultat vide.");
            } else {
                // C'est une autre erreur (500, 403, etc.), qu'il faut remonter.
                throw new Error(`L'API TAXREF (recherche statuts) a retourné une erreur ${statusResp.status}`);
            }
            // --- FIN DE LA MODIFICATION ---
        }
        
        // ÉTAPE 3 : COMBINER LES RÉSULTATS
        const finalResults = validNames.map(name => {
            const taxonId = nameToIdMap.get(name);

            if (!taxonId) {
                return { "Nom scientifique": name, "Erreur": "Taxon non trouvé" };
            }

            const aggregated_statuses = { "Nom scientifique": name, "ID Taxon (cd_nom)": taxonId };
            const taxonStatuses = statusesById[taxonId] || [];

            for (const status of taxonStatuses) {
                const statusTypeName = status.statusTypeName || "Statut inconnu";
                const statusValue = status.statusName || status.statusCode || "Oui";
                
                if (!aggregated_statuses[statusTypeName]) {
                    aggregated_statuses[statusTypeName] = statusValue;
                } else {
                    aggregated_statuses[statusTypeName] += ` ; ${statusValue}`;
                }
            }
            return aggregated_statuses;
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
