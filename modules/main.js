/**
 * Main Application Entry Point
 */
import { parseFilename, parseCSV } from './parser.js';
import { state } from './state.js';
import { renderUI, setupUIListeners, setupThemeToggle, getIsDarkMode } from './ui.js';
import { renderChart } from './charts.js';
import { getGroups, getSelectedGroups } from './state.js';
import { initUpload } from './upload.js';

// Initialize
function init() {
    setupUIListeners();
    setupThemeToggle();
    
    // Initialize Upload Handling
    initUpload(async (files) => {
        // Process the received files
        for (const file of files) {
            const metadata = parseFilename(file.name);
            if (!metadata) {
                console.warn(`Skipping ${file.name}: Invalid filename format`);
                continue;
            }
            
            try {
                const data = await parseCSV(file);
                state.addDataset({
                    id: file.name,
                    metadata,
                    data
                });
            } catch (err) {
                console.error('Error parsing file:', file.name, err);
            }
        }
    });
    
    // Subscribe to state changes to re-render interface
    state.subscribe((appState, actionType) => {
        // Update Sidebar List (Skip if just a color change to prevent picker losing focus)
        const groups = getGroups();
        if (actionType !== 'color_change') {
            renderUI(appState, groups);
        }
        
        // Update Chart
        let groupsToPlot = [];
        
        if (appState.comparisonMode) {
             groupsToPlot = getSelectedGroups(groups, appState.selectedIds);
        } else {
             if (appState.selectedIds.length > 0) {
                 const selected = getSelectedGroups(groups, appState.selectedIds);
                 if (selected.length > 0) groupsToPlot = [selected[0]];
             }
        }
        
        if (groupsToPlot.length > 0) {
            // Explicitly clear placeholder
            document.getElementById('chart-container').innerHTML = '';
            
            renderChart(
                'chart-container', 
                groupsToPlot, 
                appState.aggregationMode, 
                appState.viewMode,
                appState.datasetColors,
                getIsDarkMode(),
                appState.thresholds
            );
        } else {
            // Clear chart or show placeholder
            document.getElementById('chart-container').innerHTML = `
                <div class="placeholder-chart">
                    <p>Select a dataset to visualize</p>
                </div>
            `;
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
