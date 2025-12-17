const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const PROJECTS_DIR = path.join(__dirname, 'projects');

// Middleware
app.use(cors());
app.use(express.json({ limit: '500mb' })); // Support large payloads for datasets
app.use(express.static(__dirname)); // Serve static files

// Ensure projects directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
    fs.mkdirSync(PROJECTS_DIR);
}

// API Endpoints

// Get list of projects/folders
app.get('/api/projects', (req, res) => {
    try {
        const getStructure = (dir) => {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            return items.map(item => {
                const relativePath = path.relative(PROJECTS_DIR, path.join(dir, item.name));
                if (item.isDirectory()) {
                    return {
                        name: item.name,
                        path: relativePath,
                        type: 'folder',
                        children: getStructure(path.join(dir, item.name))
                    };
                } else if (item.name.endsWith('.json')) {
                    return {
                        name: item.name,
                        path: relativePath,
                        type: 'file'
                    };
                }
                return null;
            }).filter(Boolean);
        };
        
        res.json(getStructure(PROJECTS_DIR));
    } catch (error) {
        console.error('Error listing projects:', error);
        res.status(500).json({ error: 'Failed to list projects' });
    }
});

// Create Folder
app.post('/api/create-folder', (req, res) => {
    try {
        const { folderPath } = req.body;
        const targetPath = path.join(PROJECTS_DIR, folderPath);
        
        // Prevent directory traversal
        if (!targetPath.startsWith(PROJECTS_DIR)) {
            return res.status(403).json({ error: 'Invalid path' });
        }
        
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error creating folder:', error);
        res.status(500).json({ error: 'Failed to create folder' });
    }
});

// Delete Folder/File
app.post('/api/delete-item', (req, res) => {
    try {
        const { itemPath } = req.body;
        const targetPath = path.join(PROJECTS_DIR, itemPath);
        
        // Prevent directory traversal
        if (!targetPath.startsWith(PROJECTS_DIR)) {
            return res.status(403).json({ error: 'Invalid path' });
        }
        
        if (fs.existsSync(targetPath)) {
            // Check if it is root projects dir (don't delete that!)
            if (targetPath === PROJECTS_DIR) {
                 return res.status(403).json({ error: 'Cannot delete root' });
            }
            if (fs.rmSync) {
                fs.rmSync(targetPath, { recursive: true, force: true });
            } else if (fs.rmdirSync) {
                // Fallback for Node < 14.14
                fs.rmdirSync(targetPath, { recursive: true });
            } else {
                throw new Error("Node.js version too old for recursive delete");
            }
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

app.post('/api/copy-items', (req, res) => {
    try {
        const { items, destination } = req.body;
        const destDir = path.join(PROJECTS_DIR, destination || '');
        
        if (!destDir.startsWith(PROJECTS_DIR)) return res.status(403).json({ error: 'Invalid destination' });
        
        items.forEach(itemPath => {
            const srcPath = path.join(PROJECTS_DIR, itemPath);
            if (!srcPath.startsWith(PROJECTS_DIR)) return;
            
            const baseName = path.basename(srcPath);
            let destPath = path.join(destDir, baseName);
            
            let counter = 1;
            while (fs.existsSync(destPath)) {
                const ext = path.extname(baseName);
                const name = path.basename(baseName, ext);
                destPath = path.join(destDir, `${name}_copy${counter}${ext}`);
                counter++;
            }
            
            copyRecursiveSync(srcPath, destPath);
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error copying items:', error);
        res.status(500).json({ error: 'Failed to copy items' });
    }
});

app.post('/api/move-items', (req, res) => {
    try {
        const { items, destination } = req.body;
        const destDir = path.join(PROJECTS_DIR, destination || '');
        
        if (!destDir.startsWith(PROJECTS_DIR)) return res.status(403).json({ error: 'Invalid destination' });
        
        items.forEach(itemPath => {
            const srcPath = path.join(PROJECTS_DIR, itemPath);
            if (!srcPath.startsWith(PROJECTS_DIR)) return;
            
            // Prevent moving parent into child
            if (destDir.startsWith(srcPath) && destDir !== srcPath) {
                 return; 
            }
            
            const baseName = path.basename(srcPath);
            let destPath = path.join(destDir, baseName);
            
            if (fs.existsSync(destPath)) {
               // Simple rename collision handling
               let counter = 1;
               while (fs.existsSync(destPath)) {
                   const ext = path.extname(baseName);
                   const name = path.basename(baseName, ext);
                   destPath = path.join(destDir, `${name}_moved${counter}${ext}`);
                   counter++;
               }
            }
            
            fs.renameSync(srcPath, destPath);
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error moving items:', error);
        res.status(500).json({ error: 'Failed to move items' });
    }
});

// Save Project
app.post('/api/save', (req, res) => {
    try {
        const { filePath, data } = req.body;
        const targetPath = path.join(PROJECTS_DIR, filePath);
        
        if (!targetPath.startsWith(PROJECTS_DIR)) {
            return res.status(403).json({ error: 'Invalid path' });
        }
        
        // Ensure parent dir exists
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        
        fs.writeFileSync(targetPath, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving project:', error);
        res.status(500).json({ error: 'Failed to save project' });
    }
});

// Load Project
app.get('/api/load', (req, res) => {
    try {
        const { filePath } = req.query;
        const targetPath = path.join(PROJECTS_DIR, filePath);
        
        if (!targetPath.startsWith(PROJECTS_DIR)) {
            return res.status(403).json({ error: 'Invalid path' });
        }
        
        if (!fs.existsSync(targetPath)) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const data = fs.readFileSync(targetPath, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error loading project:', error);
        res.status(500).json({ error: 'Failed to load project' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
