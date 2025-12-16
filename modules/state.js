/**
 * State Module
 * Manages application state using a simple reactive pattern.
 */

// Palette for default colors
const PALETTE = [
    '#38bdf8', '#f472b6', '#a3e635', '#fbbf24', '#c084fc', '#22d3ee', '#f87171'
];
let nextColorIndex = 0;

const initialState = {
    datasets: [],      // Array of { id, metadata, data }
    datasetColors: {}, // Map id -> hex color
    viewMode: 'image', // 'image', 'well', 'parameter'
    aggregationMode: 'all', // 'all', 'mean', 'median'
    comparisonMode: false,
    selectedIds: [],   // IDs of selected items for display
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
        
        // Assign default color
        const color = PALETTE[nextColorIndex % PALETTE.length];
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

    notify: (actionType = 'general') => {
        currentState.listeners.forEach(listener => listener(state.get(), actionType));
    }
};

/**
 * Helper to group datasets based on current view mode
 * @returns {Array} grouped items { id, label, datasets[] }
 */
export function getGroups() {
    const s = state.get();
    const { datasets, viewMode } = s;

    if (viewMode === 'image') {
        return datasets.map(d => ({
            id: d.id,
            label: d.metadata.originalName, // Or shorter name
            datasets: [d],
            metadata: d.metadata
        }));
    }

    if (viewMode === 'well') {
        // Group by Parameter + Well
        const groups = {};
        datasets.forEach(d => {
            const key = `${d.metadata.parameter}__${d.metadata.well}`;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    label: `${d.metadata.parameter} - ${d.metadata.well}`,
                    datasets: [],
                    metadata: d.metadata // Keep representative metadata
                };
            }
            groups[key].datasets.push(d);
        });
        return Object.values(groups);
    }

    if (viewMode === 'parameter') {
        // Group by Parameter only
        const groups = {};
        datasets.forEach(d => {
            const key = d.metadata.parameter;
            if (!groups[key]) {
                groups[key] = {
                    id: key,
                    label: d.metadata.parameter,
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
