document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const exportBtn = document.getElementById('export-btn');
    const taxonInput = document.getElementById('taxon-input');
    const statusContainer = document.getElementById('status-message');
    const resultContainer = document.getElementById('result-container');

    let currentData = []; // Store the last successful dataset for export

    generateBtn.addEventListener('click', async () => {
        // 1. Reset UI
        resultContainer.innerHTML = '';
        exportBtn.classList.add('hidden');
        statusContainer.innerHTML = '<div class="spinner"></div>'; // Show spinner

        const names = taxonInput.value.split(/\n+/).map(s => s.trim()).filter(Boolean);
        if (names.length === 0) {
            statusContainer.innerHTML = '<p class="error-message">Veuillez saisir au moins un nom de taxon.</p>';
            return;
        }

        try {
            // 2. Fetch data from backend
            const response = await fetch('/api/generer-tableau', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scientific_names: names })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            currentData = data; // Save data for export

            // 3. Display results
            statusContainer.innerHTML = ''; // Clear spinner
            displayResults(data);

        } catch (err) {
            console.error(err);
            statusContainer.innerHTML = `<p class="error-message">Une erreur est survenue : ${err.message}</p>`;
            resultContainer.innerHTML = '';
        }
    });

    exportBtn.addEventListener('click', () => {
        if (currentData.length > 0) {
            exportToCsv(currentData, 'export-statuts-taxref.csv');
        }
    });

    function displayResults(data) {
        resultContainer.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
            statusContainer.innerHTML = '<p>Aucun résultat à afficher.</p>';
            return;
        }

        const table = document.createElement('table');
        const allHeaders = new Set();
        data.forEach(row => {
            Object.keys(row).forEach(key => allHeaders.add(key));
        });

        // Define a preferred header order
        const preferredOrder = ["Nom scientifique", "ID Taxon (cd_nom)", "Erreur"];
        const headers = [...new Set([...preferredOrder, ...allHeaders])].filter(h => allHeaders.has(h));
        
        // Create table header
        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        headers.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement('tbody');
        data.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(key => {
                const td = document.createElement('td');
                const val = row[key];
                td.textContent = val === null || val === undefined ? '' : val;

                // Conditional formatting for Red List statuses
                if (key.toLowerCase().includes('liste rouge')) {
                    if (val === 'LC') td.classList.add('status-lc');
                    if (val === 'EN') td.classList.add('status-en');
                    if (val === 'CR') td.classList.add('status-cr');
                    if (val === 'VU') td.classList.add('status-vu');
                    if (val === 'NT') td.classList.add('status-nt');
                    if (val === 'DD') td.classList.add('status-dd');
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        resultContainer.appendChild(table);

        // Show the export button
        exportBtn.classList.remove('hidden');
    }
});
