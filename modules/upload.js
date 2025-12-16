/**
 * Upload Manager Module
 * Handles file input interactions and Drag & Drop logic.
 */

export function initUpload(onFilesReceived) {
    setupDragAndDrop(onFilesReceived);
    setupFileInput(onFilesReceived);
}

function setupFileInput(callback) {
    const input = document.getElementById('file-input');
    if (!input) {
        console.error('File input element not found');
        return;
    }

    // Remove any existing listeners (by cloning, a quick hack, or just trusting this runs once)
    // Since we are modular, this runs once per app init.
    
    input.addEventListener('change', (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            processFiles(files, callback);
        }
        input.value = ''; // Reset
    });
}

function setupDragAndDrop(callback) {
    const overlay = document.getElementById('upload-overlay');
    let dragCounter = 0;

    // Prevent default browser behavior for all drag events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // Provide visual feedback
    window.addEventListener('dragenter', (e) => {
        dragCounter++;
        overlay.classList.remove('hidden');
    });

    window.addEventListener('dragleave', (e) => {
        dragCounter--;
        if (dragCounter === 0) {
            overlay.classList.add('hidden');
        }
    });

    window.addEventListener('drop', (e) => {
        dragCounter = 0; // Reset
        overlay.classList.add('hidden');
        
        const dt = e.dataTransfer;
        const files = Array.from(dt.files || []);
        
        processFiles(files, callback);
    });
}

function processFiles(fileList, callback) {
    const validFiles = fileList.filter(f => f.name.toLowerCase().endsWith('.csv'));
    
    if (validFiles.length === 0) {
        console.warn('No CSV files found in selection');
        alert('Please upload CSV files.');
        return;
    }

    console.log(`Processing ${validFiles.length} files...`);
    callback(validFiles);
}
