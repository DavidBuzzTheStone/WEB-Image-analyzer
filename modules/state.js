/**
 * State Module
 * Manages application state using a simple reactive pattern.
 */

// Palette for default colors (30 distinct colors)
export const PALETTE = [
    '#e6194b', '#3cb44b', '#ffe119', '#4363d8', '#f58231', '#911eb4', '#46f0f0', '#f032e6', '#bcf60c', '#fabebe',
    '#008080', '#e6beff', '#9a6324', '#fffac8', '#800000', '#aaffc3', '#808000', '#ffd8b1', '#000075',
    '#FFB300', '#803E75', '#FF6800', '#C10020', '#CEA262', '#817066', '#007D34', '#F6768E', '#00538A'
];
let nextColorIndex = 0;

const initialState = {
    datasets: [],      // Array of { id, metadata, data }
    datasetColors: {}, // Map id -> hex color
    viewMode: 'image', // 'image', 'well', 'parameter'
    aggregationMode: 'all', // 'all', 'mean', 'median'
    comparisonMode: false,
    selectedIds: [],   // IDs of selected items for display
    expandedIds: [],   // IDs of expanded folders
    thresholds: null,  // { type: 'density'|'area_int', values: {...}, isAdjusting: boolean }
    graphType: 'scatter', // 'scatter', 'histogram', 'box', 'bar'
    graphMetric: 'int',   // 'int', 'area', 'density'
    dotSize: 8,
    jitterWidth: 0,
    fontSize: 12,
    projectNotes: '',
    savedComparisons: [],
    savedThresholds: [],
    isDirty: false, 
    currentFilePath: null,
    listeners: [],
    groupOrder: []
};

let currentState = { ...initialState };

export const state = {
    get: () => ({ ...currentState }),
    
    // Subscribe to state changes
    subscribe: (listener) => {
        currentState.listeners.push(listener);
    },

    // Actions
    setGraphType: (type) => {
        currentState.graphType = type;
        state.notify('graph_settings_change');
    },

    setGraphMetric: (metric) => {
        currentState.graphMetric = metric;
        state.notify('graph_settings_change');
    },

    setDotSize: (size) => {
        currentState.dotSize = size;
        state.notify('graph_settings_change');
    },

    setJitterWidth: (width) => {
        currentState.jitterWidth = width;
        state.notify('graph_settings_change');
    },

    setFontSize: (size) => {
        currentState.fontSize = size;
        state.notify('graph_settings_change');
    },
    
    setProjectNotes: (text) => {
        currentState.projectNotes = text;
        state.notify('project_meta_update'); 
    },

    setComparisonNote: (id, note) => {
        const comp = currentState.savedComparisons.find(c => c.id === id);
        if (comp) {
            comp.note = note;
            state.notify('saved_comparison_update');
        }
    },
    
    setProjectFilePath: (path) => {
        currentState.currentFilePath = path;
    },
    
    markAsSaved: () => {
        currentState.isDirty = false;
        state.notify('project_saved');
    },

    markAsLoaded: () => {
         currentState.isDirty = false;
         state.notify('project_loaded');
    },

    addDataset: (dataset) => {
        if (currentState.datasets.some(d => d.id === dataset.id)) {
            alert(`File already loaded: ${dataset.metadata.originalName}`);
            return;
        }
        
        // Assign color
        let color;
        if (nextColorIndex < PALETTE.length) {
            // Use palette
            color = PALETTE[nextColorIndex];
        } else {
            // Palette exhausted, generate from name
            color = generateColorFromName(dataset.id);
        }
        currentState.datasetColors[dataset.id] = color;
        nextColorIndex++;
        
        currentState.datasets.push(dataset);
        state.notify();
    },

    setDatasetColor: (id, color) => {
        currentState.datasetColors[id] = color;
        state.notify('color_change');
    },

    setDatasetColors: (colors) => {
        currentState.datasetColors = colors;
        state.notify('color_change');
    },

    setDatasets: (datasets) => {
        currentState.datasets = datasets;
        state.notify('dataset_update');
    },

    removeDatasets: (ids) => {
        currentState.datasets = currentState.datasets.filter(d => !ids.includes(d.id));
        // Also remove from selection
        currentState.selectedIds = currentState.selectedIds.filter(id => !ids.includes(id));
        state.notify('dataset_update');
    },

    setViewMode: (mode) => {
        currentState.viewMode = mode;
        // Reset selection when changing view modes to avoid confusion
        currentState.selectedIds = [];
        
        // Requirement: Reset aggregation to "All points" when clicking "Image" view
        if (mode === 'image') {
            currentState.aggregationMode = 'all';
        }
        
        state.notify('view_mode_change');
    },

    setAggregationMode: (mode) => {
        currentState.aggregationMode = mode;
        state.notify('aggregation_change');
    },

    toggleComparisonMode: () => {
        currentState.comparisonMode = !currentState.comparisonMode;
        if (!currentState.comparisonMode) {
             // If turning off, maybe clear multi-selection or keep just the last one?
             // For now, we'll keep the selection but the UI will render differently
        }
        state.notify('comparison_change');
    },

    toggleSelection: (id) => {
        if (currentState.comparisonMode) {
            // Multi-select behavior
            const index = currentState.selectedIds.indexOf(id);
            if (index > -1) {
                currentState.selectedIds.splice(index, 1);
            } else {
                currentState.selectedIds.push(id);
            }
        } else {
            // Single-select behavior
            currentState.selectedIds = [id];
        }
        state.notify('selection_change');
    },

    selectAll: (ids) => {
        currentState.selectedIds = [...ids];
        state.notify('selection_change');
    },

    toggleExpansion: (id) => {
        const index = currentState.expandedIds.indexOf(id);
        if (index > -1) {
            currentState.expandedIds.splice(index, 1);
        } else {
            currentState.expandedIds.push(id);
        }
        state.notify('expansion_change');
    },

    setExpandedIds: (ids) => {
        currentState.expandedIds = [...ids];
        state.notify('expansion_change');
    },

    setThresholds: (thresholds) => {
        currentState.thresholds = thresholds;
        state.notify('threshold_change');
    },
    
    updateThresholdValues: (values) => {
        if (currentState.thresholds) {
            currentState.thresholds.values = { ...currentState.thresholds.values, ...values };
            state.notify('threshold_value_update');
        }
    },
    
    setThresholdAdjusting: (isAdjusting) => {
        if (currentState.thresholds) {
            currentState.thresholds.isAdjusting = isAdjusting;
            state.notify('threshold_change');
        }
    },

    setComparisonMode: (isActive) => {
        currentState.comparisonMode = isActive;
        if (!isActive) {
             // Optional: clear selection logic if desired
        }
        state.notify('comparison_change');
    },

    saveComparison: (name) => {
        const comparison = {
            id: Date.now(),
            name: name,
            viewMode: currentState.viewMode,
            aggregationMode: currentState.aggregationMode,
            graphType: currentState.graphType,
            graphMetric: currentState.graphMetric,
            selectedIds: [...currentState.selectedIds],
            // Optional: Store colors if specific to this comparison?
        };
        currentState.savedComparisons = currentState.savedComparisons || [];
        currentState.savedComparisons.push(comparison);
        state.notify('saved_comparison_update');
    },

    deleteComparison: (id) => {
        if (currentState.savedComparisons) {
            currentState.savedComparisons = currentState.savedComparisons.filter(c => c.id !== id);
            state.notify('saved_comparison_update');
        }
    },

    setSavedComparisons: (list) => {
        currentState.savedComparisons = list || [];
        state.notify('saved_comparison_update');
    },

    saveThresholds: (name) => {
        if (!currentState.thresholds) return;
        
        const saved = {
            id: Date.now(),
            name: name,
            thresholds: JSON.parse(JSON.stringify(currentState.thresholds)) // Deep copy
        };
        
        currentState.savedThresholds = currentState.savedThresholds || [];
        currentState.savedThresholds.push(saved);
        state.notify('saved_threshold_update');
    },

    deleteThresholds: (id) => {
        if (currentState.savedThresholds) {
            currentState.savedThresholds = currentState.savedThresholds.filter(t => t.id !== id);
            state.notify('saved_threshold_update');
        }
    },

    setSavedThresholds: (list) => {
        currentState.savedThresholds = list || [];
        state.notify('saved_threshold_update');
    },

    setSelectedIds: (ids) => {
        currentState.selectedIds = [...ids];
        state.notify('selection_change');
    },

    setGroupOrder: (order) => {
        currentState.groupOrder = [...order];
        state.notify('order_change');
    },
        
    reorderGroup: (sourceId, targetId, position) => {
        // position: 'before' | 'after'
        
        // Helper to flatten current structure to ensure we have all IDs
        const groups = getGroups();
        const flatten = (list) => {
            let ids = [];
            list.forEach(g => {
                ids.push(g.id);
                if (g.children) {
                    ids = ids.concat(flatten(g.children));
                }
            });
            return ids;
        };

        // If groupOrder is empty or incomplete, assume current hierarchical order is the baseline
        // But we must merge it with existing groupOrder to preserve previous sorts if possible?
        // Simpler: Just rebuild groupOrder from current hierarchy sorting, then apply the move.
        // Actually, getGroups() *uses* groupOrder. 
        // If we want to change the order, we take the *current* effective order (flattened),
        // move the element, and save that as the new groupOrder.
        
        // 1. Get current Full List in visual order
        let currentOrder = flatten(groups);
        
        // 2. Remove source
        currentOrder = currentOrder.filter(id => id !== sourceId);
        
        // 3. Find target index
        const targetIndex = currentOrder.indexOf(targetId);
        if (targetIndex === -1) return; // Target not found?
        
        // 4. Insert
        if (position === 'before') {
            currentOrder.splice(targetIndex, 0, sourceId);
        } else {
            currentOrder.splice(targetIndex + 1, 0, sourceId);
        }
        
        currentState.groupOrder = currentOrder;
        state.notify('order_change');
    },

    notify: (actionType = 'general') => {
        if (actionType !== 'project_saved' && actionType !== 'project_loaded') {
            currentState.isDirty = true;
        }
        currentState.listeners.forEach(listener => listener(state.get(), actionType));
    }
};

/**
 * Helper to group datasets based on current view mode
 * @returns {Array} grouped items { id, label, type, children?, datasets, metadata }
 */
export function getGroups() {
    const s = state.get();
    const { datasets, viewMode, groupOrder } = s;

    let groups = [];

    if (viewMode === 'image') {
        const map = {};
        datasets.forEach(d => {
            const param = d.metadata.parameter || 'Unknown Parameter';
            const well = d.metadata.well || 'Unknown Well';

            if (!map[param]) {
                map[param] = {
                    id: `param_${param}`,
                    label: param,
                    type: 'folder',
                    childrenMap: {}, 
                    datasets: []
                };
            }
            map[param].datasets.push(d);

            if (!map[param].childrenMap[well]) {
                map[param].childrenMap[well] = {
                    id: `well_${param}_${well}`,
                    label: `Well ${well}`,
                    type: 'folder',
                    children: [],
                    datasets: []
                };
            }
            map[param].childrenMap[well].datasets.push(d);
            
            map[param].childrenMap[well].children.push({
                id: d.id,
                label: `Image ${d.metadata.imageNumber}`,
                type: 'leaf',
                datasets: [d],
                metadata: d.metadata
            });
        });

        groups = Object.values(map).map(p => ({
            ...p,
            children: Object.values(p.childrenMap)
        }));
    } else if (viewMode === 'well') {
        const map = {};
        datasets.forEach(d => {
            const param = d.metadata.parameter || 'Unknown Parameter';
            const well = d.metadata.well || 'Unknown Well';
            const key = `${param}__${well}`;
            
            if (!map[param]) {
                map[param] = {
                    id: `param_${param}`,
                    label: param,
                    type: 'folder',
                    childrenMap: {},
                    datasets: []
                };
            }
            map[param].datasets.push(d);
            
            if (!map[param].childrenMap[key]) {
                map[param].childrenMap[key] = {
                    id: key,
                    label: `Well ${well}`,
                    type: 'leaf',
                    datasets: [],
                    metadata: d.metadata
                };
            }
            map[param].childrenMap[key].datasets.push(d);
        });
        
        groups = Object.values(map).map(p => ({
            ...p,
            children: Object.values(p.childrenMap)
        }));

    } else if (viewMode === 'parameter') {
        const map = {};
        datasets.forEach(d => {
            const key = d.metadata.parameter;
            if (!map[key]) {
                map[key] = {
                    id: key,
                    label: d.metadata.parameter,
                    type: 'leaf',
                    datasets: [],
                    metadata: d.metadata
                };
            }
            map[key].datasets.push(d);
        });
        groups = Object.values(map);
    }
    
    // Sort Groups recursively
    const sortFn = (list) => {
        return list.sort((a, b) => {
            const idxA = groupOrder.indexOf(a.id);
            const idxB = groupOrder.indexOf(b.id);
            
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            
            return a.label.localeCompare(b.label, undefined, { numeric: true });
        });
    };
    
    const sortRecursive = (list) => {
        const sorted = sortFn(list);
        sorted.forEach(g => {
            if (g.children) {
                g.children = sortRecursive(g.children);
            }
        });
        return sorted;
    };

    return sortRecursive(groups);
}

/**
 * Recursively find selected groups in hierarchy
 * @param {Array} groups 
 * @param {Array} selectedIds 
 * @returns {Array} List of selected group objects
 */
export function getSelectedGroups(groups, selectedIds) {
    let selected = [];
    
    groups.forEach(group => {
        if (selectedIds.includes(group.id)) {
            selected.push(group);
        }
        
        if (group.children) {
            if (Array.isArray(group.children)) {
                selected = selected.concat(getSelectedGroups(group.children, selectedIds));
            }
        }
    });
    
    return selected;
}

export function getGroupOrder() {
    return state.get().groupOrder;
}

function generateColorFromName(str) {
    let hash = 0;
    // Ensure id is string
    const safeId = String(str);
    for (let i = 0; i < safeId.length; i++) {
        hash = safeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
}
