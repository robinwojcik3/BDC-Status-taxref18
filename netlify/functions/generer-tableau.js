// Fichier : netlify/functions/generer-tableau.js
// VERSION COMPLÈTEMENT REFAITE BASÉE SUR LA DOCUMENTATION API

const fetch = require('node-fetch');

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

// Fonction pour rechercher un taxon par nom
async function searchTaxon(scientificName) {
    try {
        const cleanName = scientificName.trim();
        const url = `${API_BASE}/taxa/search?q=${encodeURIComponent(cleanName)}&size=10`;
        
        console.log(`Recherche du taxon: ${cleanName}`);
        
        const response = await fetch(url, { headers: HEADERS });
        
        if (!response.ok) {
            console.error(`Erreur recherche taxon ${cleanName}: ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        const taxa = data?._embedded?.taxa || [];
        
        // Chercher une correspondance exacte
        const exactMatch = taxa.find(t => t.scientificName === cleanName);
        if (exactMatch) {
            console.log(`Trouvé (exact): ${exactMatch.scientificName} (ID: ${exactMatch.id})`);
            return exactMatch;
        }
        
        // Sinon prendre le premier résultat
        if (taxa.length > 0) {
            console.log(`Trouvé (approx): ${taxa[0].scientificName} (ID: ${taxa[0].id})`);
            return taxa[0];
        }
        
        console.log(`Aucun résultat pour: ${cleanName}`);
        return null;
        
    } catch (error) {
        console.error(`Erreur lors de la recherche de ${scientificName}:`, error);
        return null;
    }
}

// Fonction pour récupérer les statuts en colonnes pour plusieurs taxons
async function getStatusesForTaxa(taxonIds, locationId = null) {
    try {
        if (taxonIds.length === 0) return {};
        
        // Construire l'URL avec les paramètres
        const params = new URLSearchParams();
        taxonIds.forEach(id => params.append('taxrefId', id));
        if (locationId) {
            params.append('locationId', locationId);
        }
        params.append('size', '1000');
        
        const url = `${API_BASE}/status/search/columns?${params}`;
        console.log(`Récupération des statuts pour ${taxonIds.length} taxons`);
        
        const response = await fetch(url, { headers: HEADERS });
        
        if (!response.ok) {
            console.error(`Erreur API statuts: ${response.status}`);
            // Si 404, c'est qu'il n'y a pas de statuts pour ces taxons
            if (response.status === 404) {
                return {};
            }
            return {};
        }
        
        const data = await response.json();
        
        // La structure de la réponse selon la doc
        const statuses = data?._embedded?.taxonStatuses || [];
        
        // Créer un objet avec les statuts par taxon ID
        const statusByTaxonId = {};
        
        statuses.forEach(status => {
            const taxonId = status.taxon?.id;
            if (taxonId) {
                statusByTaxonId[taxonId] = {
                    // Listes rouges
                    lrm: status.worldRedList || '',
                    lre: status.europeanRedList || '',
                    lrn: status.nationalRedList || '',
                    lrr: status.localRedList || '',
                    // Protections
                    pn: status.nationalProtection || '',
                    pr: status.regionalProtection || '',
                    pd: status.departementalProtection || '',
                    // Directives
                    dh: status.hffDirective || '',
                    do: status.birdDirective || '',
                    // Conventions
                    bern: status.bernConvention || '',
                    bonn: status.bonnConvention || '',
                    // ZNIEFF
                    zdet: status.determinanteZnieff || ''
                };
            }
        });
        
        console.log(`Statuts trouvés pour ${Object.keys(statusByTaxonId).length} taxons`);
        return statusByTaxonId;
        
    } catch (error) {
        console.error('Erreur lors de la récupération des statuts:', error);
        return {};
    }
}

// Handler principal
exports.handler = async function(event, context) {
    console.log('Début du traitement de la requête');
    
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }
    
    try {
        const { scientific_names, locationId } = JSON.parse(event.body);
        
        if (!scientific_names || !Array.isArray(scientific_names) || scientific_names.length === 0) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Liste de noms scientifiques requise' })
            };
        }
        
        console.log(`Traitement de ${scientific_names.length} noms scientifiques`);
        if (locationId) {
            console.log(`Localisation: ${locationId}`);
        }
        
        // Étape 1: Rechercher tous les taxons
        const searchPromises = scientific_names.map(name => searchTaxon(name));
        const searchResults = await Promise.all(searchPromises);
        
        // Créer un mapping nom -> résultat de recherche
        const resultsByName = {};
        scientific_names.forEach((name, index) => {
            resultsByName[name] = searchResults[index];
        });
        
        // Collecter les IDs des taxons trouvés
        const foundTaxonIds = [];
        const taxonIdToName = {};
        
        Object.entries(resultsByName).forEach(([originalName, taxon]) => {
            if (taxon && taxon.id) {
                foundTaxonIds.push(taxon.id);
                taxonIdToName[taxon.id] = {
                    originalName,
                    scientificName: taxon.scientificName
                };
            }
        });
        
        console.log(`${foundTaxonIds.length} taxons trouvés sur ${scientific_names.length}`);
        
        // Étape 2: Récupérer les statuts pour tous les taxons trouvés
        const statusesByTaxonId = await getStatusesForTaxa(foundTaxonIds, locationId);
        
        // Étape 3: Construire la réponse finale
        const results = scientific_names.map(originalName => {
            const taxon = resultsByName[originalName];
            
            if (!taxon) {
                // Taxon non trouvé
                return {
                    "Nom scientifique": originalName,
                    "ID Taxon (cd_nom)": "",
                    "Erreur": "Taxon non trouvé"
                };
            }
            
            // Récupérer les statuts pour ce taxon
            const statuses = statusesByTaxonId[taxon.id] || {};
            
            // Construire l'objet résultat
            return {
                "Nom scientifique": taxon.scientificName,
                "ID Taxon (cd_nom)": taxon.id,
                "Erreur": "",
                ...statuses
            };
        });
        
        console.log('Envoi de la réponse avec', results.length, 'résultats');
        
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(results)
        };
        
    } catch (error) {
        console.error('Erreur dans le handler:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: 'Erreur serveur',
                message: error.message 
            })
        };
    }
};
