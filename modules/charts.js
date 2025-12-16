/**
 * Charts Module
 * Wrapper for Plotly.js to render scientific scatter plots.
 */

export function getDefaultColor(id) {
    let hash = 0;
    // ensure id is string
    const safeId = String(id);
    for (let i = 0; i < safeId.length; i++) {
        hash = safeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % PALETTE.length;
    return PALETTE[index];
}

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
// Update signature
export function renderChart(containerId, groups, aggregationMode, viewMode, datasetColors, isDarkMode = true, thresholds = null) {
    const traces = [];
    const shapes = [];
    
    // Theme colors
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';

    groups.forEach((group) => {
        let groupColor = datasetColors && datasetColors[group.id] ? datasetColors[group.id] : getDefaultColor(group.id);
        
        if (aggregationMode === 'all') {
            const subgroups = organizeSubgroups(group.datasets, viewMode);
            
            subgroups.forEach((sub, subIndex) => {
                const x = [];
                const y = [];
                const excludedX = [];
                const excludedY = [];
                
                sub.datasets.forEach(ds => {
                    ds.data.forEach(row => {
                        if (isPointIncluded(row, thresholds)) {
                            x.push(row.NArea);
                            y.push(row.IntegratedInt);
                        } else if (thresholds && thresholds.isAdjusting) {
                            excludedX.push(row.NArea);
                            excludedY.push(row.IntegratedInt);
                        }
                    });
                });
                
                // Add trace for included points
                if (x.length > 0) {
                    traces.push({
                        x: x,
                        y: y,
                        mode: 'markers',
                        type: 'scatter',
                        name: (groups.length > 1 && group.label !== sub.label) ? `${group.label} - ${sub.label}` : sub.label,
                        marker: {
                             color: groups.length > 1 ? groupColor : PALETTE[subIndex % PALETTE.length],
                             symbol: SYMBOLS[subIndex % SYMBOLS.length],
                             size: 8,
                             opacity: 0.7
                        },
                        text: sub.label
                    });
                }

                // Add trace for excluded points (ghosted)
                if (excludedX.length > 0) {
                    traces.push({
                        x: excludedX,
                        y: excludedY,
                        mode: 'markers',
                        type: 'scatter',
                        name: `Excluded (Filter)`,
                        showlegend: false,
                        hoverinfo: 'none',
                        marker: {
                             color: '#888',
                             symbol: SYMBOLS[subIndex % SYMBOLS.length],
                             size: 6,
                             opacity: 0.5
                        }
                    });
                }
            });
            
        } else {
            // Aggregated View
            // We must filter data BEFORE calculating stats
            const subgroups = organizeSubgroups(group.datasets, viewMode);
            
            subgroups.forEach((sub, subIndex) => {
                const subX = [];
                const subY = [];
                const hoverTexts = [];

                sub.datasets.forEach(ds => {
                    // Filter raw data
                    const validRows = ds.data.filter(row => isPointIncluded(row, thresholds));
                    
                    if (validRows.length > 0) {
                        const stats = calculateStats(validRows);
                        const valX = aggregationMode === 'median' ? stats.medianNArea : stats.meanNArea;
                        const valY = aggregationMode === 'median' ? stats.medianInt : stats.meanInt;
                        
                        subX.push(valX);
                        subY.push(valY);
                        hoverTexts.push(ds.metadata.originalName);
                    }
                });
                
                if (subX.length > 0) {
                    traces.push({
                        x: subX,
                        y: subY,
                        mode: 'markers',
                        type: 'scatter',
                        name: (groups.length > 1 && group.label !== sub.label) ? `${group.label} - ${sub.label}` : sub.label,
                        marker: {
                            color: groups.length > 1 ? groupColor : PALETTE[subIndex % PALETTE.length],
                            symbol: SYMBOLS[subIndex % SYMBOLS.length],
                            size: 10,
                            line: { width: 1, color: '#fff' }
                        },
                        text: hoverTexts
                    });
                }
            });
        }
    });

    // Generate Shapes for Threshold Lines
    if (thresholds && (Object.keys(thresholds.values).length > 0)) {
        const v = thresholds.values;
        const lineStyle = {
            color: isDarkMode ? '#fff' : '#000',
            width: 2,
            dash: thresholds.isAdjusting ? 'solid' : 'dot'
        };

        if (thresholds.type === 'area_int') {
            if (v.intMin !== undefined) shapes.push(createLine('h', v.intMin, lineStyle));
            if (v.intMax !== undefined) shapes.push(createLine('h', v.intMax, lineStyle));
            if (v.areaMin !== undefined) shapes.push(createLine('v', v.areaMin, lineStyle));
            if (v.areaMax !== undefined) shapes.push(createLine('v', v.areaMax, lineStyle));
        } else if (thresholds.type === 'density') {
            // Find max X in data to scale the line appropriately without breaking auto-zoom
            let globalMaxX = 0;
            groups.forEach(g => {
                g.datasets.forEach(ds => {
                     ds.data.forEach(row => {
                         if (row.NArea > globalMaxX) globalMaxX = row.NArea;
                     });
                });
            });
            if (globalMaxX === 0) globalMaxX = 1000;
            const lineLimitX = globalMaxX * 2; // Extend a bit beyond data

            // Density = Y / X => Y = Density * X
            if (v.densityMin !== undefined) {
                 shapes.push({
                    type: 'line',
                    x0: 0, y0: 0,
                    x1: lineLimitX, y1: lineLimitX * v.densityMin,
                    line: lineStyle
                 });
            }
            if (v.densityMax !== undefined) {
                 shapes.push({
                    type: 'line',
                    x0: 0, y0: 0,
                    x1: lineLimitX, y1: lineLimitX * v.densityMax,
                    line: lineStyle
                 });
            }
        }
    }

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
        hovermode: 'closest',
        shapes: shapes
    };
    
    const config = {
        responsive: true,
        displayModeBar: true,
    };

    Plotly.newPlot(containerId, traces, layout, config);
}

// Helpers
function createLine(orientation, value, style) {
    if (orientation === 'h') {
        return {
            type: 'line',
            x0: 0, x1: 1, xref: 'paper',
            y0: value, y1: value,
            line: style
        };
    } else {
        return {
            type: 'line',
            x0: value, x1: value,
            y0: 0, y1: 1, yref: 'paper',
            line: style
        };
    }
}

function isPointIncluded(row, thresholds) {
    if (!thresholds || !thresholds.values) return true;
    const v = thresholds.values;
    
    if (thresholds.type === 'area_int') {
        if (v.intMin !== undefined && row.IntegratedInt < v.intMin) return false;
        if (v.intMax !== undefined && row.IntegratedInt > v.intMax) return false;
        if (v.areaMin !== undefined && row.NArea < v.areaMin) return false;
        if (v.areaMax !== undefined && row.NArea > v.areaMax) return false;
    } else if (thresholds.type === 'density') {
        const density = row.IntegratedInt / row.NArea;
        if (v.densityMin !== undefined && density < v.densityMin) return false;
        if (v.densityMax !== undefined && density > v.densityMax) return false;
    }
    
    return true;
}

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
