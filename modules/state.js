/**
 * State Module
 * Manages application state using a simple reactive pattern.
 */

const initialState = {
    datasets: [],      // Array of { id, metadata, data }
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
        currentState.datasets.push(dataset);
        state.notify();
    },

    setDatasets: (datasets) => {
        currentState.datasets = datasets;
        state.notify();
    },

    removeDatasets: (ids) => {
        currentState.datasets = currentState.datasets.filter(d => !ids.includes(d.id));
        // Also remove from selection
        currentState.selectedIds = currentState.selectedIds.filter(id => !ids.includes(id));
        state.notify();
    },

    setViewMode: (mode) => {
        currentState.viewMode = mode;
        // Reset selection when changing view modes to avoid confusion
        currentState.selectedIds = [];
        
        // Requirement: Reset aggregation to "All points" when clicking "Image" view
        if (mode === 'image') {
            currentState.aggregationMode = 'all';
        }
        
        state.notify();
    },

    setAggregationMode: (mode) => {
        currentState.aggregationMode = mode;
        state.notify();
    },

    toggleComparisonMode: () => {
        currentState.comparisonMode = !currentState.comparisonMode;
        if (!currentState.comparisonMode) {
             // If turning off, maybe clear multi-selection or keep just the last one?
             // For now, we'll keep the selection but the UI will render differently
        }
        state.notify();
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
        state.notify();
    },

    selectAll: (ids) => {
        currentState.selectedIds = [...ids];
        state.notify();
    },

    notify: () => {
        currentState.listeners.forEach(listener => listener(state.get()));
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
