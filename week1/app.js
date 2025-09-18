// app.js
let dataset = null;
let charts = {};

function loadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        alert('Please select a CSV file first.');
        return;
    }
    
    document.getElementById('fileInfo').innerHTML = '<div class="loading">Processing file...</div>';
    
    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            dataset = results.data;
            document.getElementById('fileInfo').innerHTML = `<p>Loaded ${dataset.length} records with ${Object.keys(dataset[0]).length} features each.</p>`;
            document.getElementById('analysisContent').style.display = 'block';
            performAnalysis();
        },
        error: function(error) {
            document.getElementById('fileInfo').innerHTML = `<p>Error: ${error.message}</p>`;
        }
    });
}

function performAnalysis() {
    // Clean and preprocess data
    preprocessData();
    
    // Generate overview
    generateOverview();
    
    // Analyze missing values
    analyzeMissingValues();
    
    // Generate statistical summary
    generateStatsSummary();
    
    // Analyze feature importance
    analyzeFeatureImportance();
    
    // Create visualizations
    createVisualizations();
}

function preprocessData() {
    // Handle missing values
    dataset.forEach(passenger => {
        // Fill missing Age with median
        if (passenger.Age === null || isNaN(passenger.Age)) {
            passenger.Age = calculateMedian(dataset.map(p => p.Age).filter(age => !isNaN(age) && age !== null));
        }
        
        // Fill missing Embarked with mode
        if (!passenger.Embarked) {
            passenger.Embarked = 'S'; // Most common embarkation port
        }
        
        // Extract title from name
        const nameParts = passenger.Name.split(', ');
        if (nameParts.length > 1) {
            const titlePart = nameParts[1].split('. ');
            passenger.Title = titlePart[0];
        } else {
            passenger.Title = 'Unknown';
        }
        
        // Simplify titles
        const commonTitles = ['Mr', 'Miss', 'Mrs', 'Master'];
        if (!commonTitles.includes(passenger.Title)) {
            passenger.Title = 'Other';
        }
        
        // Create family size feature
        passenger.FamilySize = passenger.SibSp + passenger.Parch + 1;
        
        // Create is alone feature
        passenger.IsAlone = passenger.FamilySize === 1 ? 1 : 0;
    });
}

function calculateMedian(values) {
    if (values.length === 0) return 0;
    
    values.sort((a, b) => a - b);
    const half = Math.floor(values.length / 2);
    
    if (values.length % 2 === 0) {
        return (values[half - 1] + values[half]) / 2;
    } else {
        return values[half];
    }
}

function generateOverview() {
    const totalPassengers = dataset.length;
    const survived = dataset.filter(p => p.Survived === 1).length;
    const perished = totalPassengers - survived;
    const survivalRate = (survived / totalPassengers * 100).toFixed(2);
    
    const overviewContent = `
        <p><strong>Total Passengers:</strong> ${totalPassengers}</p>
        <p><strong>Survived:</strong> ${survived} (${survivalRate}%)</p>
        <p><strong>Perished:</strong> ${perished} (${(100 - survivalRate).toFixed(2)}%)</p>
        <p><strong>Features:</strong> ${Object.keys(dataset[0]).join(', ')}</p>
    `;
    
    document.getElementById('overviewContent').innerHTML = overviewContent;
}

function analyzeMissingValues() {
    const features = Object.keys(dataset[0]);
    let missingValuesContent = '<table><tr><th>Feature</th><th>Missing Values</th><th>Percentage</th></tr>';
    
    features.forEach(feature => {
        const missingCount = dataset.filter(p => p[feature] === null || p[feature] === undefined || p[feature] === '').length;
        const percentage = ((missingCount / dataset.length) * 100).toFixed(2);
        
        missingValuesContent += `<tr>
            <td>${feature}</td>
            <td>${missingCount}</td>
            <td>${percentage}%</td>
        </tr>`;
    });
    
    missingValuesContent += '</table>';
    document.getElementById('missingValuesContent').innerHTML = missingValuesContent;
}

function generateStatsSummary() {
    const numericFeatures = ['Age', 'SibSp', 'Parch', 'Fare', 'FamilySize'];
    let statsContent = '<table><tr><th>Feature</th><th>Mean</th><th>Median</th><th>Min</th><th>Max</th></tr>';
    
    numericFeatures.forEach(feature => {
        const values = dataset.map(p => p[feature]).filter(val => !isNaN(val) && val !== null);
        const mean = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
        const median = calculateMedian(values).toFixed(2);
        const min = Math.min(...values).toFixed(2);
        const max = Math.max(...values).toFixed(2);
        
        statsContent += `<tr>
            <td>${feature}</td>
            <td>${mean}</td>
            <td>${median}</td>
            <td>${min}</td>
            <td>${max}</td>
        </tr>`;
    });
    
    statsContent += '</table>';
    document.getElementById('statsSummaryContent').innerHTML = statsContent;
}

function analyzeFeatureImportance() {
    // Analyze categorical features
    const categoricalFeatures = ['Pclass', 'Sex', 'Embarked', 'Title', 'IsAlone'];
    const categoricalResults = {};
    
    categoricalFeatures.forEach(feature => {
        const categories = [...new Set(dataset.map(p => p[feature]))];
        const survivalByCategory = {};
        
        categories.forEach(category => {
            const categoryPassengers = dataset.filter(p => p[feature] === category);
            const survived = categoryPassengers.filter(p => p.Survived === 1).length;
            const total = categoryPassengers.length;
            const survivalRate = (survived / total) * 100;
            
            survivalByCategory[category] = {
                survivalRate: survivalRate,
                total: total,
                survived: survived
            };
        });
        
        categoricalResults[feature] = survivalByCategory;
    });
    
    // Create categorical features chart
    createCategoricalChart(categoricalResults);
    
    // Analyze numeric features
    const numericFeatures = ['Age', 'Fare', 'FamilySize', 'SibSp', 'Parch'];
    const numericResults = {};
    
    numericFeatures.forEach(feature => {
        const survivedValues = dataset.filter(p => p.Survived === 1).map(p => p[feature]);
        const perishedValues = dataset.filter(p => p.Survived === 0).map(p => p[feature]);
        
        numericResults[feature] = {
            survived: survivedValues,
            perished: perishedValues
        };
    });
    
    // Create numeric features chart
    createNumericChart(numericResults);
    
    // Calculate correlation matrix
    calculateCorrelations();
    
    // Determine the most important factor
    determineMostImportantFactor(categoricalResults, numericResults);
}

function createCategoricalChart(results) {
    const features = Object.keys(results);
    const survivalRates = features.map(feature => {
        const categories = Object.keys(results[feature]);
        // Calculate average survival rate difference across categories
        const rates = categories.map(cat => results[feature][cat].survivalRate);
        return Math.max(...rates) - Math.min(...rates);
    });
    
    const ctx = document.getElementById('categoricalChart').getContext('2d');
    
    if (charts.categoricalChart) {
        charts.categoricalChart.destroy();
    }
    
    charts.categoricalChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: features,
            datasets: [{
                label: 'Survival Rate Range (%)',
                data: survivalRates,
                backgroundColor: 'rgba(54, 162, 235, 0.7)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Survival Rate Range (%)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Impact of Categorical Features on Survival'
                }
            }
        }
    });
}

function createNumericChart(results) {
    const features = Object.keys(results);
    const correlations = features.map(feature => {
        const allValues = dataset.map(p => p[feature]);
        const survivedValues = results[feature].survived;
        
        // Simple correlation calculation (could be improved)
        const survivedMean = survivedValues.reduce((a, b) => a + b, 0) / survivedValues.length;
        const allMean = allValues.reduce((a, b) => a + b, 0) / allValues.length;
        
        return Math.abs(survivedMean - allMean) / allMean * 100;
    });
    
    const ctx = document.getElementById('numericChart').getContext('2d');
    
    if (charts.numericChart) {
        charts.numericChart.destroy();
    }
    
    charts.numericChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: features,
            datasets: [{
                label: 'Difference from Mean (%)',
                data: correlations,
                backgroundColor: 'rgba(255, 99, 132, 0.7)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Difference from Mean (%)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Impact of Numeric Features on Survival'
                }
            }
        }
    });
}

function calculateCorrelations() {
    const numericFeatures = ['Age', 'Fare', 'SibSp', 'Parch', 'FamilySize'];
    const correlations = {};
    
    // Calculate correlation with Survived for each numeric feature
    numericFeatures.forEach(feature => {
        const values = dataset.map(p => p[feature]);
        const survived = dataset.map(p => p.Survived);
        
        // Simple correlation calculation
        const meanFeature = values.reduce((a, b) => a + b, 0) / values.length;
        const meanSurvived = survived.reduce((a, b) => a + b, 0) / survived.length;
        
        let numerator = 0;
        let denom1 = 0;
        let denom2 = 0;
        
        for (let i = 0; i < values.length; i++) {
            numerator += (values[i] - meanFeature) * (survived[i] - meanSurvived);
            denom1 += Math.pow(values[i] - meanFeature, 2);
            denom2 += Math.pow(survived[i] - meanSurvived, 2);
        }
        
        const correlation = numerator / Math.sqrt(denom1 * denom2);
        correlations[feature] = isNaN(correlation) ? 0 : correlation;
    });
    
    // Create correlation chart
    const ctx = document.getElementById('correlationChart').getContext('2d');
    
    if (charts.correlationChart) {
        charts.correlationChart.destroy();
    }
    
    charts.correlationChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(correlations),
            datasets: [{
                label: 'Correlation with Survival',
                data: Object.values(correlations),
                backgroundColor: Object.values(correlations).map(c => 
                    c > 0 ? 'rgba(75, 192, 192, 0.7)' : 'rgba(255, 99, 132, 0.7)'
                ),
                borderColor: Object.values(correlations).map(c => 
                    c > 0 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'
                ),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    min: -1,
                    max: 1,
                    title: {
                        display: true,
                        text: 'Correlation Coefficient'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Correlation Between Numeric Features and Survival'
                }
            }
        }
    });
}

function determineMostImportantFactor(categoricalResults, numericResults) {
    // Analyze categorical features impact
    let maxImpact = 0;
    let mostImportantFactor = '';
    let factorDetails = '';
    
    // Check gender impact
    const genderImpact = Math.abs(categoricalResults['Sex']['male'].survivalRate - categoricalResults['Sex']['female'].survivalRate);
    if (genderImpact > maxImpact) {
        maxImpact = genderImpact;
        mostImportantFactor = 'Gender';
        factorDetails = `Female survival rate: ${categoricalResults['Sex']['female'].survivalRate.toFixed(2)}% vs Male: ${categoricalResults['Sex']['male'].survivalRate.toFixed(2)}%`;
    }
    
    // Check passenger class impact
    const pclassValues = Object.values(categoricalResults['Pclass']);
    const pclassImpact = Math.max(...pclassValues.map(v => v.survivalRate)) - Math.min(...pclassValues.map(v => v.survivalRate));
    if (pclassImpact > maxImpact) {
        maxImpact = pclassImpact;
        mostImportantFactor = 'Passenger Class';
        factorDetails = `1st class survival: ${categoricalResults['Pclass']['1'].survivalRate.toFixed(2)}% vs 3rd class: ${categoricalResults['Pclass']['3'].survivalRate.toFixed(2)}%`;
    }
    
    // Check fare correlation
    const fareCorrelation = Math.abs(numericResults['Fare'].survived.reduce((a, b) => a + b, 0) / numericResults['Fare'].survived.length - 
                                   dataset.map(p => p.Fare).reduce((a, b) => a + b, 0) / dataset.length);
    if (fareCorrelation > maxImpact / 10) { // Adjusting scale for comparison
        maxImpact = fareCorrelation * 10;
        mostImportantFactor = 'Fare';
        const avgSurvivedFare = (numericResults['Fare'].survived.reduce((a, b) => a + b, 0) / numericResults['Fare'].survived.length).toFixed(2);
        const avgAllFare = (dataset.map(p => p.Fare).reduce((a, b) => a + b, 0) / dataset.length).toFixed(2);
        factorDetails = `Average fare for survivors: $${avgSurvivedFare} vs all passengers: $${avgAllFare}`;
    }
    
    document.getElementById('keyFinding').innerHTML = `
        <p>The most important factor contributing to passenger death was <strong>${mostImportantFactor}</strong>.</p>
        <p>${factorDetails}</p>
        <p>This suggests that ${mostImportantFactor === 'Gender' ? 'being male significantly decreased survival chances' : 
                             mostImportantFactor === 'Passenger Class' ? 'lower class passengers had much lower survival rates' : 
                             'passengers who paid higher fares had better survival chances'}.</p>
    `;
}

function createVisualizations() {
    // Survival by passenger class
    createPclassChart();
    
    // Survival by gender
    createGenderChart();
    
    // Age distribution
    createAgeChart();
    
    // Survival by embarkation port
    createEmbarkedChart();
}

function createPclassChart() {
    const pclassData = [1, 2, 3].map(pclass => {
        const passengers = dataset.filter(p => p.Pclass === pclass);
        const survived = passengers.filter(p => p.Survived === 1).length;
        const perished = passengers.length - survived;
        return { survived, perished };
    });
    
    const ctx = document.getElementById('pclassChart').getContext('2d');
    
    if (charts.pclassChart) {
        charts.pclassChart.destroy();
    }
    
    charts.pclassChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['1st Class', '2nd Class', '3rd Class'],
            datasets: [
                {
                    label: 'Survived',
                    data: pclassData.map(d => d.survived),
                    backgroundColor: 'rgba(75, 192, 192, 0.7)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Perished',
                    data: pclassData.map(d => d.perished),
                    backgroundColor: 'rgba(255, 99, 132, 0.7)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Passenger Count'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Survival by Passenger Class'
                }
            }
        }
    });
}

function createGenderChart() {
    const genderData = ['male', 'female'].map(gender => {
        const passengers = dataset.filter(p => p.Sex === gender);
        const survived = passengers.filter(p => p.Survived === 1).length;
        const perished = passengers.length - survived;
        return { survived, perished };
    });
    
    const ctx = document.getElementById('genderChart').getContext('2d');
    
    if (charts.genderChart) {
        charts.genderChart.destroy();
    }
    
    charts.genderChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Female Survived', 'Female Perished', 'Male Survived', 'Male Perished'],
            datasets: [{
                data: [
                    genderData[1].survived, 
                    genderData[1].perished, 
                    genderData[0].survived, 
                    genderData[0].perished
                ],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Survival by Gender'
                },
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function createAgeChart() {
    const survivedAges = dataset.filter(p => p.Survived === 1).map(p => p.Age);
    const perishedAges = dataset.filter(p => p.Survived === 0).map(p => p.Age);
    
    const ctx = document.getElementById('ageChart').getContext('2d');
    
    if (charts.ageChart) {
        charts.ageChart.destroy();
    }
    
    charts.ageChart = new Chart(ctx, {
        type: 'histogram',
        data: {
            datasets: [
                {
                    label: 'Survived',
                    data: survivedAges,
                    backgroundColor: 'rgba(75, 192, 192, 0.5)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Perished',
                    data: perishedAges,
                    backgroundColor: 'rgba(255, 99, 132, 0.5)',
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Age'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Frequency'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Age Distribution by Survival'
                }
            }
        }
    });
}

function createEmbarkedChart() {
    const embarkedData = ['C', 'Q', 'S'].map(port => {
        const passengers = dataset.filter(p => p.Embarked === port);
        const survived = passengers.filter(p => p.Survived === 1).length;
        const total = passengers.length;
        const survivalRate = (survived / total * 100).toFixed(2);
        return { survived, total, survivalRate };
    });
    
    const ctx = document.getElementById('embarkedChart').getContext('2d');
    
    if (charts.embarkedChart) {
        charts.embarkedChart.destroy();
    }
    
    charts.embarkedChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Cherbourg', 'Queenstown', 'Southampton'],
            datasets: [{
                label: 'Survival Rate (%)',
                data: embarkedData.map(d => d.survivalRate),
                backgroundColor: 'rgba(153, 102, 255, 0.7)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Survival Rate (%)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Survival Rate by Embarkation Port'
                }
            }
        }
    });
}

// Add histogram chart type
Chart.defaults.datasets.histogram = Chart.defaults.datasets.bar;
Chart.controllers.histogram = Chart.controllers.bar.extend({
    dataElementType: Chart.elements.Rectangle,
    
    updateElement: function(rectangle, index, reset) {
        var me = this;
        var meta = me.getMeta();
        var dataset = me.getDataset();
        var custom = rectangle.custom || {};
        
        var scale = me.chart.scales['x'];
        var base = me.chart.scales['y'].getBasePixel();
        
        rectangle._xScale = me.chart.scales['x'];
        rectangle._yScale = me.chart.scales['y'];
        rectangle._datasetIndex = me.index;
        rectangle._index = index;
        
        var ruler = me.getRuler(index);
        rectangle._model = {
            x: scale.getPixelForValue(Number(dataset.data[index]), index, me.index),
            y: reset ? base : custom.y,
            base: reset ? base : custom.base,
            width: ruler.width,
            height: reset ? 0 : custom.height
        };
        
        rectangle.pivot();
    }
});
