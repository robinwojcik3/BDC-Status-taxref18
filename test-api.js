// Fichier : test-api.js
// Script pour tester directement l'API TAXREF

const fetch = require('node-fetch');

const API_BASE = "https://taxref.mnhn.fr/api";
const HEADERS = { "Accept": "application/hal+json;version=1" };

async function testAPI() {
    console.log('=== Test de l\'API TAXREF ===\n');
    
    try {
        // Test 1: Recherche d'un taxon
        console.log('1. Recherche du taxon "Canis lupus"...');
        const searchUrl = `${API_BASE}/taxa/search?q=Canis%20lupus&size=10`;
        const searchResponse = await fetch(searchUrl, { headers: HEADERS });
        
        if (!searchResponse.ok) {
            console.error(`Erreur recherche: ${searchResponse.status}`);
            return;
        }
        
        const searchData = await searchResponse.json();
        const taxa = searchData?._embedded?.taxa || [];
        
        if (taxa.length === 0) {
            console.log('Aucun taxon trouvé');
            return;
        }
        
        const taxon = taxa[0];
        console.log(`Trouvé: ${taxon.scientificName} (ID: ${taxon.id})`);
        console.log('Structure du taxon:', JSON.stringify(taxon, null, 2));
        
        // Test 2: Récupération des statuts
        console.log('\n2. Récupération des statuts...');
        const statusUrl = `${API_BASE}/status/search/columns?taxrefId=${taxon.id}&size=100`;
        console.log(`URL: ${statusUrl}`);
        
        const statusResponse = await fetch(statusUrl, { headers: HEADERS });
        
        if (!statusResponse.ok) {
            console.error(`Erreur statuts: ${statusResponse.status}`);
            if (statusResponse.status === 404) {
                console.log('Aucun statut trouvé pour ce taxon');
            }
            return;
        }
        
        const statusData = await statusResponse.json();
        console.log('\nStructure de la réponse statuts:');
        console.log('- _embedded existe:', !!statusData._embedded);
        console.log('- taxonStatuses existe:', !!statusData._embedded?.taxonStatuses);
        
        if (statusData._embedded?.taxonStatuses) {
            const statuses = statusData._embedded.taxonStatuses;
            console.log(`- Nombre de statuts: ${statuses.length}`);
            
            if (statuses.length > 0) {
                console.log('\nPremier statut:');
                console.log(JSON.stringify(statuses[0], null, 2));
            }
        }
        
        // Test 3: Test avec localisation (Isère)
        console.log('\n3. Test avec localisation (Isère - 38)...');
        const statusLocUrl = `${API_BASE}/status/search/columns?taxrefId=${taxon.id}&locationId=38&size=100`;
        const statusLocResponse = await fetch(statusLocUrl, { headers: HEADERS });
        
        if (statusLocResponse.ok) {
            const statusLocData = await statusLocResponse.json();
            const statusesLoc = statusLocData._embedded?.taxonStatuses || [];
            console.log(`Nombre de statuts pour l'Isère: ${statusesLoc.length}`);
        }
        
    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Lancer le test
testAPI();
