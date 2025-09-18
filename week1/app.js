// Titanic EDA: identify factors affecting survival

let trainData = []; // store parsed CSV data

// Utility: compute mean
function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Utility: compute std
function std(arr) {
    const m = mean(arr);
    return Math.sqrt(mean(arr.map(x => (x - m) ** 2)));
}

// Load Data Button
document.getElementById('loadBtn').addEventListener('click', () => {
    const file = document.getElementById('trainFile').files[0];
    if (!file) { alert('Please select train.csv'); return; }

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            trainData = results.data;
            alert('Data loaded successfully!');
            renderOverview();
            runEDA();
        },
        error: function(err) { alert('Error parsing CSV: ' + err); }
    });
});

// Overview: show table preview and shape
function renderOverview() {
    const previewRows = trainData.slice(0, 5);
    let html = '<table><tr>' + Object.keys(previewRows[0]).map(k => `<th>${k}</th>`).join('') + '</tr>';
    previewRows.forEach(row => {
        html += '<tr>' + Object.values(row).map(v => `<td>${v}</td>`).join('') + '</tr>';
    });
    html += '</table>';
    document.getElementById('tablePreview').innerHTML = html;
    document.getElementById('shape').innerText = `Rows: ${trainData.length}, Columns: ${Object.keys(trainData[0]).length}`;
}

// EDA Workflow
function runEDA() {
    renderMissing();
    renderStats();
    renderFeatureImportance();
}

// Missing Values
function renderMissing() {
    const cols = Object.keys(trainData[0]);
    const missingCounts = cols.map(col => trainData.filter(r => r[col] === null || r[col] === "").length);
    const ctx = document.getElementById('missingChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: { labels: cols, datasets: [{ label: '% Missing', data: missingCounts.map(c => (c / trainData.length) * 100), backgroundColor: 'orange' }] },
        options: { scales: { y: { beginAtZero: true, max: 100 } } }
    });
}

// Stats Summary
function renderStats() {
    const numericCols = ['Age','SibSp','Parch','Fare'];
    const categoricalCols = ['Pclass','Sex','Embarked'];
    let html = '<h3>Numeric Stats (grouped by Survived)</h3>';
    numericCols.forEach(col => {
        const survived0 = trainData.filter(r => r.Survived === 0).map(r => r[col]).filter(v => v != null);
        const survived1 = trainData.filter(r => r.Survived === 1).map(r => r[col]).filter(v => v != null);
        html += `<p>${col}: Survived=0 → mean: ${mean(survived0).toFixed(2)}, std: ${std(survived0).toFixed(2)}; Survived=1 → mean: ${mean(survived1).toFixed(2)}, std: ${std(survived1).toFixed(2)}</p>`;
    });
    html += '<h3>Categorical Counts (grouped by Survived)</h3>';
    categoricalCols.forEach(col => {
        const counts0 = {};
        const counts1 = {};
        trainData.filter(r => r.Survived===0).forEach(r => counts0[r[col]] = (counts0[r[col]]||0)+1);
        trainData.filter(r => r.Survived===1).forEach(r => counts1[r[col]] = (counts1[r[col]]||0)+1);
        html += `<p>${col} → Survived=0: ${JSON.stringify(counts0)}, Survived=1: ${JSON.stringify(counts1)}</p>`;
    });
    document.getElementById('statsSummary').innerHTML = html;
}

// Feature Importance / Factor Analysis via basic visualizations
function renderFeatureImportance() {
    const categoricalCols = ['Pclass','Sex','Embarked'];
    const numericCols = ['Age','Fare'];

    const container = document.getElementById('featureCharts');
    container.innerHTML = '';

    // Categorical bar charts
    categoricalCols.forEach(col => {
        const ctx = document.createElement('canvas');
        container.appendChild(ctx);
        const labels = [...new Set(trainData.map(r=>r[col]))];
        const survived0 = labels.map(l => trainData.filter(r=>r[col]===l && r.Survived===0).length);
        const survived1 = labels.map(l => trainData.filter(r=>r[col]===l && r.Survived===1).length);
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels, datasets: [
                { label: 'Survived=0', data: survived0, backgroundColor: 'red' },
                { label: 'Survived=1', data: survived1, backgroundColor: 'green' }
            ] },
            options: { responsive:true, plugins: { title:{display:true,text:col} } }
        });
    });

    // Numeric histograms
    numericCols.forEach(col => {
        const ctx = document.createElement('canvas');
        container.appendChild(ctx);
        const survived0 = trainData.filter(r=>r.Survived===0 && r[col]!=null).map(r=>r[col]);
        const survived1 = trainData.filter(r=>r.Survived===1 && r[col]!=null).map(r=>r[col]);
        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: Array.from({length:10}, (_,i)=>i), datasets:[
                { label: 'Survived=0', data: binData(survived0,10), backgroundColor:'red' },
                { label: 'Survived=1', data: binData(survived1,10), backgroundColor:'green' }
            ]},
            options:{responsive:true, plugins:{title:{display:true,text:col+' distribution'}}}
        });
    });
}

// Helper: bin numeric data into n bins
function binData(arr, n) {
    const min = Math.min(...arr), max = Math.max(...arr);
    const step = (max - min) / n;
    const bins = Array(n).fill(0);
    arr.forEach(v => {
        let idx = Math.floor((v - min)/step);
        if(idx===n) idx=n-1;
        bins[idx]++;
    });
    return bins;
}

// Export CSV
document.getElementById('exportCSV').addEventListener('click', () => {
    if(!trainData.length){alert('No data loaded'); return;}
    const csv = Papa.unparse(trainData);
    const blob = new Blob([csv], {type: 'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='titanic_train_processed.csv'; a.click();
});

// Export JSON Summary
document.getElementById('exportJSON').addEventListener('click', () => {
    if(!trainData.length){alert('No data loaded'); return;}
    const summary = {
        rows: trainData.length,
        columns: Object.keys(trainData[0]),
    };
    const blob = new Blob([JSON.stringify(summary,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='titanic_train_summary.json'; a.click();
});
