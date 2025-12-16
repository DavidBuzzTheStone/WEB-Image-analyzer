/**
 * State Module
 * Manages application state using a simple reactive pattern.
 */

// Palette for default colors (30 distinct colors)
const PALETTE = [
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
    listeners: []
};

let currentState = { ...initialState };

export const state = {
    get: () => ({ ...currentState }),
    
    // Subscribe to state changes
    subscribe: (listener) => {
        currentState.listeners.push(listener);
    },

    // Actions
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

    notify: (actionType = 'general') => {
        currentState.listeners.forEach(listener => listener(state.get(), actionType));
    }
};

/**
 * Helper to group datasets based on current view mode
 * @returns {Array} grouped items { id, label, type, children?, datasets, metadata }
 */
export function getGroups() {
    const s = state.get();
    const { datasets, viewMode } = s;

    if (viewMode === 'image') {
        // Hierarchy: Parameter -> Well -> Image (Leaf)
        const groups = {}; // Key: Parameter

        datasets.forEach(d => {
            const param = d.metadata.parameter || 'Unknown Parameter';
            const well = d.metadata.well || 'Unknown Well';

            if (!groups[param]) {
                groups[param] = {
                    id: `param_${param}`,
                    label: param,
                    type: 'folder',
                    children: {}, // Key: Well
                    datasets: [] // Aggregated datasets for this folder
                };
            }
            groups[param].datasets.push(d);

            if (!groups[param].children[well]) {
                groups[param].children[well] = {
                    id: `well_${param}_${well}`,
                    label: `Well ${well}`,
                    type: 'folder',
                    children: [], // Array of leaves
                    datasets: []
                };
            }
            groups[param].children[well].datasets.push(d);

            // Leaf
            groups[param].children[well].children.push({
                id: d.id,
                label: `Image ${d.metadata.imageNumber}`,
                type: 'leaf',
                datasets: [d],
                metadata: d.metadata
            });
        });

        // Convert objects to arrays
        return Object.values(groups).map(paramGroup => ({
            ...paramGroup,
            children: Object.values(paramGroup.children).map(wellGroup => ({
                ...wellGroup,
                // Sort wells? Strings for now.
            }))
        }));
    }

    if (viewMode === 'well') {
        // Hierarchy: Parameter -> Well (Leaf)
        const groups = {}; // Key: Parameter

        datasets.forEach(d => {
            const param = d.metadata.parameter || 'Unknown Parameter';
            const well = d.metadata.well || 'Unknown Well';
            const key = `${param}__${well}`;

            if (!groups[param]) {
                groups[param] = {
                    id: `param_${param}`,
                    label: param,
                    type: 'folder',
                    children: {}, // Key: Well (Composite ID)
                    datasets: []
                };
            }
            groups[param].datasets.push(d);

            if (!groups[param].children[key]) {
                groups[param].children[key] = {
                    id: key,
                    label: `Well ${well}`,
                    type: 'leaf',
                    datasets: [],
                    metadata: d.metadata // Representative
                };
            }
            groups[param].children[key].datasets.push(d);
        });

        return Object.values(groups).map(paramGroup => ({
            ...paramGroup,
            children: Object.values(paramGroup.children)
        }));
    }

    if (viewMode === 'parameter') {
        // Flat list of Parameters
        const groups = {};
        datasets.forEach(d => {
            const key = d.metadata.parameter;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    label: d.metadata.parameter,
                    type: 'leaf',
                    datasets: [],
                    metadata: d.metadata
                };
            }
            groups[key].datasets.push(d);
        });
        return Object.values(groups);
    }

    return [];
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
            // Recurse depending on structure.
            // In our current 'getGroups', children is an array or object?
            // In 'getGroups' implementation:
            // Top level maps to array of paramGroups.
            // paramGroup.children is array of wellGroups (in Image mode) or leaves (in Well mode).
            
            // Note: In `getGroups` earlier, we converted everything to arrays before returning.
            // So `group.children` is always an array if it exists.
            
            if (Array.isArray(group.children)) {
                selected = selected.concat(getSelectedGroups(group.children, selectedIds));
            }
        }
    });
    
    return selected;
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
