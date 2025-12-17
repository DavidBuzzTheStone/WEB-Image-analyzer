<?php
header('Content-Type: application/json');

// Helper to sanitize and validate paths
function validatePath($requestPath, $baseDir) {
    $realBase = realpath($baseDir);
    $target = realpath($baseDir . '/' . $requestPath);
    
    // If file doesn't exist yet (for new files), check directory
    if (!$target) {
        $dir = dirname($baseDir . '/' . $requestPath);
        $realDir = realpath($dir);
        if ($realDir && strpos($realDir, $realBase) === 0) {
            return $baseDir . '/' . $requestPath;
        }
        return false;
    }
    
    // Check if target is within base directory
    if ($target && strpos($target, $realBase) === 0) {
        return $target;
    }
    return false;
}

$projectsDir = __DIR__ . '/../projects';

if (!file_exists($projectsDir)) {
    mkdir($projectsDir, 0777, true);
}

// Router logic since we don't have Express
$uri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];

// Parse endpoint
// Assumes URLs like /api/projects, /api/save, etc.
// We'll create separate files for each or a router here.
// Let's create separate files in the 'api' folder for simplicity on shared hosting.
// This main file might not be used if we create:
// api/projects.php
// api/save.php
// etc.

echo json_encode(['error' => 'Use specific endpoints']);
?>
