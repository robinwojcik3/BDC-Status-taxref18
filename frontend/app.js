document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const exportBtn = document.getElementById('export-btn');
    const taxonInput = document.getElementById('taxon-input');
    const statusContainer = document.getElementById('status-message');
    const resultContainer = document.getElementById('result-container');
    const regionSelect = document.getElementById('region-select');
    const departementSelect = document.getElementById('departement-select');

    let currentData = [];

    const localisationData = {
        "Auvergne-Rhône-Alpes": { code: "R84", departs: { "Ain": "01", "Allier": "03", "Ardèche": "07", "Cantal": "15", "Drôme": "26", "Isère": "38", "Loire": "42", "Haute-Loire": "43", "Puy-de-Dôme": "63", "Rhône": "69", "Savoie": "73", "Haute-Savoie": "74" } },
        "Bourgogne-Franche-Comté": { code: "R27", departs: { "Côte-d'Or": "21", "Doubs": "25", "Jura": "39", "Nièvre": "58", "Haute-Saône": "70", "Saône-et-Loire": "71", "Yonne": "89", "Territoire de Belfort": "90" } },
        "Bretagne": { code: "R53", departs: { "Côtes-d'Armor": "22", "Finistère": "29", "Ille-et-Vilaine": "35", "Morbihan": "56" } },
        "Centre-Val de Loire": { code: "R24", departs: { "Cher": "18", "Eure-et-Loir": "28", "Indre": "36", "Indre-et-Loire": "37", "Loir-et-Cher": "41", "Loiret": "45" } },
        "Corse": { code: "R94", departs: { "Corse-du-Sud": "2A", "Haute-Corse": "2B" } },
        "Grand Est": { code: "R44", departs: { "Ardennes": "08", "Aube": "10", "Marne": "51", "Haute-Marne": "52", "Meurthe-et-Moselle": "54", "Meuse": "55", "Moselle": "57", "Bas-Rhin": "67", "Haut-Rhin": "68", "Vosges": "88" } },
        "Hauts-de-France": { code: "R32", departs: { "Aisne": "02", "Nord": "59", "Oise": "60", "Pas-de-Calais": "62", "Somme": "80" } },
        "Île-de-France": { code: "R11", departs: { "Paris": "75", "Seine-et-Marne": "77", "Yvelines": "78", "Essonne": "91", "Hauts-de-Seine": "92", "Seine-Saint-Denis": "93", "Val-de-Marne": "94", "Val-d'Oise": "95" } },
        "Normandie": { code: "R28", departs: { "Calvados": "14", "Eure": "27", "Manche": "50", "Orne": "61", "Seine-Maritime": "76" } },
        "Nouvelle-Aquitaine": { code: "R75", departs: { "Charente": "16", "Charente-Maritime": "17", "Corrèze": "19", "Creuse": "23", "Dordogne": "24", "Gironde": "33", "Landes": "40", "Lot-et-Garonne": "47", "Pyrénées-Atlantiques": "64", "Deux-Sèvres": "79", "Vienne": "86", "Haute-Vienne": "87" } },
        "Occitanie": { code: "R76", departs: { "Ariège": "09", "Aude": "11", "Aveyron": "12", "Gard": "30", "Haute-Garonne": "31", "Gers": "32", "Hérault": "34", "Lot": "46", "Lozère": "48", "Hautes-Pyrénées": "65", "Pyrénées-Orientales": "66", "Tarn": "81", "Tarn-et-Garonne": "82" } },
        "Pays de la Loire": { code: "R52", departs: { "Loire-Atlantique": "44", "Maine-et-Loire": "49", "Mayenne": "53", "Sarthe": "72", "Vendée": "85" } },
        "Provence-Alpes-Côte d'Azur": { code: "R93", departs: { "Alpes-de-Haute-Provence": "04", "Hautes-Alpes": "05", "Alpes-Maritimes": "06", "Bouches-du-Rhône": "13", "Var": "83", "Vaucluse": "84" } }
    };

    function populateRegions() {
        Object.keys(localisationData).sort().forEach(regionName => {
            const option = document.createElement('option');
            option.value = `reg:${localisationData[regionName].code}`;
            option.textContent = regionName;
            regionSelect.appendChild(option);
        });
    }

    regionSelect.addEventListener('change', () => {
        const regionCode = regionSelect.value.split(':')[1];
        departementSelect.innerHTML = '<option value="">Toute la région</option>';
        departementSelect.disabled = true;

        if (regionCode) {
            const regionName = Object.keys(localisationData).find(key => localisationData[key].code === regionCode);
            if (regionName) {
                const departments = localisationData[regionName].departs;
                Object.keys(departments).sort().forEach(deptName => {
                    const option = document.createElement('option');
                    option.value = `dep:${departments[deptName]}`;
                    option.textContent = `${deptName} (${departments[deptName]})`;
                    departementSelect.appendChild(option);
                });
                departementSelect.disabled = false;
            }
        }
    });

    generateBtn.addEventListener('click', async () => {
        resultContainer.innerHTML = '';
        exportBtn.classList.add('hidden');
        statusContainer.innerHTML = '<div class="spinner"></div>';

        const names = taxonInput.value.split(/\n+/).map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean);
        if (names.length === 0) {
            statusContainer.innerHTML = '<p class="error-message">Veuillez saisir au moins un nom de taxon.</p>';
            return;
        }

        let locationId = departementSelect.value || regionSelect.value;
        
        try {
            const response = await fetch('/api/generer-tableau', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scientific_names: names,
                    locationId: locationId
                })
            });

            statusContainer.innerHTML = '';
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
            }

            const data = await response.json();
            currentData = data;
            displayResults(data);

        } catch (err) {
            console.error(err);
            statusContainer.innerHTML = `<p class="error-message">Une erreur est survenue : ${err.message}</p>`;
        }
    });

    // --- NOUVELLE FONCTION D'AFFICHAGE CI-DESSOUS ---
    function displayResults(data) {
        resultContainer.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
            statusContainer.innerHTML = '<p>Aucun résultat à afficher.</p>';
            return;
        }

        // Définition des colonnes à afficher, en correspondance avec les "statusTypeName" de l'API
        const colonnesAAfficher = [
            { header: "Liste rouge mondiale", key: "Liste rouge mondiale UICN" },
            { header: "Liste rouge européenne", key: "Liste rouge européenne UICN" },
            { header: "Liste rouge nationale", key: "Liste rouge nationale UICN" },
            { header: "Liste rouge régionale", key: "Liste rouge régionale" },
            { header: "Protection nationale", key: "Protection nationale" },
            { header: "Protection régionale", key: "Protection régionale" },
            { header: "Protection départementale", key: "Protection départementale" },
            { header: "Directive Habitat", key: "Directive \"Habitats, Faune, Flore\"" },
            { header: "Directive Oiseaux", key: "Directive \"Oiseaux\"" },
            { header: "Convention de Berne", key: "Convention de Berne" },
            { header: "Convention de Bonn", key: "Convention de Bonn" },
            { header: "Convention OSPAR", key: "Convention OSPAR" },
            { header: "Convention de Barcelone", key: "Convention de Barcelone" },
            { header: "ZNIEFF Déterminantes", key: "Déterminant ZNIEFF de type 1" },
            { header: "Réglementation", key: "Réglementation des espèces exotiques envahissantes" },
        ];
        
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        
        // Création des en-têtes fixes
        ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur', ...colonnesAAfficher.map(c => c.header)].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        // Remplissage du corps du tableau
        const tbody = document.createElement('tbody');
        data.forEach(row => {
            const tr = document.createElement('tr');
            
            // Cellules de base
            ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur'].forEach(key => {
                const td = document.createElement('td');
                td.textContent = row[key] || '';
                tr.appendChild(td);
            });

            // Cellules pour les statuts
            colonnesAAfficher.forEach(colonne => {
                const td = document.createElement('td');
                const val = row[colonne.key] || ''; // Cherche la clé correspondante dans les données reçues
                td.textContent = val;

                if (colonne.header.toLowerCase().includes('liste rouge')) {
                    const code = val.split(' ')[0]; // Extrait le code (ex: "LC") de la valeur
                    if (code === 'LC') td.classList.add('status-lc');
                    else if (code === 'NT') td.classList.add('status-nt');
                    else if (code === 'VU') td.classList.add('status-vu');
                    else if (code === 'EN') td.classList.add('status-en');
                    else if (code === 'CR') td.classList.add('status-cr');
                    else if (code === 'DD') td.classList.add('status-dd');
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        resultContainer.appendChild(table);

        exportBtn.classList.remove('hidden');
    }
    
    // La fonction exportToCsv est laissée telle quelle pour l'instant
    function exportToCsv(data, filename) {
        if (data.length === 0) return;
        const allHeaders = new Set();
        data.forEach(row => Object.keys(row).forEach(key => allHeaders.add(key)));
        const preferredOrder = ["Nom scientifique", "ID Taxon (cd_nom)", "Erreur"];
        const headers = [...new Set([...preferredOrder, ...allHeaders])].filter(h => allHeaders.has(h));
        const replacer = (key, value) => value === null ? '' : value;
        const csvRows = data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || '', replacer)).join(','));
        const csvString = [headers.join(','), ...csvRows].join('\r\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    populateRegions();
});
