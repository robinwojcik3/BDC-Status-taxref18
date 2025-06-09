// Fichier : netlify/functions/generer-tableau-stream.js
// VERSION AVEC STREAMING POUR ÉVITER LES TIMEOUTS

const fetch = require('node-fetch');

const API_BASE = "https://taxref.mnhn.fr/api";

// Recherche simple d'un taxon
async function searchTaxon(name) {
    try {
        const url = `${API_BASE}/taxa/search?q=${encodeURIComponent(name)}&size=1`;
        const response = await fetch(url, {
            headers: { "Accept": "application/hal+json;version=1" }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const taxa = data?._embedded?.taxa || [];
        return taxa[0] || null;
        
    } catch (error) {
        return null;
    }
}

// Handler qui traite un seul taxon à la fois
exports.handler = async function(event) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }
    
    try {
        const { scientific_name, locationId } = JSON.parse(event.body);
        
        if (!scientific_name) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Nom scientifique requis' })
            };
        }
        
        // Rechercher le taxon
        const taxon = await searchTaxon(scientific_name);
        
        if (!taxon) {
            return {
                statusCode: 200,
                body: JSON.stringify({
                    "Nom scientifique": scientific_name,
                    "ID Taxon (cd_nom)": "",
                    "Erreur": "Non trouvé",
                    "lrm": "", "lre": "", "lrn": "", "lrr": "",
                    "pn": "", "pr": "", "pd": "",
                    "dh": "", "do": "", "bern": "", "bonn": "", "zdet": ""
                })
            };
        }
        
        // Résultat de base
        const result = {
            "Nom scientifique": taxon.scientificName,
            "ID Taxon (cd_nom)": taxon.id,
            "Erreur": "",
            "lrm": "", "lre": "", "lrn": "", "lrr": "",
            "pn": "", "pr": "", "pd": "",
            "dh": "", "do": "", "bern": "", "bonn": "", "zdet": ""
        };
        
        // Essayer de récupérer les statuts
        try {
            let statusUrl = `${API_BASE}/status/search/columns?taxrefId=${taxon.id}`;
            if (locationId) {
                statusUrl += `&locationId=${locationId}`;
            }
            
            const statusResponse = await fetch(statusUrl, {
                headers: { "Accept": "application/hal+json;version=1" }
            });
            
            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                const statuses = statusData?._embedded?.taxonStatuses || [];
                
                if (statuses.length > 0) {
                    const status = statuses[0];
                    result.lrm = status.worldRedList || "";
                    result.lre = status.europeanRedList || "";
                    result.lrn = status.nationalRedList || "";
                    result.lrr = status.localRedList || "";
                    result.pn = status.nationalProtection || "";
                    result.pr = status.regionalProtection || "";
                    result.pd = status.departementalProtection || "";
                    result.dh = status.hffDirective || "";
                    result.do = status.birdDirective || "";
                    result.bern = status.bernConvention || "";
                    result.bonn = status.bonnConvention || "";
                    result.zdet = status.determinanteZnieff || "";
                }
            }
        } catch (error) {
            // Ignorer les erreurs de statuts
        }
        
        return {
            statusCode: 200,
            body: JSON.stringify(result)
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Erreur serveur' })
        };
    }
};
