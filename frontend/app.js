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
    const CHUNK_SIZE = 8;

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
    
    function populateRegions() {
        Object.keys(localisationData).sort().forEach(regionName => {
            const option = document.createElement('option');
            option.value = localisationData[regionName].code;
            option.textContent = regionName;
            regionSelect.appendChild(option);
        });
    }

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

    async function processInChunks(names, locationId) {
        currentData = [];
        exportBtn.classList.add('hidden');
        resultContainer.innerHTML = '';
        const table = createTableStructure();
        resultContainer.appendChild(table);
        const tbody = table.querySelector('tbody');
        const nameChunks = [];
        for (let i = 0; i < names.length; i += CHUNK_SIZE) {
            nameChunks.push(names.slice(i, i + CHUNK_SIZE));
        }

        for (let i = 0; i < nameChunks.length; i++) {
            statusContainer.textContent = `Traitement du lot ${i + 1} sur ${nameChunks.length}...`;
            try {
                const response = await fetch('/api/generer-tableau', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scientific_names: nameChunks[i], locationId: locationId })
                });
                if (!response.ok) { throw new Error(`Échec du lot (HTTP ${response.status})`); }
                const chunkData = await response.json();
                currentData.push(...chunkData);
                appendDataToTable(chunkData, tbody);
            } catch (err) {
                statusContainer.textContent = `Une erreur est survenue sur le lot ${i + 1}.`;
                console.error(err);
            }
        }
        statusContainer.textContent = `Terminé. ${names.length} taxons traités.`;
        if (currentData.length > 0) { exportBtn.classList.remove('hidden'); }
    }

    generateBtn.addEventListener('click', () => {
        const names = taxonInput.value.split(/\n+/).filter(Boolean);
        if (names.length === 0) { statusContainer.textContent = 'Veuillez saisir au moins un nom de taxon.'; return; }
        let locationId = departementSelect.value || regionSelect.value;
        processInChunks(names, locationId);
    });

    const colonnesAAfficher = [
        { header: "Liste rouge mondiale", key: "lrm" }, { header: "Liste rouge européenne", key: "lre" },
        { header: "Liste rouge nationale", key: "lrn" }, { header: "Liste rouge régionale", key: "lrr" },
        { header: "Protection nationale", key: "pn" }, { header: "Protection régionale", key: "pr" },
        { header: "Protection départementale", key: "pd" }, { header: "Directive Habitat", key: "dh" },
        { header: "Directive Oiseaux", key: "do" }, { header: "Convention de Berne", key: "bern" },
        { header: "Convention de Bonn", key: "bonn" }, { header: "ZNIEFF Déterminantes", key: "zdet" }
    ];

    function createTableStructure() {
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur', ...colonnesAAfficher.map(c => c.header)].forEach(headerText => {
            const th = document.createElement('th'); th.textContent = headerText; trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);
        table.appendChild(document.createElement('tbody'));
        return table;
    }

    function appendDataToTable(data, tbody) {
        data.forEach(row => {
            const tr = document.createElement('tr');
            ['Nom scientifique', 'ID Taxon (cd_nom)', 'Erreur'].forEach(key => {
                const td = document.createElement('td'); td.textContent = row[key] || ''; tr.appendChild(td);
            });
            colonnesAAfficher.forEach(colonne => {
                const td = document.createElement('td');
                const val = row[colonne.key] || '';
                td.textContent = val;
                if (colonne.key.startsWith('lr')) {
                    const code = val.split(' ')[0];
                    if (code === 'LC') td.classList.add('status-lc'); else if (code === 'NT') td.classList.add('status-nt');
                    else if (code === 'VU') td.classList.add('status-vu'); else if (code === 'EN') td.classList.add('status-en');
                    else if (code === 'CR') td.classList.add('status-cr'); else if (code === 'DD') td.classList.add('status-dd');
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    function exportToCsv(data, filename) {
        if (data.length === 0) return;
        const colonnes = [
            { header: "Nom scientifique", key: "Nom scientifique" }, { header: "ID Taxon (cd_nom)", key: "ID Taxon (cd_nom)" },
            { header: "Erreur", key: "Erreur" }, ...colonnesAAfficher
        ];
        const headers = colonnes.map(c => c.header);
        const csvRows = data.map(row => colonnes.map(col => {
                const value = row[col.key] || '';
                const escaped = ('' + value).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',')
        );
        const csvString = [headers.join(','), ...csvRows].join('\r\n');
        const blob = new Blob([`\uFEFF${csvString}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    populateRegions();
});
