// Fichier : netlify/functions/generer-tableau.js
// VERSION MINIMALE ET ROBUSTE

const fetch = require('node-fetch');

// Configuration
const API_BASE = "https://taxref.mnhn.fr/api";
const TIMEOUT = 8000; // 8 secondes de timeout par requête

// Fonction pour faire une requête avec timeout
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                "Accept": "application/hal+json;version=1",
                ...options.headers
            }
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Timeout de la requête');
        }
        throw error;
    }
}

// Handler principal - SIMPLIFIÉ AU MAXIMUM
exports.handler = async function(event, context) {
    // Log pour debug
    console.log('Requête reçue:', event.httpMethod);
    
    // Vérifier la méthode
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }
    
    try {
        // Parser le body
        const body = JSON.parse(event.body);
        const { scientific_names, locationId } = body;
        
        console.log(`Traitement de ${scientific_names?.length || 0} noms`);
        
        // Validation basique
        if (!scientific_names || !Array.isArray(scientific_names)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Liste de noms requise' })
            };
        }
        
        // Limiter à 5 noms maximum par requête pour éviter les timeouts
        const namesToProcess = scientific_names.slice(0, 5);
        
        // Résultats
        const results = [];
        
        // Traiter chaque nom individuellement
        for (const name of namesToProcess) {
            try {
                console.log(`Traitement de: ${name}`);
                
                // 1. Rechercher le taxon
                const searchUrl = `${API_BASE}/taxa/search?q=${encodeURIComponent(name)}&size=1`;
                const searchResp = await fetchWithTimeout(searchUrl);
                
                if (!searchResp.ok) {
                    results.push({
                        "Nom scientifique": name,
                        "ID Taxon (cd_nom)": "",
                        "Erreur": "Erreur recherche"
                    });
                    continue;
                }
                
                const searchData = await searchResp.json();
                const taxa = searchData?._embedded?.taxa || [];
                
                if (taxa.length === 0) {
                    results.push({
                        "Nom scientifique": name,
                        "ID Taxon (cd_nom)": "",
                        "Erreur": "Non trouvé"
                    });
                    continue;
                }
                
                const taxon = taxa[0];
                
                // 2. Créer l'objet résultat de base
                const result = {
                    "Nom scientifique": taxon.scientificName,
                    "ID Taxon (cd_nom)": taxon.id,
                    "Erreur": "",
                    "lrm": "",
                    "lre": "",
                    "lrn": "",
                    "lrr": "",
                    "pn": "",
                    "pr": "",
                    "pd": "",
                    "dh": "",
                    "do": "",
                    "bern": "",
                    "bonn": "",
                    "zdet": ""
                };
                
                // 3. Essayer de récupérer les statuts (optionnel)
                try {
                    let statusUrl = `${API_BASE}/status/search/columns?taxrefId=${taxon.id}`;
                    if (locationId) {
                        statusUrl += `&locationId=${locationId}`;
                    }
                    
                    const statusResp = await fetchWithTimeout(statusUrl);
                    
                    if (statusResp.ok) {
                        const statusData = await statusResp.json();
                        const statuses = statusData?._embedded?.taxonStatuses || [];
                        
                        if (statuses.length > 0) {
                            const status = statuses[0];
                            // Mapper les statuts
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
                } catch (statusError) {
                    // Ignorer les erreurs de statuts, on a déjà les infos de base
                    console.log(`Erreur statuts pour ${taxon.id}:`, statusError.message);
                }
                
                results.push(result);
                
            } catch (error) {
                console.error(`Erreur pour ${name}:`, error.message);
                results.push({
                    "Nom scientifique": name,
                    "ID Taxon (cd_nom)": "",
                    "Erreur": "Erreur traitement"
                });
            }
        }
        
        // Retourner les résultats
        console.log(`Envoi de ${results.length} résultats`);
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(results)
        };
        
    } catch (error) {
        console.error('Erreur globale:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Erreur serveur',
                message: error.message 
            })
        };
    }
};
