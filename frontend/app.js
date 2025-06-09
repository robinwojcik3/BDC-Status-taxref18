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
    let isProcessing = false;

    // Données des régions
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

    // Colonnes
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

    // Créer le tableau
    function createTable() {
        const container = document.createElement('div');
        container.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Nom scientifique</th>
                        <th>ID Taxon (cd_nom)</th>
                        <th>Erreur</th>
                        ${colonnesAAfficher.map(c => `<th>${c.header}</th>`).join('')}
                    </tr>
                </thead>
                <tbody id="table-body"></tbody>
            </table>
        `;
        return container.firstElementChild;
    }

    // Ajouter une ligne au tableau
    function addRowToTable(data) {
        const tbody = document.getElementById('table-body');
        const tr = document.createElement('tr');
        
        // Colonnes fixes
        tr.innerHTML = `
            <td>${data['Nom scientifique'] || ''}</td>
            <td>${data['ID Taxon (cd_nom)'] || ''}</td>
            <td>${data['Erreur'] || ''}</td>
        `;
        
        // Colonnes de statuts
        colonnesAAfficher.forEach(col => {
            const td = document.createElement('td');
            const value = data[col.key] || '';
            td.textContent = value;
            
            // Coloration des listes rouges
            if (col.key.startsWith('lr') && value) {
                const code = value.split(' ')[0];
                switch(code) {
                    case 'LC': td.className = 'status-lc'; break;
                    case 'NT': td.className = 'status-nt'; break;
                    case 'VU': td.className = 'status-vu'; break;
                    case 'EN': td.className = 'status-en'; break;
                    case 'CR': td.className = 'status-cr'; break;
                    case 'DD': td.className = 'status-dd'; break;
                }
            }
            
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    }

    // Traiter un seul taxon
    async function processSingleTaxon(name, locationId) {
        try {
            const response = await fetch('/api/generer-tableau', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scientific_names: [name],
                    locationId: locationId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            return data[0] || {
                "Nom scientifique": name,
                "Erreur": "Erreur serveur"
            };
            
        } catch (error) {
            console.error(`Erreur pour ${name}:`, error);
            return {
                "Nom scientifique": name,
                "Erreur": "Erreur réseau"
            };
        }
    }

    // Traiter tous les taxons un par un
    async function processAllTaxons(names, locationId) {
        isProcessing = true;
        currentData = [];
        exportBtn.classList.add('hidden');
        generateBtn.disabled = true;
        
        // Créer le tableau
        resultContainer.innerHTML = '';
        const table = createTable();
        resultContainer.appendChild(table);
        
        // Traiter chaque taxon
        for (let i = 0; i < names.length; i++) {
            statusContainer.textContent = `Traitement ${i + 1}/${names.length}: ${names[i]}...`;
            
            const result = await processSingleTaxon(names[i], locationId);
            currentData.push(result);
            addRowToTable(result);
            
            // Petite pause entre les requêtes
            if (i < names.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        // Terminé
        const successCount = currentData.filter(d => !d.Erreur || d.Erreur === '').length;
        statusContainer.textContent = `Terminé. ${successCount} taxons traités avec succès sur ${names.length}.`;
        
        if (currentData.length > 0) {
            exportBtn.classList.remove('hidden');
        }
        
        generateBtn.disabled = false;
        isProcessing = false;
    }

    // Bouton générer
    generateBtn.addEventListener('click', () => {
        if (isProcessing) return;
        
        const input = taxonInput.value.trim();
        if (!input) {
            statusContainer.textContent = 'Veuillez saisir au moins un nom de taxon.';
            return;
        }
        
        const names = input.split('\n')
            .map(n => n.trim())
            .filter(n => n.length > 0);
        
        const locationId = departementSelect.value || regionSelect.value || null;
        
        processAllTaxons(names, locationId);
    });

    // Export CSV
    function exportToCsv() {
        if (!currentData || currentData.length === 0) return;
        
        const headers = ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur', ...colonnesAAfficher.map(c => c.header)];
        const keys = ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur', ...colonnesAAfficher.map(c => c.key)];
        
        let csv = headers.join(',') + '\n';
        
        currentData.forEach(row => {
            const values = keys.map(key => {
                const value = row[key] || '';
                return value.includes(',') ? `"${value}"` : value;
            });
            csv += values.join(',') + '\n';
        });
        
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `statuts_taxref_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }
    
    exportBtn.addEventListener('click', exportToCsv);
    
    // Initialiser
    populateRegions();
});
