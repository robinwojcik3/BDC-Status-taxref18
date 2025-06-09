document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('generate-btn');
    btn.addEventListener('click', () => {
        const textarea = document.getElementById('taxon-input');
        const names = textarea.value.split(/\n+/).map(s => s.trim()).filter(Boolean);
        fetch('/api/generer-tableau', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scientific_names: names })
        })
            .then(resp => resp.json())
            .then(data => displayResults(data))
            .catch(err => {
                console.error(err);
                alert('Erreur lors de la récupération des données');
            });
    });

});

function displayResults(data) {
    const container = document.getElementById('result-table');
    container.innerHTML = '';
    if (!Array.isArray(data)) {
        container.textContent = 'Aucune donnée.';
        return;
    }
    const table = document.createElement('table');
    if (data.length === 0) {
        container.textContent = 'Aucune espèce trouvée.';
        return;
    }
    const headers = Object.keys(data[0]);
    const thead = document.createElement('thead');
    const trHead = document.createElement('tr');
    headers.forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(key => {
            const td = document.createElement('td');
            const val = row[key];
            td.textContent = val === null || val === undefined ? '' : val;
            if (key.toLowerCase().includes('liste_rouge')) {
                if (val === 'LC') td.classList.add('status-lc');
                if (val === 'EN') td.classList.add('status-en');
                if (val === 'CR') td.classList.add('status-cr');
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}
