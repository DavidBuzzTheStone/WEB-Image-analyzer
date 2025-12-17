/**
 * UI Logic for Project Manager (Modal, etc)
 */
import { loadProjectTree, createFolder, saveProject, loadProject, prepareSaveData, deleteItem } from './project.js';
import { state } from './state.js';

let currentPath = ''; 
let selectedItem = null; 

export function setupProjectListeners() {
    // Save (Quick Save or Save As)
    const saveBtn = document.getElementById('save-project-btn');
    saveBtn.addEventListener('click', () => {
        const s = state.get();
        if (s.currentFilePath) {
            // Quick Save
            quickSave(s.currentFilePath);
        } else {
            // Save As
            openModal('save');
        }
    });
    
    // Save Options Toggle
    const toggle = document.getElementById('save-options-toggle');
    const menu = document.getElementById('save-options-menu');
    const group = document.getElementById('save-btn-group');
    
    if (toggle && menu && group) {
        let hideTimeout;

        const showMenu = () => {
            clearTimeout(hideTimeout);
            menu.style.display = 'block';
        };

        const hideMenu = () => {
            hideTimeout = setTimeout(() => {
                menu.style.display = 'none';
            }, 300);
        };

        // Toggle on click
        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            // If already open, close immediately. If closed, open.
            // We clear timeout to prevent hover-hide from interfering
            clearTimeout(hideTimeout);
            menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
        });
        
        // Hover behavior
        group.addEventListener('mouseenter', showMenu);
        group.addEventListener('mouseleave', hideMenu);
        
        // Also ensure menu itself keeps it open (if gap caused leave)
        menu.addEventListener('mouseenter', showMenu);
        menu.addEventListener('mouseleave', hideMenu);
        
        // Save As Action
        document.getElementById('save-as-btn').addEventListener('click', () => {
            menu.style.display = 'none';
            openModal('save');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', () => {
            menu.style.display = 'none';
        });
    }

    document.getElementById('load-project-btn').addEventListener('click', () => openModal('load'));
    
    // Global Shortcuts
    document.addEventListener('keydown', (e) => {
        // Esc to close modal
        if (e.key === 'Escape') {
            const overlay = document.querySelector('.modal-overlay');
            if (overlay) document.body.removeChild(overlay);
        }
        
        // Ctrl+S / Cmd+S to Save
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault(); // Prevent browser save
            const s = state.get();
            if (s.currentFilePath) {
                quickSave(s.currentFilePath);
            } else {
                openModal('save');
            }
        }
    });
}

async function quickSave(path) {
    try {
        const dataToSave = prepareSaveData();
        // Ensure path includes extension just in case, though it should from state
        await saveProject(path, dataToSave);
        state.markAsSaved();
        
        // Visual feedback
        const btn = document.getElementById('save-project-btn');
        const originalText = btn.innerText;
        btn.innerText = 'Saved!';
        setTimeout(() => btn.innerText = originalText, 1000);
        
    } catch (err) {
        console.error(err);
        alert('Quick save failed.');
    }
}

function openModal(mode) {
    // 1. Structure
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    
    const content = document.createElement('div');
    content.className = 'modal-content';
    
    // Header
    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h2>${mode === 'save' ? 'Save Project' : 'Load Project'}</h2>`;
    const closeBtn = document.createElement('button');
    closeBtn.className = 'text-btn';
    closeBtn.innerText = '✕';
    closeBtn.onclick = () => document.body.removeChild(overlay);
    header.appendChild(closeBtn);
    
    // Body
    const body = document.createElement('div');
    body.className = 'modal-body';

    // -- Tools Row (New Folder)
    const tools = document.createElement('div');
    tools.style.display = 'flex'; 
    tools.style.marginBottom = '10px';
    tools.style.justifyContent = 'space-between';
    
    if (mode === 'save') {
        const newFolderBtn = document.createElement('button');
        newFolderBtn.className = 'secondary-btn small';
        newFolderBtn.innerText = '+ New Folder';
        newFolderBtn.onclick = async () => {
            const name = prompt('Folder Name:');
            if (name) {
                // Sanitize name
                const safeName = name.replace(/[^a-zA-Z0-9_\- ]/g, '');
                if (!safeName) return;
                const path = currentPath ? `${currentPath}/${safeName}` : safeName;
                await createFolder(path);
                refreshBrowser(browser, currentPath, mode, nameInput, actionBtn, pathDisplay);
            }
        };
        tools.appendChild(newFolderBtn);
    } else {
        // Spacer if load mode
        tools.appendChild(document.createElement('div'));
    }

    // Path Display
    const pathDisplay = document.createElement('div');
    pathDisplay.className = 'current-path-display';
    pathDisplay.innerText = '/';
    
    // assemble tools row properly? actually path display should be separate
    
    // Browser
    const browser = document.createElement('div');
    browser.className = 'file-browser';

    body.appendChild(tools);
    body.appendChild(pathDisplay);
    body.appendChild(browser);

    // Footer
    const footer = document.createElement('div');
    footer.className = 'modal-footer';
    
    const actionBtn = document.createElement('button');
    actionBtn.className = 'primary-btn';
    actionBtn.innerText = mode === 'save' ? 'Save' : 'Load';
    actionBtn.disabled = true; // Default disabled

    // Name Input (Save Mode only)
    let nameInput;
    if (mode === 'save') {
        const inputGroup = document.createElement('div');
        inputGroup.className = 'modal-input-group';
        nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = 'Project Name';
        nameInput.spellcheck = false;
        
        nameInput.addEventListener('input', () => {
            actionBtn.disabled = !nameInput.value.trim();
        });
        
        inputGroup.appendChild(nameInput);
        footer.appendChild(inputGroup);
    }

    footer.appendChild(actionBtn);

    content.appendChild(header);
    content.appendChild(body);
    content.appendChild(footer);
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Initialize
    currentPath = '';
    selectedItem = null;
    refreshBrowser(browser, currentPath, mode, nameInput, actionBtn, pathDisplay);

    // Handle Action
    actionBtn.onclick = async () => {
        try {
            if (mode === 'save') {
                const name = nameInput.value.trim();
                if (!name) return;
                
                const fileName = name.endsWith('.json') ? name : `${name}.json`;
                const fullPath = currentPath ? `${currentPath}/${fileName}` : fileName;
                
                const dataToSave = prepareSaveData();
                await saveProject(fullPath, dataToSave);
                state.setProjectFilePath(fullPath);
                state.markAsSaved();
                alert('Project saved successfully!');
                document.body.removeChild(overlay);
            } else {
                if (!selectedItem || selectedItem.type !== 'file') return;
                const projectData = await loadProject(selectedItem.path);
                
                state.setProjectFilePath(selectedItem.path);
                
                // Restore State
                if (projectData.datasets) {
                    state.setDatasets(projectData.datasets);
                    if (projectData.thresholds) state.setThresholds(projectData.thresholds);
                    if (projectData.viewMode) state.setViewMode(projectData.viewMode);
                    if (projectData.expandedIds) state.setExpandedIds(projectData.expandedIds);
                    if (projectData.graphType) state.setGraphType(projectData.graphType);
                    if (projectData.graphMetric) state.setGraphMetric(projectData.graphMetric);
                    if (projectData.datasetColors) state.setDatasetColors(projectData.datasetColors);
                    if (projectData.savedComparisons) state.setSavedComparisons(projectData.savedComparisons);
                    
                    state.setProjectNotes(projectData.projectNotes || '');
                    
                    state.markAsLoaded();
                }
                
                document.body.removeChild(overlay);
            }
        } catch (err) {
            console.error(err);
            alert('Operation failed.');
        }
    };
}

async function refreshBrowser(container, pathStr, mode, nameInput, actionBtn, pathDisplay) {
    container.innerHTML = '<div style="padding:20px; text-align:center; color:#888;">Loading...</div>';
    
    // Update path display
    pathDisplay.innerText = pathStr ? `/${pathStr}` : '/';

    try {
        const tree = await loadProjectTree();
        // Traverse
        let currentDir = tree;
        if (pathStr) {
            const parts = pathStr.split('/');
            for (const part of parts) {
                if (!part) continue;
                const found = currentDir.find(i => i.name === part && i.type === 'folder');
                if (found) currentDir = found.children || [];
                else {
                    currentDir = []; // Path not found (maybe deleted)
                    break;
                }
            }
        }
        
        renderBrowserItems(container, currentDir, pathStr, mode, nameInput, actionBtn, pathDisplay);
    } catch (err) {
        container.innerHTML = '<div style="padding:20px; color:red;">Error loading files</div>';
        console.error(err);
    }
}

function renderBrowserItems(container, items, pathStr, mode, nameInput, actionBtn, pathDisplay) {
    container.innerHTML = '';
    
    // Up directory (if not root)
    if (pathStr) {
        const upDiv = document.createElement('div');
        upDiv.className = 'browser-item';
        // Mocking structure for consistent styling
        upDiv.innerHTML = `
            <div class="browser-item-left">
                <span class="icon">📁</span>
                <span>..</span>
            </div>
        `;
        upDiv.onclick = () => {
            const parts = pathStr.split('/');
            parts.pop();
            currentPath = parts.join('/');
            refreshBrowser(container, currentPath, mode, nameInput, actionBtn, pathDisplay);
        };
        container.appendChild(upDiv);
    }

    if (items.length === 0 && !pathStr) {
        container.innerHTML += '<div style="padding:20px; text-align:center; color:#666;">Empty workspace</div>';
        return;
    }
    
    // Sort: Folders first, then files
    items.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'browser-item';
        
        const icon = item.type === 'folder' ? '📁' : '📄';
        
        // Structure: Left (Icon + Name), Right (Delete Btn)
        div.innerHTML = `
            <div class="browser-item-left">
                <span class="icon">${icon}</span>
                <span>${item.name}</span>
            </div>
            <button class="delete-btn" title="Delete">🗑</button>
        `;
        
        const deleteBtn = div.querySelector('.delete-btn');
        deleteBtn.onclick = async (e) => {
            e.stopPropagation(); // Prevent selection
            if (confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) {
                try {
                    const result = await deleteItem(item.path); 
                    if (result.error) {
                        alert(result.error);
                    } else {
                        refreshBrowser(container, pathStr, mode, nameInput, actionBtn, pathDisplay);
                    }
                } catch (err) {
                    console.error(err);
                    alert('Failed to delete item. Server might be unreachable.');
                }
            }
        };

        div.onclick = () => {
             // Handle selection
             document.querySelectorAll('.browser-item').forEach(el => el.classList.remove('selected'));
             div.classList.add('selected');
             selectedItem = item;
             
             if (item.type === 'folder') {
                 // Open folder immediately
                 currentPath = item.path.replace(/\\/g, '/');
                 refreshBrowser(container, currentPath, mode, nameInput, actionBtn, pathDisplay);
             } else {
                 if (mode === 'load') {
                     actionBtn.disabled = false;
                 } else if (mode === 'save') {
                     // Fill name
                     if (nameInput) {
                         nameInput.value = item.name.replace('.json', '');
                         // Trigger input event to update valid state
                         nameInput.dispatchEvent(new Event('input'));
                     }
                 }
             }
        };

        div.ondblclick = () => {
            if (item.type !== 'folder' && mode === 'load') {
                selectedItem = item;
                actionBtn.click();
            }
        };

        container.appendChild(div);
    });
}
