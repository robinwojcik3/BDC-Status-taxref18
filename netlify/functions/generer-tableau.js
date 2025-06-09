// Fichier : netlify/functions/generer-tableau.js
// VERSION CORRIGÉE POUR RÉSOUDRE LES ERREURS 502

const fetch = require('node-fetch');

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

// Dictionnaire de correspondance pour standardiser les clés de statuts
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

// Fonction avec retry pour gérer les timeouts
async function fetchWithRetry(url, options, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10 secondes timeout
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeout);
            return response;
        } catch (error) {
            console.error(`Tentative ${i + 1} échouée:`, error.message);
            if (i === retries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde avant de réessayer
        }
    }
}

// Fonction isolée pour traiter la recherche d'un seul taxon
async function findSingleTaxon(name) {
    const cleanName = name.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanName) return { originalName: name, found: false, error: "Nom vide" };
    
    try {
        const searchParams = new URLSearchParams({ 
            q: cleanName,
            size: 10
        });
        
        const resp = await fetchWithRetry(`${API_BASE}/taxa/search?${searchParams}`, { headers: HEADERS });
        
        if (!resp.ok) {
            console.error(`Erreur API pour ${name}: ${resp.status}`);
            return { originalName: name, found: false, error: `API Taxon (HTTP ${resp.status})` };
        }
        
        const data = await resp.json();
        const taxa = data?._embedded?.taxa || [];
        
        // Chercher une correspondance exacte d'abord
        let taxon = taxa.find(t => t.scientificName === cleanName);
        
        // Si pas de correspondance exacte, prendre le premier résultat
        if (!taxon && taxa.length > 0) {
            taxon = taxa[0];
        }
        
        if (!taxon) {
            return { originalName: name, found: false, error: "Taxon non trouvé" };
        }
        
        return { 
            originalName: name, 
            found: true,
            id: taxon.id, 
            scientificName: taxon.scientificName 
        };
    } catch (e) {
        console.error(`Erreur recherche pour ${name}:`, e);
        return { originalName: name, found: false, error: "Erreur réseau" };
    }
}

// Fonction pour récupérer les statuts avec l'API columns
async function getStatusesColumns(taxonIds, locationId) {
    try {
        const params = new URLSearchParams();
        taxonIds.forEach(id => params.append('taxrefId', id));
        if (locationId) params.append('locationId', locationId);
        params.append('size', '1000');
        
        const url = `${API_BASE}/status/search/columns?${params}`;
        console.log('Appel API columns:', url);
        
        const resp = await fetchWithRetry(url, { headers: HEADERS });
        
        if (!resp.ok) {
            console.error(`Erreur API columns: ${resp.status}`);
            return {};
        }
        
        const data = await resp.json();
        const results = {};
        
        (data?._embedded?.taxonStatuses || []).forEach(status => {
            const taxonId = status.taxon.id;
            
            // Convertir le format columns en notre format
            results[taxonId] = {
                lrm: status.worldRedList || '',
                lre: status.europeanRedList || '',
                lrn: status.nationalRedList || '',
                lrr: status.localRedList || '',
                pn: status.nationalProtection || '',
                pr: status.regionalProtection || '',
                pd: status.departementalProtection || '',
                dh: status.hffDirective || '',
                do: status.birdDirective || '',
                bern: status.bernConvention || '',
                bonn: status.bonnConvention || '',
                zdet: status.determinanteZnieff || ''
            };
        });
        
        return results;
    } catch (e) {
        console.error('Erreur lors de la récupération des statuts:', e);
        return {};
    }
}

exports.handler = async function(event, context) {
    // Augmenter le timeout de la fonction
    context.callbackWaitsForEmptyEventLoop = false;
    
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const body = JSON.parse(event.body);
        const { scientific_names, locationId } = body;
        
        console.log(`Traitement de ${scientific_names?.length || 0} taxons`);
        
        if (!scientific_names || scientific_names.length === 0) {
            return {
                statusCode: 400,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ error: "Aucun nom scientifique fourni" })
            };
        }
        
        // 1. Recherche de tous les taxons en parallèle
        const searchPromises = scientific_names.map(name => findSingleTaxon(name));
        const taxaResults = await Promise.all(searchPromises);

        const foundTaxa = taxaResults.filter(t => t.found);
        const foundIds = foundTaxa.map(t => t.id);

        console.log(`${foundTaxa.length} taxons trouvés sur ${scientific_names.length}`);

        // 2. Récupération des statuts si on a des taxons trouvés
        let statusesById = {};
        if (foundIds.length > 0) {
            statusesById = await getStatusesColumns(foundIds, locationId);
        }
        
        // 3. Assemblage final des résultats
        const finalResults = taxaResults.map(taxonInfo => {
            if (!taxonInfo.found) {
                return { 
                    "Nom scientifique": taxonInfo.originalName, 
                    "Erreur": taxonInfo.error || "Non trouvé"
                };
            }
            
            const statuses = statusesById[taxonInfo.id] || {};
            
            return {
                "Nom scientifique": taxonInfo.scientificName,
                "ID Taxon (cd_nom)": taxonInfo.id,
                ...statuses
            };
        });

        console.log(`Envoi de ${finalResults.length} résultats`);

        return { 
            statusCode: 200, 
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "no-cache"
            }, 
            body: JSON.stringify(finalResults) 
        };

    } catch (err) {
        console.error("Erreur critique dans le handler:", err);
        return { 
            statusCode: 500, 
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                error: `Erreur serveur: ${err.message}`,
                details: process.env.NODE_ENV === 'development' ? err.stack : undefined
            }) 
        };
    }
};
