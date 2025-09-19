// Objeto para manejar toda la lógica de cálculo de datos
const DataProcessor = {
    coefficients: [],
    
    // Genera la matriz de coeficientes inicial
    createCoefficients: function(factor) {
        this.coefficients = [];
        for (let i = 0; i < 3; i++) {
            const row = [];
            for (let j = 0; j < 7; j++) {
                row.push((Math.random() - Math.random()) * factor);
            }
            this.coefficients.push(row);
        }
        return this.coefficients;
    },

    // Genera la serie de datos principal (Y1-Y7, Sumatoria)
    generateSeriesData: function() {
        const series = [];
        for (let x = 0; x <= 360; x++) {
            const point = { x };
            let ySum = 0;
            for (let i = 0; i < 7; i++) {
                const c1 = this.coefficients[0][i];
                const c2 = this.coefficients[1][i];
                const c3 = this.coefficients[2][i];
                const angleRad = ((c2 * x) + c3) * (Math.PI / 180);
                const yVal = c1 * Math.sin(angleRad);
                point[`y${i + 1}`] = yVal;
                ySum += yVal;
            }
            point.ySum = ySum;
            series.push(point);
        }
        return series;
    },

    // Normaliza un dataset dado
    normalize: function(seriesData) {
        const xVals = seriesData.map(d => d.x);
        const yVals = seriesData.map(d => d.ySum);
        const xRange = { min: Math.min(...xVals), max: Math.max(...xVals) };
        const yRange = { min: Math.min(...yVals), max: Math.max(...yVals) };

        return seriesData.map(d => ({
            normX: (d.x - xRange.min) / (xRange.max - xRange.min),
            normY: (d.ySum - yRange.min) / (yRange.max - yRange.min)
        }));
    },

    // Agrupa (bina) los datos normalizados en rangos
    groupIntoBins: function(normalizedData, binSize) {
        const bins = [];
        for (let i = 0; i < 1.0; i = parseFloat((i + binSize).toFixed(4))) {
            const binStart = i;
            const binEnd = binStart + binSize;
            const itemsInBin = normalizedData.filter(d => d.normX >= binStart && d.normX < binEnd);
            if (itemsInBin.length > 0) {
                const ySumInBin = itemsInBin.reduce((sum, item) => sum + item.normY, 0);
                bins.push({
                    rangeStart: binStart,
                    rangeEnd: binEnd,
                    xCenter: (binStart + binEnd) / 2,
                    avgY: ySumInBin / itemsInBin.length
                });
            }
        }
        return bins;
    }
};

// Objeto para manejar todas las actualizaciones de la interfaz de usuario
const UIManager = {
    // Crea una tabla HTML y la inserta en un contenedor
    renderTable: function(containerId, data, headers) {
        const container = document.getElementById(containerId);
        let tableHTML = '<table>';
        if (headers) {
            tableHTML += `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
        }
        tableHTML += '<tbody>';
        data.forEach(row => {
            tableHTML += `<tr>${row.map(cell => `<td>${typeof cell === 'number' ? cell.toFixed(4) : cell}</td>`).join('')}</tr>`;
        });
        tableHTML += '</tbody></table>';
        const existingTable = container.querySelector('table');
        if(existingTable) existingTable.remove();
        container.insertAdjacentHTML('beforeend', tableHTML);
    },

    // Dibuja un gráfico usando Plotly
    renderPlot: function(containerId, traces, title) {
        // 1. Leemos los valores de color del CSS y los guardamos en variables de JavaScript
        const rootStyles = getComputedStyle(document.documentElement);
        const accentColor = rootStyles.getPropertyValue('--accent-color').trim();
        const textColor = rootStyles.getPropertyValue('--text-primary').trim();
        const borderColor = rootStyles.getPropertyValue('--border-color').trim();

        // 2. Ahora construimos el objeto 'layout' usando esas variables (que contienen strings de color válidos como '#00bfff')
        const layout = {
            title: { 
                text: title, 
                font: { color: accentColor } 
            },
            xaxis: { 
                gridcolor: borderColor, 
                zerolinecolor: borderColor 
            },
            yaxis: { 
                gridcolor: borderColor, 
                zerolinecolor: borderColor 
            },
            plot_bgcolor: 'transparent',
            paper_bgcolor: 'transparent',
            font: { 
                color: textColor 
            },
            legend: { 
                orientation: "h", 
                y: 1.15 
            }
        };

        Plotly.newPlot(containerId, traces, layout, {responsive: true});
    }
};

// Función principal que orquesta todo el proceso
function initializeAnalysis() {
    const factor = parseFloat(document.getElementById('input-factor').value) || 0;

    // 1. Cálculos
    const coeffs = DataProcessor.createCoefficients(factor);
    const seriesData = DataProcessor.generateSeriesData();
    const normalized = DataProcessor.normalize(seriesData);
    const bins01 = DataProcessor.groupIntoBins(normalized, 0.1);
    const bins005 = DataProcessor.groupIntoBins(normalized, 0.05);

    // 2. Renderizado de Tablas
    UIManager.renderTable('coefficients-output', coeffs);
    UIManager.renderTable('normalized-data-output', normalized.map(d => [d.normX, d.normY]), ['X_Norm', 'Y_Norm']);
    UIManager.renderTable('binned-data-01-output', bins01.map(d => [d.xCenter, d.avgY]), ['X_Centro', 'Y_Prom']);
    UIManager.renderTable('binned-data-005-output', bins005.map(d => [d.xCenter, d.avgY]), ['X_Centro', 'Y_Prom']);
    
    // 3. Renderizado de Gráficos
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
    UIManager.renderPlot('chart-normalized-output', [{ x: normalized.map(d => d.normX), y: normalized.map(d => d.normY), name: 'Y Norm', line: { color: accent } }], 'Y Normalizada');
    UIManager.renderPlot('chart-binned-01-output', [{ x: bins01.map(d => d.xCenter), y: bins01.map(d => d.avgY), name: 'Rango 0.1', line: { color: accent, shape: 'spline', smoothing: 1.0 } }], 'Y Promedio (Rango 0.1)');
    UIManager.renderPlot('chart-binned-005-output', [{ x: bins005.map(d => d.xCenter), y: bins005.map(d => d.avgY), name: 'Rango 0.05', line: { color: accent, shape: 'spline', smoothing: 1.0 } }], 'Y Promedio (Rango 0.05)');
    UIManager.renderPlot('chart-combined-output', [
        { x: normalized.map(d => d.normX), y: normalized.map(d => d.normY), name: 'Y Norm', line: { color: '#e0e0e0', width: 1.5, opacity: 0.8 } },
        { x: bins01.map(d => d.xCenter), y: bins01.map(d => d.avgY), name: 'Rango 0.1', line: { color: '#ff6347', width: 3, shape: 'spline', smoothing: 1.0 } },
        { x: bins005.map(d => d.xCenter), y: bins005.map(d => d.avgY), name: 'Rango 0.05', line: { color: accent, width: 3, shape: 'spline', smoothing: 1.0 } }
    ], 'Análisis Combinado');
}

// Event Listeners
document.getElementById('execute-button').addEventListener('click', initializeAnalysis);
window.addEventListener('load', initializeAnalysis);