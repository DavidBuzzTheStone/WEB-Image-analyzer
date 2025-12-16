/**
 * UI Manager Module
 * Handles DOM updates and user interactions.
 */
import { state } from './state.js';
import { getDefaultColor } from './charts.js';

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
        listContainer.appendChild(renderRecursiveGroup(group, appState, 0));
    });
}

function renderRecursiveGroup(group, appState, level) {
    if (group.type === 'folder') {
        const isExpanded = appState.expandedIds.includes(group.id);
        
        // Folder Container
        const container = document.createElement('div');
        container.className = 'group-container';
        
        // Header
        const header = document.createElement('div');
        header.className = 'group-header interactable';
        header.style.paddingLeft = `${level * 12}px`;
        
        // Chevron
        const chevron = document.createElement('span');
        chevron.className = `chevron ${isExpanded ? 'expanded' : ''}`;
        chevron.innerText = '▶'; 
        // We can use transform rotate for animation
        
        const label = document.createElement('span');
        label.innerText = group.label;
        
        header.appendChild(chevron);
        header.appendChild(label);
        
        // Toggle Handler
        header.addEventListener('click', () => {
            state.toggleExpansion(group.id);
        });

        container.appendChild(header);
        
        // Children (Render only if expanded)
        if (isExpanded && group.children && group.children.length > 0) {
            group.children.forEach(child => {
                container.appendChild(renderRecursiveGroup(child, appState, level + 1));
            });
        }
        
        return container;
    } else {
        // Leaf Item (Selectable)
        const item = document.createElement('div');
        item.className = 'list-item';
        item.dataset.id = group.id;
        item.style.paddingLeft = `${(level * 12) + 10}px`; // Base padding + Indent
        
        // Selection State
        if (appState.selectedIds.includes(group.id)) {
            item.classList.add('selected');
        }

        // Color Picker
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.className = 'color-picker';
        colorInput.value = appState.datasetColors[group.id] || getDefaultColor(group.id);
        
        colorInput.addEventListener('click', (e) => e.stopPropagation());
        colorInput.addEventListener('input', (e) => {
             e.stopPropagation();
             state.setDatasetColor(group.id, e.target.value);
        });

        // Content
        const title = document.createElement('div');
        title.className = 'title';
        title.innerText = group.label;

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.innerText = `${group.datasets.length} files`;

        const textDiv = document.createElement('div');
        textDiv.appendChild(title);
        textDiv.appendChild(meta);

        // Layout
        item.style.display = 'flex';
        item.style.justifyContent = 'flex-start';
        item.style.gap = '12px';
        item.style.alignItems = 'center';
        
        item.appendChild(colorInput);
        item.appendChild(textDiv);

        // Click Handler
        item.addEventListener('click', () => {
             state.toggleSelection(group.id);
        });
        
        return item;
    }
}


// Theme Logic
let isDarkMode = true;
export function getIsDarkMode() { return isDarkMode; }

export function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
        isDarkMode = !isDarkMode;
        document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
        btn.innerText = isDarkMode ? '☀️' : '🌙';
        
        // Force chart re-render to pick up new thread colors
        state.notify();
    });
}
