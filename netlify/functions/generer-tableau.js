// Fichier : netlify/functions/generer-tableau.js
// Conçu pour traiter de petits lots de noms de manière performante et fiable.

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

// Dictionnaire de correspondance
const STATUS_TYPE_MAP = {
    "Liste rouge mondiale UICN": "lrm", "Liste rouge européenne UICN": "lre",
    "Liste rouge nationale UICN": "lrn", "Liste rouge régionale": "lrr",
    "Protection nationale": "pn", "Protection régionale": "pr", "Protection départementale": "pd",
    "Directive \"Habitats, Faune, Flore\"": "dh", "Directive \"Oiseaux\"": "do",
    "Convention de Berne": "bern", "Convention de Bonn": "bonn", "Convention OSPAR": "ospar",
    "Convention de Barcelone": "barc", "Déterminant ZNIEFF de type 1": "zdet",
    "Réglementation des espèces exotiques envahissantes": "regl"
};

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

    try {
        const { scientific_names, locationId } = JSON.parse(event.body);
        if (!scientific_names || !Array.isArray(scientific_names)) {
            return { statusCode: 400, body: JSON.stringify({ error: "Format de requête invalide." }) };
        }
        
        console.log(`Traitement d'un lot de ${scientific_names.length} nom(s) pour la localité: ${locationId || 'nationale'}`);

        // ÉTAPE 1 : RECHERCHE FIABLE DES TAXONS POUR LE LOT
        const searchPromises = scientific_names.map(async (name) => {
            const cleanName = name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
            if (!cleanName) return null;
            
            const searchParams = new URLSearchParams({ q: cleanName });
            const resp = await fetch(`${API_BASE}/taxa/search?${searchParams}`, { headers: HEADERS });
            if (!resp.ok) return { originalName: name, error: `API Taxon (HTTP ${resp.status})` };
            
            const data = await resp.json();
            const taxon = data?._embedded?.taxa?.[0];
            return taxon ? { originalName: name, id: taxon.id, scientificName: taxon.scientificName } : { originalName: name, error: "Taxon non trouvé" };
        });
        const taxaResults = await Promise.all(searchPromises);

        const foundTaxa = taxaResults.filter(t => t && !t.error);
        const foundIds = foundTaxa.map(t => t.id);

        // ÉTAPE 2 : RÉCUPÉRATION DES STATUTS POUR LE LOT
        let statusesById = {};
        if (foundIds.length > 0) {
            const statusParams = new URLSearchParams();
            foundIds.forEach(id => statusParams.append('taxrefId', id));
            statusParams.append('size', foundIds.length * 10); // Assez large
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
                console.warn(`Avertissement: L'API des statuts a retourné ${statusResp.status} pour le lot.`);
            }
        }
        
        // ÉTAPE 3 : ASSEMBLAGE FINAL DU LOT
        const finalResults = taxaResults.map(taxonInfo => {
            if (!taxonInfo || taxonInfo.error) {
                return { "Nom scientifique": taxonInfo.originalName, "Erreur": taxonInfo.error || "Inconnu" };
            }

            const result = { "Nom scientifique": taxonInfo.scientificName, "ID Taxon (cd_nom)": taxonInfo.id };
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
        console.error("Erreur critique dans la fonction serverless:", err);
        return { statusCode: 500, body: JSON.stringify({ error: `Erreur Interne: ${err.message}` }) };
    }
};
