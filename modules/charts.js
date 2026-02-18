/**
 * Charts Module
 * Wrapper for Plotly.js to render scientific scatter plots.
 */
import { getGroupOrder, PALETTE } from './state.js';

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

function organizeSubgroups(datasets, viewMode) {
    // If viewMode is 'well' or 'image', we separate by Image (datasets are already images)
    // So each 'subgroup' is just one dataset.
    if (viewMode === 'well' || viewMode === 'image') {
        let subgroups = datasets.map(d => ({
            id: d.id,
            label: `${d.metadata.parameter} Well ${d.metadata.well} Image ${d.metadata.imageNumber}`,
            datasets: [d]
        }));
        
        const order = getGroupOrder();
        
        return subgroups.sort((a, b) => {
            const idxA = order.indexOf(a.id);
            const idxB = order.indexOf(b.id);
            
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            
            return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
        });
    }
    
    // If viewMode is 'parameter', we separate by Well.
    if (viewMode === 'parameter') {
        const wellGroups = {};
        datasets.forEach(d => {
            if (!wellGroups[d.metadata.well]) {
                const param = d.metadata.parameter;
                const well = d.metadata.well;
                // Reconstruct ID used in state.getGroups
                // In image view mode: `well_${param}_${well}`
                // but in parameter view mode, they are children of a leaf? No.
                // In parameter view mode, we are inside a Parameter Group (Leaf in state).
                // Wait, if viewMode is parameter, the top level groups are Parameters.
                // state.getGroups() returns Flat list of Parameters.
                // But inside charts.js, we take that Parameter group and break it down into subgroups (Wells).
                // These "Well Subgroups" do NOT exist in the state hierarchy in Parameter view mode.
                // They only exist in Image view mode.
                // So... we should probably check if we can find an ID that matches.
                // The reordering in Sidebar only works for items VISIBLE in sidebar.
                // In Parameter view, only Parameters are visible. You cannot reorder Wells.
                
                // USER REQUEST: "boxes of the children are not ordered based on their order number currently."
                // "if the "Param" view is selected, boxes are drawn for each well in that parameter)."
                // The user implies they want to order these wells.
                // BUT: In "Param" view, Wells are NOT shown in the sidebar. So they cannot be reordered by drag-and-drop in the sidebar.
                // However, if the user switches to "Image" view, they CAN reorder wells.
                // The user expects the order established in "Image" view (which saves to groupOrder) to persist/be respected 
                // when viewing the aggregation in "Parameter" view.
                
                // So we need to reconstruct the ID these wells WOULD have in Image view.
                // In Image view (state.js): id = `well_${param}_${well}`
                
                const id = `well_${param}_${well}`;
                
                wellGroups[d.metadata.well] = {
                    id: id,
                    label: `Well ${d.metadata.well}`,
                    datasets: []
                };
            }
            wellGroups[d.metadata.well].datasets.push(d);
        });
        
        const order = getGroupOrder();
        
        // Sort by Order ID if Present, else Natural Sort
        return Object.values(wellGroups).sort((a, b) => {
            const idxA = order.indexOf(a.id);
            const idxB = order.indexOf(b.id);
            
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1; 
            if (idxB !== -1) return 1;
            
            return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
        });
    }
    
    return [{ label: 'All', datasets }];
}



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
// Update signature
export function renderChart(containerId, groups, aggregationMode, viewMode, datasetColors, isDarkMode = true, thresholds = null, graphType = 'scatter', graphMetric = 'int', dotSize = 8, jitterWidth = 0, fontSize = 12) {
    // Theme colors
    const textColor = isDarkMode ? '#f8fafc' : '#1e293b';
    const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
    const font = { family: 'Inter, sans-serif', color: isDarkMode ? '#94a3b8' : '#64748b', size: fontSize };
    
    let chartData;

    try {
        switch (graphType) {
            case 'histogram':
                chartData = buildHistogram(groups, viewMode, datasetColors, thresholds, graphMetric);
                break;
            case 'box':
                chartData = buildBoxPlot(groups, viewMode, datasetColors, thresholds, graphMetric);
                break;
            case 'bar':
                chartData = buildBarChart(groups, viewMode, datasetColors, thresholds, graphMetric);
                break;
            case 'scatter':
            default:
                chartData = buildScatterPlot(groups, aggregationMode, viewMode, datasetColors, isDarkMode, thresholds, dotSize, jitterWidth);
                break;
        }
    } catch (e) {
        console.error("Error building chart", e);
        return;
    }

    // Common Layout Overrides
    const layout = {
        ...chartData.layout,
        paper_bgcolor: 'rgba(0,0,0,0)',
        plot_bgcolor: 'rgba(0,0,0,0)',
        font: font,
        showlegend: graphType !== 'box',
        legend: {
            orientation: 'h',
            yanchor: 'top',
            y: -0.1,
            xanchor: 'center',
            x: 0.5,
            font: { color: textColor },
            bgcolor: 'rgba(0,0,0,0)',
        },
        margin: {
            l: 60,
            r: 30,
            b: 200, 
            t: 60 
        }
    };

    // Apply specific axis styling
    if (layout.xaxis) {
        layout.xaxis.gridcolor = gridColor;
        layout.xaxis.title = { text: layout.xaxis.title || '', font: { color: textColor } };
    }
    if (layout.yaxis) {
        layout.yaxis.gridcolor = gridColor;
        layout.yaxis.title = { text: layout.yaxis.title || '', font: { color: textColor } };
    }
    
    if (chartData.layout.title) {
        layout.title = {
            text: chartData.layout.title,
            font: { color: textColor }
        };
    }

    const config = {
        responsive: true,
        displayModeBar: true,
        scrollZoom: true
    };

    Plotly.newPlot(containerId, chartData.traces, layout, config);
}

// --- BUILDERS ---

function buildScatterPlot(groups, aggregationMode, viewMode, datasetColors, isDarkMode, thresholds, dotSize, jitterWidth) {
    const traces = [];
    const shapes = [];

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
                        // Apply Jitter
                        const jitter = jitterWidth > 0 ? (Math.random() * 2 * jitterWidth) - jitterWidth : 0;
                        
                        // Safety cast
                        const valX = row.NArea !== undefined ? Number(row.NArea) : 0;
                        const valY = row.IntegratedInt !== undefined ? Number(row.IntegratedInt) : 0;
                        
                        const xVal = valX + jitter;
                        
                        if (isPointIncluded(row, thresholds)) {
                            x.push(xVal);
                            y.push(valY);
                        } else if (thresholds && thresholds.isAdjusting) {
                            excludedX.push(xVal);
                            excludedY.push(valY);
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
                             color: (groups.length > 1 || sub.datasets.length === 1) ? groupColor : PALETTE[subIndex % PALETTE.length],
                             symbol: SYMBOLS[subIndex % SYMBOLS.length],
                             size: dotSize,
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
                             size: Math.max(2, dotSize - 2),
                             opacity: 0.5
                        }
                    });
                }
            });
            
        } else {
            // Aggregated View
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
                            color: (groups.length > 1 || sub.datasets.length === 1) ? groupColor : PALETTE[subIndex % PALETTE.length],
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
            // Find max X in data to scale the line appropriately
            let globalMaxX = 0;
             groups.forEach(g => {
                g.datasets.forEach(ds => {
                     ds.data.forEach(row => {
                         if (row.NArea > globalMaxX) globalMaxX = row.NArea;
                     });
                });
            });
            if (globalMaxX === 0) globalMaxX = 1000;
            const lineLimitX = globalMaxX * 2; 

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

    return {
        traces,
        layout: {
            title: 'Integrated Intensity / NArea',
            xaxis: { title: 'NArea', rangemode: 'tozero', automargin: true },
            yaxis: { title: 'IntegratedInt', rangemode: 'tozero', automargin: true },
            shapes: shapes,
            hovermode: 'closest'
        }
    };
}

function buildHistogram(groups, viewMode, datasetColors, thresholds, metric) {
    const traces = [];
    
    groups.forEach((group) => {
        let groupColor = datasetColors && datasetColors[group.id] ? datasetColors[group.id] : getDefaultColor(group.id);
        const subgroups = organizeSubgroups(group.datasets, viewMode);
        
        subgroups.forEach((sub, subIndex) => {
            const values = [];
            sub.datasets.forEach(ds => {
                ds.data.forEach(row => {
                    if (isPointIncluded(row, thresholds)) {
                         values.push(getMetricValue(row, metric));
                    }
                });
            });
            
            if (values.length > 0) {
                traces.push({
                    x: values,
                    type: 'histogram',
                    name: (groups.length > 1 && group.label !== sub.label) ? `${group.label} - ${sub.label}` : sub.label,
                    marker: {
                        color: (groups.length > 1 || sub.datasets.length === 1) ? groupColor : PALETTE[subIndex % PALETTE.length],
                        opacity: 0.7
                    }
                });
            }
        });
    });

    return {
        traces,
        layout: {
            title: `Histogram of ${getMetricLabel(metric)}`,
            xaxis: { title: getMetricLabel(metric), automargin: true },
            yaxis: { title: 'Count', automargin: true },
            barmode: 'overlay'
        }
    };
}

function buildBoxPlot(groups, viewMode, datasetColors, thresholds, metric) {
    const traces = [];
    
    groups.forEach((group) => {
        let groupColor = datasetColors && datasetColors[group.id] ? datasetColors[group.id] : getDefaultColor(group.id);
        const subgroups = organizeSubgroups(group.datasets, viewMode);
        
        subgroups.forEach((sub, subIndex) => {
            const values = [];
            sub.datasets.forEach(ds => {
                ds.data.forEach(row => {
                    if (isPointIncluded(row, thresholds)) {
                         values.push(getMetricValue(row, metric));
                    }
                });
            });
            
            if (values.length > 0) {
                traces.push({
                    y: values,
                    type: 'box',
                    boxpoints: 'all', // Jitter
                    jitter: 0.3,
                    pointpos: -1.8,
                    name: (groups.length > 1 && group.label !== sub.label) ? `${group.label} - ${sub.label}` : sub.label,
                    marker: {
                        color: (groups.length > 1 || sub.datasets.length === 1) ? groupColor : PALETTE[subIndex % PALETTE.length]
                    }
                });
            }
        });
    });

    return {
        traces,
        layout: {
            title: `Box Plot of ${getMetricLabel(metric)}`,
            yaxis: { title: getMetricLabel(metric), automargin: true },
        }
    };
}

function buildBarChart(groups, viewMode, datasetColors, thresholds, metric) {
    const xLabels = [];
    const yValues = [];
    const errorValues = [];
    const colorValues = [];
    const hoverTexts = [];
    const textValues = [];
    const textValues = [];
    
    // Iterate all groups/subgroups to collect data
    groups.forEach((group) => {
        let groupColor = datasetColors && datasetColors[group.id] ? datasetColors[group.id] : getDefaultColor(group.id);
        
        // Grouping Logic for Bar Chart Hierarchical View
        let subgroups = [];
        if (viewMode === 'parameter') {
            // One bar per Parameter (Aggregation of Wells)
            subgroups = [{ label: 'Mean', datasets: group.datasets }];
        } else if (viewMode === 'well') {
            // One bar per Well (Aggregation of Images)
            const map = {};
            group.datasets.forEach(d => {
                const w = d.metadata.well;
                if (!map[w]) map[w] = { label: `Well ${w}`, datasets: [] };
                map[w].datasets.push(d);
            });
            subgroups = Object.values(map);
        } else { 
            // One bar per Image (Mean of pixels)
            subgroups = group.datasets.map(d => ({ 
                 label: `Image ${d.metadata.imageNumber}`, 
                 datasets: [d] 
             }));
        }

        subgroups.forEach((sub, subIndex) => {
            const stats = calculateHierarchicalStats(sub.datasets, viewMode, thresholds, metric);
            
            if (stats) {
                // Construct flattened label from metadata to ensure uniqueness and clarity
                const d = sub.datasets[0];
                const meta = d.metadata;
                
                let fullLabel = '';
                if (viewMode === 'parameter') {
                    fullLabel = meta.parameter;
                } else if (viewMode === 'well') {
                    fullLabel = `${meta.parameter} - Well ${meta.well}`;
                } else { // image
                    fullLabel = `${meta.parameter} - Well ${meta.well} - Image ${meta.imageNumber}`;
                }

                let dotCount = 0;
                sub.datasets.forEach(ds => {
                     const validRows = ds.data.filter(r => isPointIncluded(r, thresholds));
                     dotCount += validRows.length;
                });

                let barText = `total dots: ${dotCount}`;
                
                if (viewMode === 'parameter') {
                     const uniqueWells = new Set(sub.datasets.map(d => d.metadata.well));
                     const wellCount = uniqueWells.size;
                     barText += `<br>N = ${wellCount}`;
                }

                let dotCount = 0;
                sub.datasets.forEach(ds => {
                     const validRows = ds.data.filter(r => isPointIncluded(r, thresholds));
                     dotCount += validRows.length;
                });

                let barText = `total dots: ${dotCount}`;
                
                if (viewMode === 'parameter') {
                     const uniqueWells = new Set(sub.datasets.map(d => d.metadata.well));
                     const wellCount = uniqueWells.size;
                     barText += `<br>N = ${wellCount}`;
                }

                console.log(`[BarChart] ${fullLabel} - View: ${viewMode}, Dots: ${dotCount}`);

                xLabels.push(fullLabel);
                yValues.push(stats.mean);
                errorValues.push(stats.error);
                colorValues.push((groups.length > 1 || subgroups.length === 1) ? groupColor : PALETTE[subIndex % PALETTE.length]);
                hoverTexts.push(`${fullLabel}: ${stats.mean.toFixed(2)} ± ${stats.error.toFixed(2)}`);
                textValues.push(barText);
            }
        });
    });
    
    if (yValues.length === 0) return { traces: [], layout: {} };

    const trace = {
        x: xLabels,
        y: yValues,
        text: textValues,
        texttemplate: '%{text}',
        textposition: 'outside',
        error_y: {
            type: 'data',
            array: errorValues,
            visible: true,
            color: '#64748b'
        },
        type: 'bar',
        marker: {
            color: colorValues
        },
        hovertemplate: '%{x}<br>%{y:.2f} ± %{error_y.array:.2f}<extra></extra>',
        showlegend: false
    };

    return {
        traces: [trace],
        layout: {
             title: `Average ${getMetricLabel(metric)}`,
             yaxis: { title: `Mean ${getMetricLabel(metric)}`, automargin: true },
             xaxis: { 
                 automargin: true,
                 tickangle: -45,
                 title: ''
             }
        }
    };
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

export function isPointIncluded(row, thresholds) {
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



export function calculateStats(data) {
    const xVals = data.map(d => d.NArea).filter(v => !isNaN(v));
    const yVals = data.map(d => d.IntegratedInt).filter(v => !isNaN(v));

    return {
        meanNArea: mean(xVals),
        meanInt: mean(yVals),
        medianNArea: median(xVals),
        medianInt: median(yVals)
    };
}

export function mean(arr) {
    if (arr.length === 0) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function median(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateHierarchicalStats(datasets, viewMode, thresholds, metric) {
    // 1. Calculate Image Means (Base Unit)
    const imageStats = [];
    
    datasets.forEach(ds => {

        const validRows = ds.data.filter(r => isPointIncluded(r, thresholds));
        
        if (metric === 'count') {
            // Special handling for count
            const m = validRows.length;
            imageStats.push({
                val: m,
                rawSD: 0, // No variance in a single count value
                well: ds.metadata ? ds.metadata.well : 'Unknown'
            });
        } else {
            if (validRows.length > 0) {
                const valRows = validRows.map(r => getMetricValue(r, metric));
                const m = mean(valRows);
                imageStats.push({
                    val: m,
                    rawSD: calculateSD(valRows, m),
                    well: ds.metadata ? ds.metadata.well : 'Unknown'
                });
            }
        }
    });

    if (imageStats.length === 0) return null;

    if (viewMode === 'image') {
        const s = imageStats[0]; 
        return { mean: s.val, error: s.rawSD };
    }
    
    if (viewMode === 'well') {
        // Mean of Image Means (or Counts)
        const vals = imageStats.map(s => s.val);
        const m = mean(vals);
        return { mean: m, error: calculateSD(vals, m) };
    }
    
    if (viewMode === 'parameter') {
        // Mean of Well Means
        const wells = {};
        imageStats.forEach(s => {
            if (!wells[s.well]) wells[s.well] = [];
            wells[s.well].push(s.val);
        });
        
        const wellMeans = Object.values(wells).map(arr => mean(arr));
        const m = mean(wellMeans);
        return { mean: m, error: calculateSD(wellMeans, m) };
    }
    return null;
}

function calculateSD(arr, meanVal) {
    if (arr.length < 2) return 0;
    const sumSq = arr.reduce((a, b) => a + Math.pow(b - meanVal, 2), 0);
    return Math.sqrt(sumSq / (arr.length - 1));
}

function getMetricValue(row, metric) {
    switch (metric) {
        case 'int': return row.IntegratedInt;
        case 'area': return row.NArea;
        case 'density': return row.NArea !== 0 ? row.IntegratedInt / row.NArea : 0;
        default: return 0;
    }
}

function getMetricLabel(metric) {
    switch (metric) {
        case 'int': return 'Integrated Intensity';
        case 'area': return 'Area (NArea)';
        case 'density': return 'Intensity Density';
        case 'count': return 'Count';
        default: return '';
    }
}

// Hacky check for the "Mean of Wells" vs "Mean of Images" distinction
// For now, we implemented "Mean of Images". The user UI might need a specific toggle for "Mean of Wells" 
// if they are in Parameter view. But let's start with this.
function isWellModeAgg(datasets, mode) {
    return false; // placeholder
}
