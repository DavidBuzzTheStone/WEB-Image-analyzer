/**
 * UI Manager Module
 * Handles DOM updates and user interactions.
 */
import { state } from './state.js';

export function setupUIListeners() {
    // View Mode Toggles
    document.querySelectorAll('#view-mode-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.value;
            state.setViewMode(mode);
        });
    });

    // Aggregation Toggles
    document.querySelectorAll('#agg-mode-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.value;
            state.setAggregationMode(mode);
        });
    });

    // Comparison Mode
    const compareBtn = document.getElementById('compare-mode-btn');
    compareBtn.addEventListener('click', () => {
        state.toggleComparisonMode();
    });

    // Select All
    document.getElementById('select-all-btn').addEventListener('click', () => {
        const ids = Array.from(document.querySelectorAll('.list-item')).map(el => el.dataset.id);
        state.selectAll(ids);
    });

    // Delete Selected
    document.getElementById('delete-btn').addEventListener('click', () => {
        const s = state.get();
        if (s.selectedIds.length === 0) return;
        
        if (confirm(`Delete ${s.selectedIds.length} items?`)) {
            state.removeDatasets(s.selectedIds);
        }
    });

    setupResizer();
}

function setupResizer() {
    const sidebar = document.querySelector('.sidebar');
    const resizer = document.getElementById('sidebar-resizer');
    
    let isResizing = false;

    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizer.classList.add('active');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none'; // Prevent text selection
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        // Construct new width. Min 200px, Max 600px
        let newWidth = e.clientX;
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 600) newWidth = 600;
        
        sidebar.style.width = `${newWidth}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            resizer.classList.remove('active');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

export function renderUI(appState, groups) {
    updateControls(appState);
    renderSidebarList(groups, appState);
}

function updateControls(state) {
    // View Mode Active State
    document.querySelectorAll('#view-mode-toggle .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.viewMode);
    });

    // Aggregation Controls Visibility & State
    const aggControls = document.getElementById('aggregation-controls');
    // "only available when grouped by well or parameter"
    if (state.viewMode === 'well' || state.viewMode === 'parameter') {
        aggControls.style.display = 'block';
    } else {
        aggControls.style.display = 'none';
    }

    document.querySelectorAll('#agg-mode-toggle .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.aggregationMode);
    });

    // Comparison Button
    const compareBtn = document.getElementById('compare-mode-btn');
    compareBtn.classList.toggle('active', state.comparisonMode);
    compareBtn.innerText = state.comparisonMode ? 'End Comparison' : 'Enable Comparison';
    
    // Label
    const labelMap = {
        'image': 'Single Image Analysis',
        'well': 'Well Analysis',
        'parameter': 'Parameter Analysis'
    };
    document.getElementById('current-view-label').innerText = labelMap[state.viewMode];
}

function renderSidebarList(groups, appState) {
    const listContainer = document.getElementById('dataset-list');
    listContainer.innerHTML = '';
    
    if (groups.length === 0) {
        listContainer.innerHTML = '<div class="empty-state">No datasets matching view</div>';
        return;
    }

    groups.forEach(group => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.dataset.id = group.id;
        
        // Selection State
        if (appState.selectedIds.includes(group.id)) {
            item.classList.add('selected');
        }

        // Content
        const title = document.createElement('div');
        title.className = 'title';
        title.innerText = group.label;

        const meta = document.createElement('div');
        meta.className = 'meta';
        // Show count
        meta.innerText = `${group.datasets.length} files`;

        const textDiv = document.createElement('div');
        textDiv.appendChild(title);
        textDiv.appendChild(meta);

        item.appendChild(textDiv);

        // Click Handler
        item.addEventListener('click', () => {
             state.toggleSelection(group.id);
        });

        listContainer.appendChild(item);
    });
}
