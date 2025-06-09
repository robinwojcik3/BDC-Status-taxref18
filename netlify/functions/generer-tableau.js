// Fichier : netlify/functions/generer-tableau.js
// VERSION DE PRODUCTION FINALE

// Chargement stable de la bibliothèque node-fetch v2
const fetch = require('node-fetch');

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

// Dictionnaire de correspondance pour standardiser les clés de statuts.
const STATUS_TYPE_MAP = {
    "Liste rouge mondiale UICN": "lrm", "Liste rouge européenne UICN": "lre",
    "Liste rouge nationale UICN": "lrn", "Liste rouge régionale": "lrr",
    "Protection nationale": "pn", "Protection régionale": "pr", "Protection départementale": "pd",
    "Directive \"Habitats, Faune, Flore\"": "dh", "Directive \"Oiseaux\"": "do",
    "Convention de Berne": "bern", "Convention de Bonn": "bonn", "Convention OSPAR": "ospar",
    "Convention de Barcelone": "barc", "Déterminant ZNIEFF de type 1": "zdet",
    "Réglementation des espèces exotiques envahissantes": "regl"
};

// Fonction isolée pour traiter un seul taxon, pour la robustesse
async function processSingleTaxon(name) {
    const cleanName = name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanName) return null;
    
    try {
        const searchParams = new URLSearchParams({ q: cleanName });
        const resp = await fetch(`${API_BASE}/taxa/search?${searchParams}`, { headers: HEADERS });
        if (!resp.ok) return { originalName: name, error: `API Taxon (HTTP ${resp.status})` };
        
        const data = await resp.json();
        const taxon = data?._embedded?.taxa?.[0];
        
        if (!taxon) return { originalName: name, error: "Taxon non trouvé" };
        
        return { 
            originalName: name, 
            found: true,
            id: taxon.id, 
            scientificName: taxon.scientificName 
        };
    } catch (e) {
        return { originalName: name, error: "Erreur recherche taxon" };
    }
}

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { scientific_names, locationId } = JSON.parse(event.body);
        
        // Étape 1 : Recherche fiable de tous les taxons en parallèle
        const searchPromises = (scientific_names || []).map(name => processSingleTaxon(name));
        const taxaResults = (await Promise.all(searchPromises)).filter(Boolean);

        const foundTaxa = taxaResults.filter(t => t.found);
        const foundIds = foundTaxa.map(t => t.id);

        // Étape 2 : Récupération en un bloc de tous les statuts
        let statusesById = {};
        if (foundIds.length > 0) {
            const statusParams = new URLSearchParams();
            foundIds.forEach(id => statusParams.append('taxrefId', id));
            statusParams.append('size', foundIds.length * 20); // Assez large
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
                console.warn(`Avertissement: API Statuts a retourné ${statusResp.status}.`);
            }
        }
        
        // Étape 3 : Assemblage final des résultats
        const finalResults = taxaResults.map(taxonInfo => {
            if (!taxonInfo.found) return { "Nom scientifique": taxonInfo.originalName, "Erreur": taxonInfo.error };
            
            const result = {
                "Nom scientifique": taxonInfo.scientificName,
                "ID Taxon (cd_nom)": taxonInfo.id,
            };
            const taxonStatuses = statusesById[taxonInfo.id] || [];
            
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
        console.error("Erreur critique dans le handler:", err);
        return { statusCode: 500, body: JSON.stringify({ error: `Erreur Interne Inattendue: ${err.message}` }) };
    }
};
