/**
 * Charts Module
 * Wrapper for Plotly.js to render scientific scatter plots.
 */

// Colors for comparison mode
const PALETTE = [
    '#38bdf8', // Light Blue
    '#f472b6', // Pink
    '#a3e635', // Lime
    '#fbbf24', // Amber
    '#c084fc', // Purple
    '#22d3ee', // Cyan
    '#f87171'  // Red
];

// Symbols for distinguishing groups (e.g., wells or images)
const SYMBOLS = [
    'circle',
    'square',
    'diamond',
    'cross',
    'x',
    'triangle-up',
    'triangle-down',
    'star'
];

/**
 * Renders the chart based on the provided groups and settings.
 * @param {string} containerId DOM ID of the chart container
 * @param {Array} groups Array of group objects from state.getGroups()
 * @param {string} aggregationMode 'all', 'mean', 'median'
 * @param {string} viewMode 'image', 'well', 'parameter'
 * @param {Object} datasetColors Map of id -> color
 * @param {boolean} isDarkMode
 */
export function renderChart(containerId, groups, aggregationMode, viewMode, datasetColors, isDarkMode = true) {
    const traces = [];
    
    // Theme colors
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

    groups.forEach((group) => {
        // Use color from state
        let groupColor = datasetColors && datasetColors[group.id] ? datasetColors[group.id] : '#000000';
        
        // We need to process the datasets within the group
        
        if (aggregationMode === 'all') {
            // Detailed View: Plot every point
            
            // Subgroups depend on view mode
            // If view = 'well', subgroups are images.
            // If view = 'parameter', subgroups are wells.
            
            const subgroups = organizeSubgroups(group.datasets, viewMode);
            
            subgroups.forEach((sub, subIndex) => {
                const x = [];
                const y = [];
                
                sub.datasets.forEach(ds => {
                    ds.data.forEach(row => {
                        x.push(row.NArea);
                        y.push(row.IntegratedInt);
                    });
                });
                
                traces.push({
                    x: x,
                    y: y,
                    mode: 'markers',
                    type: 'scatter',
                    name: groups.length > 1 ? `${group.label} - ${sub.label}` : sub.label,
                    marker: {
                         // In comparison mode, use group color. Else use default accent or sub-palette?
                         // Prompt: "Comparison mode... assigning different colors to each [graph/group]"
                         color: groups.length > 1 ? groupColor : PALETTE[subIndex % PALETTE.length],
                         symbol: SYMBOLS[subIndex % SYMBOLS.length],
                         size: 8,
                         opacity: 0.7
                    },
                    text: sub.label // Hover info
                });
            });
            
        } else {
            // Aggregated View: Mean or Median
            const subgroups = organizeSubgroups(group.datasets, viewMode);
            
            subgroups.forEach((sub, subIndex) => {
                const subX = [];
                const subY = [];
                const hoverTexts = [];

                sub.datasets.forEach(ds => {
                    const stats = calculateStats(ds.data);
                    const valX = aggregationMode === 'median' ? stats.medianNArea : stats.meanNArea;
                    const valY = aggregationMode === 'median' ? stats.medianInt : stats.meanInt;
                    
                    subX.push(valX);
                    subY.push(valY);
                    hoverTexts.push(ds.metadata.originalName);
                });
                
                traces.push({
                    x: subX,
                    y: subY,
                    mode: 'markers',
                    type: 'scatter',
                    name: groups.length > 1 ? `${group.label} - ${sub.label}` : sub.label,
                    marker: {
                        color: groups.length > 1 ? groupColor : PALETTE[subIndex % PALETTE.length],
                        symbol: SYMBOLS[subIndex % SYMBOLS.length],
                        size: 10,
                        line: { width: 1, color: '#fff' }
                    },
                    text: hoverTexts
                });
            });
        }
    });

    const layout = {
        title: {
            text: 'Integrated Intensity / NArea',
            font: { color: textColor }
        },
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: {
            family: 'Inter, sans-serif',
            color: isDarkMode ? '#94a3b8' : '#64748b'
        },
        xaxis: {
            title: 'NArea',
            gridcolor: gridColor,
            rangemode: 'tozero',
            automargin: true
        },
        yaxis: {
            title: 'IntegratedInt',
            gridcolor: gridColor,
            rangemode: 'tozero',
            automargin: true
        },
        showlegend: true,
        legend: {
            orientation: 'h',
            yanchor: 'bottom',
            y: 1.02,
            xanchor: 'right',
            x: 1,
            font: { color: textColor },
            bgcolor: 'rgba(0,0,0,0)',
        },
        margin: {
            l: 60,
            r: 30,
            b: 120, // Increased bottom margin for X-axis title
            t: 200  // Increased top margin for Legend
        },
        hovermode: 'closest'
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
    };

    Plotly.newPlot(containerId, traces, layout, config);
}

// Helpers

function organizeSubgroups(datasets, viewMode) {
    // If viewMode is 'well', we separate by Image (datasets are already images)
    // So each 'subgroup' is just one dataset.
    if (viewMode === 'well' || viewMode === 'image') {
        return datasets.map(d => ({
            label: `Image ${d.metadata.imageNumber}`,
            datasets: [d]
        }));
    }
    
    // If viewMode is 'parameter', we separate by Well.
    if (viewMode === 'parameter') {
        const wellGroups = {};
        datasets.forEach(d => {
            if (!wellGroups[d.metadata.well]) {
                wellGroups[d.metadata.well] = {
                    label: `Well ${d.metadata.well}`,
                    datasets: []
                };
            }
            wellGroups[d.metadata.well].datasets.push(d);
        });
        return Object.values(wellGroups);
    }
    
    return [{ label: 'All', datasets }];
}

function calculateStats(data) {
    const xVals = data.map(d => d.NArea).filter(v => !isNaN(v));
    const yVals = data.map(d => d.IntegratedInt).filter(v => !isNaN(v));

    return {
        meanNArea: mean(xVals),
        meanInt: mean(yVals),
        medianNArea: median(xVals),
        medianInt: median(yVals)
    };
}

function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Hacky check for the "Mean of Wells" vs "Mean of Images" distinction
// For now, we implemented "Mean of Images". The user UI might need a specific toggle for "Mean of Wells" 
// if they are in Parameter view. But let's start with this.
function isWellModeAgg(datasets, mode) {
    return false; // placeholder
}
