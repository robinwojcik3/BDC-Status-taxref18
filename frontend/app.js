let lastResults = [];

document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('generate-btn');
    const exportBtn = document.getElementById('export-btn');
    const loading = document.getElementById('loading');

    btn.addEventListener('click', () => {
        const textarea = document.getElementById('taxon-input');
        const names = textarea.value.split(/\n+/).map(s => s.trim()).filter(Boolean);
        if (names.length === 0) {
            alert('Veuillez saisir au moins un nom d\'espèce.');
            return;
        }
        loading.classList.remove('hidden');
        fetch('/api/generer-tableau', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scientific_names: names })
        })
            .then(resp => {
                loading.classList.add('hidden');
                if (!resp.ok) {
                    throw new Error('Erreur HTTP ' + resp.status);
                }
                return resp.json();
            })
            .then(data => {
                lastResults = data;
                displayResults(data);
            })
            .catch(err => {
                console.error(err);
                alert('Erreur lors de la récupération des données');
            });
    });

    exportBtn.addEventListener('click', () => {
        if (!lastResults || lastResults.length === 0) {
            alert('Aucune donnée à exporter.');
            return;
        }
        const csv = toCSV(lastResults);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'resultats.csv';
        link.click();
        URL.revokeObjectURL(link.href);
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

function toCSV(data) {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0]);
    const escape = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value).replace(/"/g, '""');
        if (str.search(/[,"\n]/) >= 0) {
            return '"' + str + '"';
        }
        return str;
    };
    const lines = [headers.join(',')];
    data.forEach(row => {
        const vals = headers.map(h => escape(row[h]));
        lines.push(vals.join(','));
    });
    return lines.join('\n');
}
