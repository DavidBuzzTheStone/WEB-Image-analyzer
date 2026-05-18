/**
 * UI Manager Module
 * Handles DOM updates and user interactions.
 */
import { state, getGroups, getSelectedGroups, PALETTE } from './state.js';
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

    // Save Comparison
    document.getElementById('save-comparison-btn').addEventListener('click', () => {
        const s = state.get();
        const groups = getGroups();
        const selected = getSelectedGroups(groups, s.selectedIds);
        const defaultName = selected.map(g => g.label).join(' vs ');
        
        const name = prompt('Name for this comparison:', defaultName);
        if (name) {
            state.saveComparison(name);
        }
    });

    // Project Notes
    const notesBtn = document.getElementById('toggle-project-notes-btn');
    const notesInput = document.getElementById('project-notes-input');
    if (notesBtn && notesInput) {
        notesBtn.addEventListener('click', () => {
            const isHidden = notesInput.style.display === 'none';
            notesInput.style.display = isHidden ? 'block' : 'none';
            notesBtn.innerText = isHidden ? '▼ Project Notes' : '▶ Project Notes';
        });

        notesInput.addEventListener('input', (e) => {
            state.setProjectNotes(e.target.value);
        });
    }

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
    renderGraphSettings(appState);
    renderSidebarList(groups, appState);
    renderThresholdControls(appState);
    renderSavedComparisons(appState);
    renderSavedThresholds(appState);
}

function renderGraphSettings(stateData) {
    let container = document.getElementById('graph-settings');
    if (!container) {
        // Check if old container exists and remove it (cleanup)
        const oldContainer = document.getElementById('scatter-controls');
        if (oldContainer) oldContainer.remove();

        const metricContainer = document.getElementById('metric-select-container');
        if (!metricContainer) return; 
        
        container = document.createElement('div');
        container.id = 'graph-settings';
        container.style.marginTop = '1rem';
        // Insert after metric container
        metricContainer.parentNode.insertBefore(container, metricContainer.nextSibling);
        
        // Initial HTML
        container.innerHTML = `
            <h3>Graph Settings</h3>
            <div class="inputs-container">
                <div class="input-pair-group">
                    <div class="label-small" id="font-size-label">Font Size</div>
                    <input type="range" min="8" max="24" step="1" class="range-input" id="font-size-input" style="width:100%">
                </div>
                <div id="scatter-specific-settings">
                    <div class="input-pair-group">
                        <div class="label-small" id="dot-size-label">Dot Size</div>
                        <input type="range" min="2" max="20" step="1" class="range-input" id="dot-size-input" style="width:100%">
                    </div>
                    <div class="input-pair-group">
                        <div class="label-small" id="jitter-label">Jitter Width</div>
                        <input type="range" min="0" max="0.5" step="0.05" class="range-input" id="jitter-input" style="width:100%">
                    </div>
                </div>
                <div class="input-pair-group" id="log-scale-row">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;">
                        <input type="checkbox" id="log-scale-input">
                        <span class="label-small" style="margin:0">Log Scale (Y)</span>
                    </label>
                </div>
            </div>
        `;
    }

    container.style.display = 'block';
    
    // Toggle scatter specific
    const scatterSettings = container.querySelector('#scatter-specific-settings');
    if (stateData.graphType !== 'scatter') {
        scatterSettings.style.display = 'none';
    } else {
        scatterSettings.style.display = 'block';
    }
    
    // Bind Font Size
    const fontInput = container.querySelector('#font-size-input');
    fontInput.oninput = (e) => state.setFontSize(Number(e.target.value));
    
    if (document.activeElement !== fontInput) {
        fontInput.value = stateData.fontSize;
    }
    container.querySelector('#font-size-label').innerText = `Font Size: ${stateData.fontSize}px`;
    
    // Bind Scatter Inputs
    if (stateData.graphType === 'scatter') {
        const sizeInput = container.querySelector('#dot-size-input');
        const jitterInput = container.querySelector('#jitter-input');
        
        sizeInput.oninput = (e) => state.setDotSize(Number(e.target.value));
        jitterInput.oninput = (e) => state.setJitterWidth(Number(e.target.value));
        
        // Update UI if we are not currently interacting with it
        if (document.activeElement !== sizeInput) {
            sizeInput.value = stateData.dotSize;
        }
        if (document.activeElement !== jitterInput) {
            jitterInput.value = stateData.jitterWidth;
        }
        
        container.querySelector('#dot-size-label').innerText = `Dot Size: ${stateData.dotSize}px`;
        container.querySelector('#jitter-label').innerText = `Jitter Width: ${stateData.jitterWidth}`;
    }

    // Bind Log Scale
    const logScaleInput = container.querySelector('#log-scale-input');
    logScaleInput.onchange = (e) => state.setLogScale(e.target.checked);
    if (document.activeElement !== logScaleInput) {
        logScaleInput.checked = stateData.logScale;
    }
}

function renderSavedComparisons(stateData) {
    const list = document.getElementById('saved-comparisons-list');
    
    if (!stateData.savedComparisons || stateData.savedComparisons.length === 0) {
        list.innerHTML = '<div class="empty-state small">No saved comparisons</div>';
        return;
    }
    
    list.innerHTML = '';
    
    stateData.savedComparisons.forEach(comp => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.cursor = 'pointer';
        row.style.padding = '6px 8px';
        
        const label = document.createElement('span');
        label.innerText = comp.name;
        
        if (stateData.viewMode === comp.viewMode && 
            stateData.comparisonMode && 
            JSON.stringify(stateData.selectedIds.sort()) === JSON.stringify(comp.selectedIds.sort())) {
            row.classList.add('selected');
        }

        const actionGroup = document.createElement('div');
        actionGroup.style.display = 'flex';
        actionGroup.style.gap = '4px';

        const noteBtn = document.createElement('button');
        noteBtn.innerHTML = '📝';
        noteBtn.className = 'text-btn small';
        noteBtn.title = comp.note ? comp.note : 'Add Note';
        noteBtn.style.opacity = comp.note ? '1' : '0.4';
        noteBtn.style.padding = '0 2px';
        noteBtn.onclick = (e) => {
            e.stopPropagation();
            showNoteModal('Edit Note', comp.note, (newNote) => {
                state.setComparisonNote(comp.id, newNote);
            });
        };
        
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '🗑';
        delBtn.className = 'text-btn danger small';
        delBtn.style.padding = '0 2px';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Delete comparison "${comp.name}"?`)) {
                state.deleteComparison(comp.id);
            }
        };
        
        actionGroup.appendChild(noteBtn);
        actionGroup.appendChild(delBtn);
        
        row.onclick = () => {
             // Restore comparison
             if (comp.aggregationMode) state.setAggregationMode(comp.aggregationMode);
             if (comp.graphType) state.setGraphType(comp.graphType);
             if (comp.graphMetric) state.setGraphMetric(comp.graphMetric);

             if (stateData.viewMode !== comp.viewMode) {
                 state.setViewMode(comp.viewMode);
             }
             
             state.setComparisonMode(true);
             state.setSelectedIds(comp.selectedIds);
        };
        
        row.appendChild(label);
        row.appendChild(actionGroup);
        list.appendChild(row);
    });
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
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'secondary-btn small';
        saveBtn.innerText = 'Save';
        saveBtn.addEventListener('click', () => {
             const defaultName = formatThresholdName(t);
             const name = prompt('Name for these settings:', defaultName);
             if (name) {
                 state.saveThresholds(name);
             }
        });

        const clearBtn = document.createElement('button');
        clearBtn.className = 'text-btn danger';
        clearBtn.innerText = 'Remove';
        clearBtn.addEventListener('click', () => {
             state.setThresholds(null);
        });
        
        actionRow.appendChild(editBtn);
        actionRow.appendChild(saveBtn);
        actionRow.appendChild(clearBtn);
    }
    
    controls.appendChild(actionRow);
}

function renderSavedThresholds(stateData) {
    const list = document.getElementById('saved-thresholds-list');
    if (!list) return;

    if (!stateData.savedThresholds || stateData.savedThresholds.length === 0) {
        list.innerHTML = '';
        list.style.display = 'none';
        return;
    }

    list.style.display = 'block';
    list.innerHTML = '<div class="label-small" style="margin-bottom:4px">Saved Settings</div>';

    stateData.savedThresholds.forEach(th => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.alignItems = 'center';
        row.style.cursor = 'pointer';
        row.style.padding = '4px 8px';
        
        const label = document.createElement('span');
        label.innerText = th.name;
        label.style.fontSize = '0.9em';

        // Delete button
        const delBtn = document.createElement('button');
        delBtn.innerHTML = '🗑';
        delBtn.className = 'text-btn danger small';
        delBtn.style.padding = '0 2px';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Delete saved threshold "${th.name}"?`)) {
                state.deleteThresholds(th.id);
            }
        };

        row.appendChild(label);
        row.appendChild(delBtn);
        
        // Click to apply
        row.onclick = () => {
            // Apply these thresholds
            // We need to make sure we don't just overwrite, but maybe we should?
            // Yes, user clicked it, so we load it.
            if (confirm(`Apply settings "${th.name}"?`)) {
                state.setThresholds({
                    ...th.thresholds,
                    isAdjusting: false // Apply immediately
                });
            }
        };

        list.appendChild(row);
    });
}

function formatThresholdName(thresholds) {
    const v = thresholds.values;
    const fmt = (min, max) => {
        const minStr = min !== undefined ? min : '-';
        const maxStr = max !== undefined ? max : '-';
        return `(${minStr}; ${maxStr})`;
    };

    if (thresholds.type === 'density') {
        const range = fmt(v.densityMin, v.densityMax);
        return `Density: ${range}`;
    } else {
        const intRange = fmt(v.intMin, v.intMax);
        const areaRange = fmt(v.areaMin, v.areaMax);
        return `Int.: ${intRange}, Area: ${areaRange}`;
    }
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
    // Save Button State
    const saveBtn = document.getElementById('save-project-btn');
    if (saveBtn) {
        if (state.isDirty) saveBtn.classList.add('unsaved-changes');
        else saveBtn.classList.remove('unsaved-changes');
    }

    const notesInput = document.getElementById('project-notes-input');
    if (document.activeElement !== notesInput && notesInput) {
        notesInput.value = state.projectNotes || '';
    }

    // View Mode Active State
    document.querySelectorAll('#view-mode-toggle .toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.value === state.viewMode);
    });
    
    // Aggregation Controls Visibility & State
    const aggControls = document.getElementById('aggregation-controls');
    // "only available when grouped by well or parameter" AND not histogram/bar AND not box
    if ((state.viewMode === 'well' || state.viewMode === 'parameter') &&
        !['histogram', 'bar', 'box', 'violin', 'raincloud'].includes(state.graphType)) {
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
    
    // Save Comparison Button
    const saveCompBtn = document.getElementById('save-comparison-btn');
    if (saveCompBtn) {
        saveCompBtn.disabled = !state.comparisonMode;
    }
    
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
    
    // Drag Handlers
    const handleDragStart = (e) => {
        e.stopPropagation(); // Prevent bubbling to parent folder
        e.dataTransfer.setData('text/plain', group.id);
        e.dataTransfer.effectAllowed = 'move';
        // visual feedback?
    };
    
    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        
        // Don't show drop feedback on self
        // Note: We can't easily check drag source ID here in all browsers, 
        // but we'll prevent the drop action later.
        
        // Remove existing classes
        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
        
        if (e.clientY < midY) {
            e.currentTarget.classList.add('drag-over-top');
        } else {
            e.currentTarget.classList.add('drag-over-bottom');
        }
    };
    
    const handleDragLeave = (e) => {
        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
    };
    
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.classList.remove('drag-over-top', 'drag-over-bottom');
        
        const sourceId = e.dataTransfer.getData('text/plain');
        if (sourceId === group.id) return; // Dropped on self
        
        const rect = e.currentTarget.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        const position = e.clientY < midY ? 'before' : 'after';
        
        state.reorderGroup(sourceId, group.id, position);
    };


    if (group.type === 'folder') {
        const isExpanded = appState.expandedIds.includes(group.id);
        
        // Folder Container
        const container = document.createElement('div');
        container.className = 'group-container';
        
        // Header
        const header = document.createElement('div');
        header.className = 'group-header interactable';
        header.draggable = true; // Enable Drag
        
        // Ensure flex layout
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.paddingLeft = `${level * 12}px`;
        
        header.ondragstart = handleDragStart;
        header.ondragover = handleDragOver;
        header.ondragleave = handleDragLeave;
        header.ondrop = handleDrop;
        
        // Chevron
        const chevron = document.createElement('span');
        chevron.className = `chevron ${isExpanded ? 'expanded' : ''}`;
        chevron.innerText = '▶'; 
        chevron.style.marginRight = '4px';
        
        const label = document.createElement('span');
        label.innerText = group.label;
        
        header.appendChild(chevron);
        header.appendChild(label);
        
        // Toggle Handler (Check if clicking chevron or label, not dragging)
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
        item.draggable = true; // Enable Drag
        item.dataset.id = group.id;
        item.style.paddingLeft = `${(level * 12) + 10}px`; // Base padding + Indent
        
        item.ondragstart = handleDragStart;
        item.ondragover = handleDragOver;
        item.ondragleave = handleDragLeave;
        item.ondrop = handleDrop;
        
        // Selection State
        if (appState.selectedIds.includes(group.id)) {
            item.classList.add('selected');
        }

        // Color Swatch (Custom Picker Trigger)
        const colorSwatch = document.createElement('div');
        colorSwatch.className = 'color-swatch-btn';
        const currentColor = appState.datasetColors[group.id] || getDefaultColor(group.id);
        colorSwatch.style.backgroundColor = currentColor;
        
        // Prevent row selection when clicking color
        colorSwatch.addEventListener('click', (e) => {
            e.stopPropagation();
            const rect = colorSwatch.getBoundingClientRect();
            openColorPicker(rect.right + 10, rect.top, currentColor, (newColor) => {
                colorSwatch.style.backgroundColor = newColor;
                state.setDatasetColor(group.id, newColor);
            });
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
        
        item.appendChild(colorSwatch);
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

/* Helper for Note Modal */
function showNoteModal(title, initialValue, onSave) {
    // Remove existing if any
    const existing = document.getElementById('note-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'note-modal-overlay';
    overlay.className = 'modal-overlay';
    
    overlay.innerHTML = `
        <div class="modal-content" style="width: 400px; max-width: 90%;">
            <div class="modal-header">
                <h2>${title}</h2>
                <button class="text-btn close-btn" style="font-size:1.5rem; line-height:1;">×</button>
            </div>
            <div class="modal-body" style="padding: 16px;">
                <textarea id="note-modal-textarea" class="text-input" style="width: 100%; height: 150px; padding: 8px; resize: vertical; box-sizing: border-box; background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-primary); border-radius: 6px;">${initialValue || ''}</textarea>
            </div>
            <div class="modal-footer" style="padding: 12px 16px;">
                 <button class="secondary-btn cancel-btn">Cancel</button>
                 <button class="primary-btn save-btn" style="width: auto; padding: 6px 16px;">Save</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    const textarea = overlay.querySelector('#note-modal-textarea');
    textarea.focus();
    
    const close = () => overlay.remove();
    
    overlay.querySelector('.close-btn').onclick = close;
    overlay.querySelector('.cancel-btn').onclick = close;
    overlay.querySelector('.save-btn').onclick = () => {
        const val = textarea.value;
        onSave(val);
        close();
    };
    
    // Close on click outside
    overlay.onclick = (e) => {
        if (e.target === overlay) close();
    };
}

// --- Custom Color Picker ---

// Inject Styles
const style = document.createElement('style');
style.textContent = `
    .color-swatch-btn {
        width: 20px; 
        height: 20px; 
        border-radius: 4px; 
        border: 1px solid rgba(255,255,255,0.2); 
        cursor: pointer;
        flex-shrink: 0;
    }
    .color-picker-popup {
        position: fixed;
        background: var(--bg-card);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 9999;
        width: 220px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .cp-tabs {
        display: flex;
        border-bottom: 1px solid var(--border-color);
    }
    .cp-tab {
        flex: 1;
        padding: 8px 0;
        text-align: center;
        background: var(--bg-secondary);
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--text-secondary);
        border: none;
        outline: none;
    }
    .cp-tab.active {
        background: var(--bg-card);
        color: var(--text-primary);
        font-weight: 500;
        border-bottom: 2px solid var(--primary-color, #3b82f6);
    }
    .cp-content {
        padding: 12px;
    }
    .palette-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
    }
    .palette-item {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 4px;
        cursor: pointer;
        border: 1px solid rgba(0,0,0,0.1);
    }
    .palette-item:hover {
        transform: scale(1.1);
        border-color: #fff;
    }
    .custom-input-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }
    .native-trigger {
        width: 100%;
        height: 40px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
    }
`;
document.head.appendChild(style);

function openColorPicker(x, y, initialColor, onSelect) {
    // Remove existing
    const existing = document.getElementById('custom-color-picker');
    if (existing) existing.remove();

    const popup = document.createElement('div');
    popup.id = 'custom-color-picker';
    popup.className = 'color-picker-popup';
    
    // Ensure it's on screen
    // Simple logic: if x + width > window.width, shift left
    // if y + height > window.height, shift up
    
    // UI Structure
    popup.innerHTML = `
        <div class="cp-tabs">
            <button class="cp-tab active" data-tab="palette">Palette</button>
            <button class="cp-tab" data-tab="custom">Custom</button>
        </div>
        <div class="cp-content">
            <div id="cp-view-palette" style="display:block">
                <div class="palette-grid" id="cp-palette-grid"></div>
            </div>
            <div id="cp-view-custom" style="display:none">
                <div class="custom-input-container">
                    <div style="font-size:0.9rem; margin-bottom:4px; color:var(--text-secondary)">Pick any color:</div>
                     <div style="display:flex; gap:8px;">
                        <input type="color" id="cp-native-input" class="native-trigger" value="${initialColor}">
                     </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(popup);
    
    // Positioning (after append to get dimensions)
    const rect = popup.getBoundingClientRect();
    let left = x;
    let top = y;
    
    if (left + rect.width > window.innerWidth) {
       left = x - rect.width - 20; // Show on left side if too far right
    }
    if (top + rect.height > window.innerHeight) {
        top = window.innerHeight - rect.height - 10;
    }
    
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;

    // Tabs Logic
    const tabs = popup.querySelectorAll('.cp-tab');
    const viewPalette = popup.querySelector('#cp-view-palette');
    const viewCustom = popup.querySelector('#cp-view-custom');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
             tabs.forEach(t => t.classList.remove('active'));
             tab.classList.add('active');
             
             if (tab.dataset.tab === 'palette') {
                 viewPalette.style.display = 'block';
                 viewCustom.style.display = 'none';
             } else {
                 viewPalette.style.display = 'none';
                 viewCustom.style.display = 'block';
             }
        });
    });

    // Populate Palette
    const grid = popup.querySelector('#cp-palette-grid');
    PALETTE.forEach(color => {
        const item = document.createElement('div');
        item.className = 'palette-item';
        item.style.backgroundColor = color;
        item.onclick = () => {
            onSelect(color);
            popup.remove();
        };
        grid.appendChild(item);
    });

    // Native Logic
    const nativeInput = popup.querySelector('#cp-native-input');
    nativeInput.addEventListener('input', (e) => {
        onSelect(e.target.value);
    });
    // Don't close immediately on native input interaction, user might drag

    // Close on click outside
    const outsideListener = (e) => {
        if (!popup.contains(e.target)) {
            popup.remove();
            document.removeEventListener('mousedown', outsideListener);
        }
    };
    // Delay adding listener to avoid immediate close from the click that opened it
    setTimeout(() => {
        document.addEventListener('mousedown', outsideListener);
    }, 0);
}
