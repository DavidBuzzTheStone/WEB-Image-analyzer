/**
 * UI Manager Module
 * Handles DOM updates and user interactions.
 */
import { state, getGroups } from './state.js';
import { getDefaultColor, isPointIncluded } from './charts.js';

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

    // Toggle All Folders
    document.getElementById('toggle-all-btn').addEventListener('click', () => {
        const groups = getGroups();
        const folderIds = [];
        
        // Helper to collect folder IDs
        function collectFolders(list) {
            list.forEach(g => {
                if (g.type === 'folder') {
                    folderIds.push(g.id);
                    if (g.children) collectFolders(g.children);
                }
            });
        }
        collectFolders(groups);
        
        if (folderIds.length === 0) return;

        const currentExpanded = state.get().expandedIds;
        // logic: if all found folders are already in expandedIds, then collapse all.
        // otherwise, expand all.
        const allExpanded = folderIds.every(id => currentExpanded.includes(id));
        
        if (allExpanded) {
            state.setExpandedIds([]);
        } else {
            // Merge unique
            const newSet = new Set([...currentExpanded, ...folderIds]);
            state.setExpandedIds(Array.from(newSet));
        }
    });

    // Delete Selected
    document.getElementById('delete-btn').addEventListener('click', () => {
        const s = state.get();
        if (s.selectedIds.length === 0) return;
        
        if (confirm(`Delete ${s.selectedIds.length} items?`)) {
            state.removeDatasets(s.selectedIds);
        }
    });

    // Graph Type Toggles
    document.querySelectorAll('#graph-type-toggle .toggle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mode = e.target.dataset.value;
            state.setGraphType(mode);
        });
    });

    // Graph Metric Select
    document.getElementById('graph-metric-select').addEventListener('change', (e) => {
        state.setGraphMetric(e.target.value);
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
    renderThresholdControls(appState);
}

function renderThresholdControls(stateData) {
    const container = document.getElementById('threshold-section');
    const controls = document.getElementById('threshold-controls');
    
    // Only show if graph is open (we assume if selectedIds > 0 or comparison mode has items)
    // Actually, prompt says "only when a graph is open".
    // Graph is open when state.selectedIds.length > 0.
    const hasSelection = stateData.selectedIds.length > 0;
    
    if (!hasSelection) {
        container.style.display = 'none';
        return;
    }
    
    container.style.display = 'block';
    controls.innerHTML = '';
    
    if (!stateData.thresholds) {
        // Show Add Button
        const addBtn = document.createElement('button');
        addBtn.className = 'secondary-btn';
        addBtn.innerText = 'Add Threshold';
        addBtn.addEventListener('click', () => {
            state.setThresholds({
                type: 'density', // default
                values: {}, // empty means no limits yet
                isAdjusting: true
            });
        });
        controls.appendChild(addBtn);
        return;
    }

    // Render Controls
    const t = stateData.thresholds;
    
    // Type Selector
    const typeSelect = document.createElement('select');
    typeSelect.className = 'select-input';
    typeSelect.innerHTML = `
        <option value="density" ${t.type === 'density' ? 'selected' : ''}>Intensity Density</option>
        <option value="area_int" ${t.type === 'area_int' ? 'selected' : ''}>Integrated Int & Area</option>
    `;
    typeSelect.addEventListener('change', (e) => {
        state.setThresholds({
            ...t,
            type: e.target.value,
            values: {}, // Reset values on type change? Or keep? Reset seems safer.
            isAdjusting: true
        });
    });
    controls.appendChild(typeSelect);
    
    // Inputs based on type
    const inputsContainer = document.createElement('div');
    inputsContainer.className = 'inputs-container';
    
    if (t.type === 'density') {
        inputsContainer.appendChild(createInputPair('Density', 'density', t.values));
    } else {
        inputsContainer.appendChild(createInputPair('Int. Intensity', 'int', t.values));
        inputsContainer.appendChild(createInputPair('NArea', 'area', t.values));
    }
    controls.appendChild(inputsContainer);
    
    // Actions
    const actionRow = document.createElement('div');
    actionRow.className = 'action-row';
    
    if (t.isAdjusting) {
        const applyBtn = document.createElement('button');
        applyBtn.className = 'primary-btn small';
        applyBtn.innerText = 'Apply';
        applyBtn.addEventListener('click', () => {
            state.setThresholdAdjusting(false);
        });
        actionRow.appendChild(applyBtn);
    } else {
        const editBtn = document.createElement('button');
        editBtn.className = 'secondary-btn small';
        editBtn.innerText = 'Edit';
        editBtn.addEventListener('click', () => {
             state.setThresholdAdjusting(true);
        });
        
        const clearBtn = document.createElement('button');
        clearBtn.className = 'text-btn danger';
        clearBtn.innerText = 'Remove';
        clearBtn.addEventListener('click', () => {
             state.setThresholds(null);
        });
        
        actionRow.appendChild(editBtn);
        actionRow.appendChild(clearBtn);
    }
    
    controls.appendChild(actionRow);
}

function createInputPair(label, prefix, values) {
    const div = document.createElement('div');
    div.className = 'input-pair-group';
    
    div.innerHTML = `<div class="label-small">${label}</div>`;
    
    const row = document.createElement('div');
    row.className = 'input-row';
    
    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.placeholder = 'Min';
    minInput.className = 'number-input';
    minInput.value = values[`${prefix}Min`] !== undefined ? values[`${prefix}Min`] : '';
    minInput.addEventListener('input', (e) => {
        const val = e.target.value === '' ? undefined : Number(e.target.value);
        state.updateThresholdValues({ [`${prefix}Min`]: val });
    });
    
    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.placeholder = 'Max';
    maxInput.className = 'number-input';
    maxInput.value = values[`${prefix}Max`] !== undefined ? values[`${prefix}Max`] : '';
    maxInput.addEventListener('input', (e) => {
        const val = e.target.value === '' ? undefined : Number(e.target.value);
        state.updateThresholdValues({ [`${prefix}Max`]: val });
    });

    row.appendChild(minInput);
    row.appendChild(maxInput);
    div.appendChild(row);
    
    return div;
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

    // Graph Type Controls
    document.querySelectorAll('#graph-type-toggle .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.graphType);
    });
    
    // Metric Visibility (Show if NOT scatter)
    const metricContainer = document.getElementById('metric-select-container');
    if (state.graphType !== 'scatter') {
        metricContainer.style.display = 'block';
        document.getElementById('graph-metric-select').value = state.graphMetric;
    } else {
        metricContainer.style.display = 'none';
    }
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

        // Stats Calculation
        let totalPoints = 0;
        let includedPoints = 0;
        
        group.datasets.forEach(d => {
            totalPoints += d.data.length;
            if (appState.thresholds) {
                includedPoints += d.data.filter(row => isPointIncluded(row, appState.thresholds)).length;
            } else {
                includedPoints += d.data.length;
            }
        });
        
        const percentage = totalPoints > 0 ? Math.round((includedPoints / totalPoints) * 100) : 0;
        const statsText = `${includedPoints}/${totalPoints} (${percentage}%)`;

        const meta = document.createElement('div');
        meta.className = 'meta';
        meta.style.display = 'flex';
        meta.style.justifyContent = 'space-between';
        meta.style.width = '100%';
        
        const countSpan = document.createElement('span');
        countSpan.innerText = `${group.datasets.length} files`;
        
        const statsSpan = document.createElement('span');
        statsSpan.innerText = statsText;
        statsSpan.style.marginLeft = '10px';
        statsSpan.style.opacity = '0.8';
        
        meta.appendChild(countSpan);
        meta.appendChild(statsSpan);

        const textDiv = document.createElement('div');
        textDiv.style.flex = '1';
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
