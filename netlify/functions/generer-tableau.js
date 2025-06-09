// Fichier : netlify/functions/generer-tableau.js
// Version corrigée pour assurer l'assemblage correct des données

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

const STATUS_TYPE_MAP = {
    "Liste rouge mondiale UICN": "lrm", "Liste rouge européenne UICN": "lre",
    "Liste rouge nationale UICN": "lrn", "Liste rouge régionale": "lrr",
    "Protection nationale": "pn", "Protection régionale": "pr", "Protection départementale": "pd",
    "Directive \"Habitats, Faune, Flore\"": "dh", "Directive \"Oiseaux\"": "do",
    "Convention de Berne": "bern", "Convention de Bonn": "bonn", "Convention OSPAR": "ospar",
    "Convention de Barcelone": "barc", "Déterminant ZNIEFF de type 1": "zdet",
    "Réglementation des espèces exotiques envahissantes": "regl"
};

async function processSingleTaxon(name) {
    // Étape 1 : Recherche individuelle
    const cleanName = name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanName) return null;
    
    const searchParams = new URLSearchParams({ q: cleanName });
    const resp = await fetch(`${API_BASE}/taxa/search?${searchParams}`, { headers: HEADERS });
    
    if (!resp.ok) return { "Nom scientifique": name, "Erreur": `API Taxon (HTTP ${resp.status})` };
    
    const data = await resp.json();
    const taxon = data?._embedded?.taxa?.[0];
    
    if (!taxon) return { "Nom scientifique": name, "Erreur": "Taxon non trouvé" };
    
    // Retourne un objet propre avec toutes les infos nécessaires pour l'étape suivante
    return { 
        originalName: name, 
        found: true,
        id: taxon.id, 
        scientificName: taxon.scientificName 
    };
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { scientific_names, locationId } = JSON.parse(event.body);
        if (!scientific_names || !Array.isArray(scientific_names)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Format de requête invalide." }) };
        }

        // --- ÉTAPE 1 : RECHERCHE FIABLE DE TOUS LES TAXONS EN PARALLÈLE ---
        const searchPromises = scientific_names.map(name => processSingleTaxon(name));
        const taxaResults = await Promise.all(searchPromises);

        const foundTaxa = taxaResults.filter(t => t && t.found);
        const foundIds = foundTaxa.map(t => t.id);

        // --- ÉTAPE 2 : RÉCUPÉRATION EN UN BLOC DE TOUS LES STATUTS ---
        let statusesById = {};
        if (foundIds.length > 0) {
            const statusParams = new URLSearchParams();
            foundIds.forEach(id => statusParams.append('taxrefId', id));
            statusParams.append('size', foundIds.length * 15); // Assez large pour couvrir de multiples statuts par taxon
            if (locationId) statusParams.append('locationId', locationId);

            const statusResp = await fetch(`${API_BASE}/status/search/lines?${statusParams}`, { headers: HEADERS });
            if (statusResp.ok) {
                const statusData = await statusResp.json();
                (statusData?._embedded?.taxonStatuses || []).forEach(status => {
                    const taxonId = status.taxon.id;
                    if (!statusesById[taxonId]) statusesById[taxonId] = [];
                    statusesById[taxonId].push(status);
                });
            } else if (statusResp.status !== 404) {
                console.warn(`Avertissement: L'API des statuts a retourné ${statusResp.status}.`);
            }
        }
        
        // --- ÉTAPE 3 : ASSEMBLAGE FINAL ET FIABLE DES RÉSULTATS ---
        const finalResults = taxaResults.map(taxonInfo => {
            if (!taxonInfo || !taxonInfo.found) {
                // Gère les cas où le taxon n'a pas été trouvé initialement
                return taxonInfo || { "Nom scientifique": "Inconnu", "Erreur": "Erreur de traitement" };
            }
            
            // Initialise l'objet résultat avec les bonnes informations
            const result = {
                "Nom scientifique": taxonInfo.scientificName,
                "ID Taxon (cd_nom)": taxonInfo.id,
            };

            const taxonStatuses = statusesById[taxonInfo.id] || [];
            
            // Enrichit l'objet résultat avec les statuts trouvés
            for (const status of taxonStatuses) {
                const simpleKey = STATUS_TYPE_MAP[status.statusTypeName];
                if (simpleKey) {
                    const value = status.statusName || status.statusCode || "Oui";
                    result[simpleKey] = (result[simpleKey] ? `${result[simpleKey]} ; ` : '') + value;
                }
            }
            return result;
        });

        return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(finalResults) };

    } catch (err) {
        console.error("Erreur critique dans la fonction handler:", err);
        return { statusCode: 500, body: JSON.stringify({ error: `Erreur Interne: ${err.message}` }) };
    }
};
