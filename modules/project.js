/**
 * Project Manager Module
 * Handles interactions with the backend API for saving/loading projects.
 */

import { state } from './state.js';

export async function loadProjectTree() {
    const res = await fetch('/api/projects');
    return res.json();
}

export async function createFolder(folderPath) {
    const res = await fetch('/api/create-folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
    });
    return res.json();
}

export async function deleteItem(itemPath) {
    const res = await fetch('/api/delete-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemPath })
    });
    return res.json();
}

export async function saveProject(filePath, data) {
    const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, data })
    });
    return res.json();
}

export async function loadProject(filePath) {
    const res = await fetch(`/api/load?filePath=${encodeURIComponent(filePath)}`);
    return res.json();
}

/**
 * Filter unwanted columns from datasets before saving
 */
export function prepareSaveData() {
    const currentState = state.get();
    
    // Deep clone and filter datasets
    const cleanDatasets = currentState.datasets.map(ds => {
        const cleanData = ds.data.map(row => {
            const newRow = { ...row };
            delete newRow['Abs_frame'];
            delete newRow['X_(px)'];
            delete newRow['Y_(px)'];
            delete newRow['Channel'];
            delete newRow['Slice'];
            delete newRow['Frame'];
            return newRow;
        });
        
        return {
            ...ds,
            data: cleanData
        };
    });
    
    return {
        ...currentState,
        datasets: cleanDatasets,
        listeners: undefined // Don't save listeners
    };
}
