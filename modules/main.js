/**
 * Main Application Entry Point
 */
import { parseFilename, parseCSV } from './parser.js?v=2';
import { state } from './state.js?v=2';
import { renderUI, setupUIListeners, setupThemeToggle, getIsDarkMode } from './ui.js?v=2';
import { renderChart } from './charts.js?v=2';
import { getGroups, getSelectedGroups } from './state.js?v=2';
import { initUpload } from './upload.js?v=2';

import { setupProjectListeners, loadAndRestoreProject } from './project_ui.js?v=2';

// Initialize
async function init() {
    setupUIListeners();
    setupProjectListeners();
    setupThemeToggle();

    // Subscribe to state changes to re-render interface
    state.subscribe((appState, actionType) => {
        console.groupCollapsed(`State Update: ${actionType}`);
        console.log('Selected IDs:', appState.selectedIds);
        
        // Update Sidebar List (Skip if just a color change to prevent picker losing focus)
        const groups = getGroups();
        console.log(`Groups available: ${groups.length}`);
        
        if (actionType !== 'color_change' && actionType !== 'threshold_value_update') {
            try {
                renderUI(appState, groups);
            } catch (err) {
                console.error('Error rendering UI:', err);
            }
        }
        
        // Update Chart
        let groupsToPlot = [];
        
        if (appState.comparisonMode) {
             groupsToPlot = getSelectedGroups(groups, appState.selectedIds);
        } else {
             if (appState.selectedIds.length > 0) {
                 const selected = getSelectedGroups(groups, appState.selectedIds);
                 if (selected.length > 0) groupsToPlot = [selected[0]];
                 else console.warn('Selected IDs present but no matching groups found (getGroups mismatch?)');
             } else {
                 console.log('No selection active');
             }
        }
        
        console.log(`Groups to plot: ${groupsToPlot.length}`);

        if (groupsToPlot.length > 0) {
            // Purge old Plotly chart before clearing (prevents ResizeObserver re-render)
            try { Plotly.purge('chart-container'); } catch(e) {}
            document.getElementById('chart-container').innerHTML = '';
            
            try {
                renderChart(
                    'chart-container',
                    groupsToPlot,
                    appState.aggregationMode,
                    appState.viewMode,
                    appState.datasetColors,
                    getIsDarkMode(),
                    appState.thresholds,
                    appState.graphType,
                    appState.graphMetric,
                    appState.dotSize,
                    appState.jitterWidth,
                    appState.fontSize,
                    appState.logScale
                );
            } catch (err) {
                console.error('Error rendering Chart:', err);
                document.getElementById('chart-container').innerHTML = `
                    <div class="placeholder-chart">
                        <p style="color:red">Chart error: ${err.message}</p>
                    </div>
                `;
            }
        } else {
            // Clear chart or show placeholder
            document.getElementById('chart-container').innerHTML = `
                <div class="placeholder-chart">
                    <p>Select a dataset to visualize</p>
                </div>
            `;
        }
        console.groupEnd();
    });

    // Check for project in URL
    const urlParams = new URLSearchParams(window.location.search);
    const projectPath = urlParams.get('project');
    if (projectPath) {
        console.log('Found project in URL:', projectPath);
        
        // We await this so the initial state is set before other things if needed
        // But usually it's fine to be async
        const success = await loadAndRestoreProject(projectPath);
        if (success) {
            console.log('Initial project load complete. Scheduling final render check.');
            // Force a re-announcement of the loaded state to ensure UI catches up if it missed anything
            // Use setTimeout to ensure we yield to event loop and let DOM settle
            setTimeout(() => {
                console.log('Executing forced refresh (500ms delayed)');
                state.notify('force_refresh'); 
            }, 500); 
        }
    }
    
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
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
