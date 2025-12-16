/**
 * Main Application Entry Point
 */
import { parseFilename, parseCSV } from './parser.js';
import { state } from './state.js';
import { renderUI, setupUIListeners } from './ui.js';
import { renderChart } from './charts.js';
import { getGroups } from './state.js';
import { initUpload } from './upload.js';

// Initialize
function init() {
    setupUIListeners();
    
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
    state.subscribe((appState) => {
        // Update Sidebar List
        const groups = getGroups();
        renderUI(appState, groups);
        
        // Update Chart
        let groupsToPlot = [];
        
        if (appState.comparisonMode) {
             groupsToPlot = groups.filter(g => appState.selectedIds.includes(g.id));
        } else {
             if (appState.selectedIds.length > 0) {
                 const selectedId = appState.selectedIds[0];
                 const selectedGroup = groups.find(g => g.id === selectedId);
                 if (selectedGroup) groupsToPlot = [selectedGroup];
             }
        }
        
        if (groupsToPlot.length > 0) {
            // Explicitly clear placeholder
            document.getElementById('chart-container').innerHTML = '';
            
            renderChart(
                'chart-container', 
                groupsToPlot, 
                appState.aggregationMode, 
                appState.viewMode
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
