document.addEventListener('DOMContentLoaded', () => {
    // Éléments du DOM
    const generateBtn = document.getElementById('generate-btn');
    const exportBtn = document.getElementById('export-btn');
    const taxonInput = document.getElementById('taxon-input');
    const statusContainer = document.getElementById('status-message');
    const resultContainer = document.getElementById('result-container');
    const regionSelect = document.getElementById('region-select');
    const departementSelect = document.getElementById('departement-select');
    
    let currentData = [];
    const CHUNK_SIZE = 5; // Réduit pour éviter les timeouts

    // Données des régions et départements
    const localisationData = {
        "Auvergne-Rhône-Alpes": { code: "84", departs: { "Ain": "01", "Allier": "03", "Ardèche": "07", "Cantal": "15", "Drôme": "26", "Isère": "38", "Loire": "42", "Haute-Loire": "43", "Puy-de-Dôme": "63", "Rhône": "69", "Savoie": "73", "Haute-Savoie": "74" } },
        "Bourgogne-Franche-Comté": { code: "27", departs: { "Côte-d'Or": "21", "Doubs": "25", "Jura": "39", "Nièvre": "58", "Haute-Saône": "70", "Saône-et-Loire": "71", "Yonne": "89", "Territoire de Belfort": "90" } },
        "Bretagne": { code: "53", departs: { "Côtes-d'Armor": "22", "Finistère": "29", "Ille-et-Vilaine": "35", "Morbihan": "56" } },
        "Centre-Val de Loire": { code: "24", departs: { "Cher": "18", "Eure-et-Loir": "28", "Indre": "36", "Indre-et-Loire": "37", "Loir-et-Cher": "41", "Loiret": "45" } },
        "Corse": { code: "94", departs: { "Corse-du-Sud": "2A", "Haute-Corse": "2B" } },
        "Grand Est": { code: "44", departs: { "Ardennes": "08", "Aube": "10", "Marne": "51", "Haute-Marne": "52", "Meurthe-et-Moselle": "54", "Meuse": "55", "Moselle": "57", "Bas-Rhin": "67", "Haut-Rhin": "68", "Vosges": "88" } },
        "Hauts-de-France": { code: "32", departs: { "Aisne": "02", "Nord": "59", "Oise": "60", "Pas-de-Calais": "62", "Somme": "80" } },
        "Île-de-France": { code: "11", departs: { "Paris": "75", "Seine-et-Marne": "77", "Yvelines": "78", "Essonne": "91", "Hauts-de-Seine": "92", "Seine-Saint-Denis": "93", "Val-de-Marne": "94", "Val-d'Oise": "95" } },
        "Normandie": { code: "28", departs: { "Calvados": "14", "Eure": "27", "Manche": "50", "Orne": "61", "Seine-Maritime": "76" } },
        "Nouvelle-Aquitaine": { code: "75", departs: { "Charente": "16", "Charente-Maritime": "17", "Corrèze": "19", "Creuse": "23", "Dordogne": "24", "Gironde": "33", "Landes": "40", "Lot-et-Garonne": "47", "Pyrénées-Atlantiques": "64", "Deux-Sèvres": "79", "Vienne": "86", "Haute-Vienne": "87" } },
        "Occitanie": { code: "76", departs: { "Ariège": "09", "Aude": "11", "Aveyron": "12", "Gard": "30", "Haute-Garonne": "31", "Gers": "32", "Hérault": "34", "Lot": "46", "Lozère": "48", "Hautes-Pyrénées": "65", "Pyrénées-Orientales": "66", "Tarn": "81", "Tarn-et-Garonne": "82" } },
        "Pays de la Loire": { code: "52", departs: { "Loire-Atlantique": "44", "Maine-et-Loire": "49", "Mayenne": "53", "Sarthe": "72", "Vendée": "85" } },
        "Provence-Alpes-Côte d'Azur": { code: "93", departs: { "Alpes-de-Haute-Provence": "04", "Hautes-Alpes": "05", "Alpes-Maritimes": "06", "Bouches-du-Rhône": "13", "Var": "83", "Vaucluse": "84" } }
    };

    // Colonnes à afficher dans le tableau
    const colonnesAAfficher = [
        { header: "Liste rouge mondiale", key: "lrm" },
        { header: "Liste rouge européenne", key: "lre" },
        { header: "Liste rouge nationale", key: "lrn" },
        { header: "Liste rouge régionale", key: "lrr" },
        { header: "Protection nationale", key: "pn" },
        { header: "Protection régionale", key: "pr" },
        { header: "Protection départementale", key: "pd" },
        { header: "Directive Habitat", key: "dh" },
        { header: "Directive Oiseaux", key: "do" },
        { header: "Convention de Berne", key: "bern" },
        { header: "Convention de Bonn", key: "bonn" },
        { header: "ZNIEFF Déterminantes", key: "zdet" }
    ];
    
    // Initialiser les régions
    function populateRegions() {
        Object.keys(localisationData).sort().forEach(regionName => {
            const option = document.createElement('option');
            option.value = localisationData[regionName].code;
            option.textContent = regionName;
            regionSelect.appendChild(option);
        });
    }

    // Gérer le changement de région
    regionSelect.addEventListener('change', () => {
        const regionCode = regionSelect.value;
        departementSelect.innerHTML = '<option value="">Toute la région</option>';
        departementSelect.disabled = true;
        
        if (regionCode) {
            const regionName = Object.keys(localisationData).find(key => localisationData[key].code === regionCode);
            if (regionName) {
                const departments = localisationData[regionName].departs;
                Object.keys(departments).sort().forEach(deptName => {
                    const option = document.createElement('option');
                    option.value = departments[deptName];
                    option.textContent = `${deptName} (${departments[deptName]})`;
                    departementSelect.appendChild(option);
                });
                departementSelect.disabled = false;
            }
        }
    });

    // Créer la structure du tableau
    function createTableStructure() {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        
        // Headers
        const headers = ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur', ...colonnesAAfficher.map(c => c.header)];
        headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            trHead.appendChild(th);
        });
        
        thead.appendChild(trHead);
        table.appendChild(thead);
        table.appendChild(document.createElement('tbody'));
        
        return table;
    }

    // Ajouter des données au tableau
    function appendDataToTable(data, tbody) {
        console.log('Ajout de', data.length, 'lignes au tableau');
        
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            // Colonnes fixes
            ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur'].forEach(key => {
                const td = document.createElement('td');
                td.textContent = row[key] || '';
                tr.appendChild(td);
            });
            
            // Colonnes de statuts
            colonnesAAfficher.forEach(colonne => {
                const td = document.createElement('td');
                const value = row[colonne.key] || '';
                td.textContent = value;
                
                // Coloration pour les listes rouges
                if (colonne.key.startsWith('lr') && value) {
                    const code = value.split(' ')[0];
                    switch(code) {
                        case 'LC': td.classList.add('status-lc'); break;
                        case 'NT': td.classList.add('status-nt'); break;
                        case 'VU': td.classList.add('status-vu'); break;
                        case 'EN': td.classList.add('status-en'); break;
                        case 'CR': td.classList.add('status-cr'); break;
                        case 'DD': td.classList.add('status-dd'); break;
                    }
                }
                
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
    }

    // Traiter les données par lots
    async function processInChunks(names, locationId) {
        currentData = [];
        exportBtn.classList.add('hidden');
        resultContainer.innerHTML = '';
        statusContainer.classList.remove('error-message');
        
        // Créer le tableau
        const table = createTableStructure();
        resultContainer.appendChild(table);
        const tbody = table.querySelector('tbody');
        
        // Diviser en lots
        const chunks = [];
        for (let i = 0; i < names.length; i += CHUNK_SIZE) {
            chunks.push(names.slice(i, i + CHUNK_SIZE));
        }
        
        statusContainer.textContent = `Traitement de ${names.length} taxons en ${chunks.length} lots...`;
        
        // Traiter chaque lot
        for (let i = 0; i < chunks.length; i++) {
            statusContainer.textContent = `Traitement du lot ${i + 1}/${chunks.length}...`;
            
            try {
                const response = await fetch('/api/generer-tableau', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scientific_names: chunks[i],
                        locationId: locationId || null
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`Erreur HTTP ${response.status}`);
                }
                
                const data = await response.json();
                console.log(`Lot ${i + 1} reçu:`, data);
                
                if (Array.isArray(data)) {
                    currentData.push(...data);
                    appendDataToTable(data, tbody);
                }
                
            } catch (error) {
                console.error(`Erreur lot ${i + 1}:`, error);
                
                // Ajouter des lignes d'erreur pour ce lot
                const errorData = chunks[i].map(name => ({
                    'Nom scientifique': name,
                    'ID Taxon (cd_nom)': '',
                    'Erreur': 'Erreur de traitement'
                }));
                
                currentData.push(...errorData);
                appendDataToTable(errorData, tbody);
            }
            
            // Petite pause entre les lots
            if (i < chunks.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // Message final
        const successCount = currentData.filter(d => !d.Erreur || d.Erreur === '').length;
        statusContainer.textContent = `Terminé. ${successCount} taxons traités avec succès sur ${names.length}.`;
        
        if (currentData.length > 0) {
            exportBtn.classList.remove('hidden');
        }
    }

    // Bouton générer
    generateBtn.addEventListener('click', () => {
        const input = taxonInput.value.trim();
        if (!input) {
            statusContainer.textContent = 'Veuillez saisir au moins un nom de taxon.';
            statusContainer.classList.add('error-message');
            return;
        }
        
        const names = input.split('\n').map(n => n.trim()).filter(n => n.length > 0);
        const locationId = departementSelect.value || regionSelect.value || null;
        
        console.log('Démarrage du traitement:', names.length, 'taxons');
        processInChunks(names, locationId);
    });

    // Export CSV
    function exportToCsv(data, filename) {
        if (!data || data.length === 0) return;
        
        // Headers
        const headers = ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur', ...colonnesAAfficher.map(c => c.header)];
        const keys = ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur', ...colonnesAAfficher.map(c => c.key)];
        
        // Créer le CSV
        const csvRows = [headers.join(',')];
        
        data.forEach(row => {
            const values = keys.map(key => {
                const value = row[key] || '';
                // Échapper les valeurs contenant des virgules ou des guillemets
                if (value.includes(',') || value.includes('"')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        });
        
        // Créer le blob et télécharger
        const csvContent = '\uFEFF' + csvRows.join('\r\n'); // BOM pour UTF-8
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    
    exportBtn.addEventListener('click', () => {
        const date = new Date().toISOString().slice(0, 10);
        exportToCsv(currentData, `statuts_taxref_${date}.csv`);
    });
    
    // Initialiser
    populateRegions();
});
