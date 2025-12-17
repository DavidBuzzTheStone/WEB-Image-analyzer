/**
 * UI Logic for Project Manager (Modal, etc)
 */
import { loadProjectTree, createFolder, saveProject, loadProject, prepareSaveData, deleteItem, copyItems, moveItems } from './project.js';
import { state } from './state.js';

let currentPath = ''; 
let selectedItem = null; // Primary selection (last clicked)
let selectedItems = []; // Multi-selection
let clipboard = { items: [], operation: null }; // { items: [], operation: 'copy'|'cut' } 

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

        // Clipboard
        // Only if modal is open?
        if (document.querySelector('.modal-overlay')) {
            // Copy
            if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
                if (selectedItems.length > 0) {
                    clipboard = { items: [...selectedItems], operation: 'copy' };
                    updateClipboardUI();
                    console.log('Copied', selectedItems.length);
                }
            }
            // Cut
            if ((e.metaKey || e.ctrlKey) && e.key === 'x') {
                if (selectedItems.length > 0) {
                    clipboard = { items: [...selectedItems], operation: 'cut' };
                    updateClipboardUI();
                    console.log('Cut', selectedItems.length);
                }
            }
            // Paste
            if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
                 if (clipboard.items.length > 0) {
                     handlePaste();
                 }
            }
            // Delete
            if (e.key === 'Backspace' || e.key === 'Delete') {
                 if (selectedItems.length > 0) {
                     // Check if not editing name input
                     if (document.activeElement.tagName !== 'INPUT') {
                        handleDelete(selectedItems);
                     }
                 }
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
    tools.style.alignItems = 'center';
    
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
    } 

    const pasteBtn = document.createElement('button');
    pasteBtn.id = 'browser-paste-btn';
    pasteBtn.className = 'secondary-btn small';
    pasteBtn.style.display = 'none';
    pasteBtn.style.marginLeft = '10px';
    pasteBtn.onclick = handlePaste;
    tools.appendChild(pasteBtn);
    
    // Initial update
    updateClipboardUI(); 
    
    const note = document.createElement('span');
    note.style.fontSize = '0.75rem';
    note.style.color = 'var(--text-secondary)';
    note.style.marginLeft = 'auto';
    note.innerText = 'Hold Cmd/Ctrl to Select Multiple';
    tools.appendChild(note);

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

let activeContext = null;

function updateClipboardUI() {
    const btn = document.getElementById('browser-paste-btn');
    if (btn) {
        if (clipboard.items.length > 0) {
            btn.style.display = 'inline-block';
            btn.innerText = `📋 Paste ${clipboard.items.length}`;
            // Different visual for Cut vs Copy?
            if (clipboard.operation === 'cut') {
                btn.innerText = `✂️ Paste ${clipboard.items.length}`;
            }
        } else {
            btn.style.display = 'none';
        }
    }
}

async function handlePaste() {
    if (!clipboard.items.length || !activeContext) return;
    try {
        const dest = currentPath;
        const items = clipboard.items.map(i => i.path);
        
        let res;
        if (clipboard.operation === 'copy') {
             res = await copyItems(items, dest);
        } else {
             res = await moveItems(items, dest);
        }
        
        if (res.error) {
            alert(res.error);
        } else {
            if (clipboard.operation === 'cut') clipboard = { items: [], operation: null };
            updateClipboardUI();
            refreshBrowser(activeContext.container, currentPath, activeContext.mode, activeContext.nameInput, activeContext.actionBtn, activeContext.pathDisplay);
        }
    } catch (e) {
        console.error(e);
        alert('Paste failed');
    }
}

async function handleDelete(items) {
    if (!activeContext) return;
    if (confirm(`Delete ${items.length} items?`)) {
        for (const item of items) {
             await deleteItem(item.path);
        }
        selectedItems = [];
        refreshBrowser(activeContext.container, currentPath, activeContext.mode, activeContext.nameInput, activeContext.actionBtn, activeContext.pathDisplay);
    }
}

async function refreshBrowser(container, pathStr, mode, nameInput, actionBtn, pathDisplay) {
    activeContext = { container, mode, nameInput, actionBtn, pathDisplay };
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
            selectedItems = [];
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
        div.dataset.path = item.path;
        if (selectedItems.some(i => i.path === item.path)) div.classList.add('selected');
        
        const icon = item.type === 'folder' ? '📁' : '📄';
        
        // Structure: Left (Icon + Name), Right (Actions)
        div.innerHTML = `
            <div class="browser-item-left">
                <span class="icon">${icon}</span>
                <span>${item.name}</span>
            </div>
            <div class="browser-item-actions" style="display:flex; gap:6px;">
                 <button class="text-btn small copy-btn" title="Copy" style="padding:4px 6px; background: var(--bg-tertiary); border-radius: 4px; border: 1px solid var(--border-color);">📋</button>
                 <button class="text-btn small cut-btn" title="Cut" style="padding:4px 6px; background: var(--bg-tertiary); border-radius: 4px; border: 1px solid var(--border-color);">✂️</button>
                 <button class="text-btn small delete-btn" title="Delete" style="padding:4px 6px; background: var(--bg-tertiary); border-radius: 4px; border: 1px solid var(--border-color); color:#ef4444;">🗑</button>
            </div>
        `;
        
        // Add listeners
        const copyBtn = div.querySelector('.copy-btn');
        copyBtn.onclick = (e) => {
            e.stopPropagation();
            clipboard = { items: [item], operation: 'copy' };
            updateClipboardUI();
            const original = copyBtn.innerText;
            copyBtn.innerText = '✅';
            setTimeout(() => copyBtn.innerText = original, 1000);
        };

        const cutBtn = div.querySelector('.cut-btn');
        cutBtn.onclick = (e) => {
            e.stopPropagation();
            clipboard = { items: [item], operation: 'cut' };
            updateClipboardUI();
            const original = cutBtn.innerText;
            cutBtn.innerText = '✅';
            setTimeout(() => cutBtn.innerText = original, 1000);
        };
        
        const delBtn = div.querySelector('.delete-btn');
        delBtn.onclick = (e) => {
            e.stopPropagation();
            handleDelete([item]);
        };
        
        div.onclick = (e) => {
             if (e.metaKey || e.ctrlKey) {
                 // Multi-select toggle
                 const idx = selectedItems.findIndex(i => i.path === item.path);
                 if (idx > -1) selectedItems.splice(idx, 1);
                 else selectedItems.push(item);
             } else {
                 // Single select
                 // If folder and no modifier, navigate immediately? 
                 if (item.type === 'folder') {
                      currentPath = item.path.replace(/\\/g, '/');
                      selectedItems = [];
                      refreshBrowser(container, currentPath, mode, nameInput, actionBtn, pathDisplay);
                      return;
                 }
                 selectedItems = [item];
                 selectedItem = item;
             }
             
             updateSelectionUI(container);
             
             // Update Action
             if (selectedItems.length === 1 && selectedItems[0].type === 'file') {
                 if (mode === 'load') actionBtn.disabled = false;
                 if (mode === 'save' && nameInput) {
                      nameInput.value = selectedItems[0].name.replace('.json', '');
                      nameInput.dispatchEvent(new Event('input'));
                 }
             } else {
                 if (mode === 'load') actionBtn.disabled = true;
             }
        };

        div.ondblclick = () => {
            if (item.type !== 'folder' && mode === 'load') {
                selectedItem = item;
                selectedItems = [item];
                actionBtn.click();
            }
        };

        container.appendChild(div);
    });
}

function updateSelectionUI(container) {
    container.querySelectorAll('.browser-item').forEach(div => {
        const p = div.dataset.path;
        if (p && selectedItems.some(i => i.path === p)) {
            div.classList.add('selected');
        } else {
            div.classList.remove('selected');
        }
    });
}
