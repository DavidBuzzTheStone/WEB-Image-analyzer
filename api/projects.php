<?php
header('Content-Type: application/json');

// Configuration
$projectsDir = __DIR__ . '/../projects'; // Adjust based on your folder structure

if (!file_exists($projectsDir)) {
    mkdir($projectsDir, 0777, true);
}

function getStructure($dir) {
    global $projectsDir;
    $results = [];
    $items = scandir($dir);
    
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        
        $path = $dir . '/' . $item;
        $relativePath = substr($path, strlen($projectsDir) + 1); // +1 for slash
        
        if (is_dir($path)) {
            $results[] = [
                'name' => $item,
                'path' => $relativePath,
                'type' => 'folder',
                'children' => getStructure($path)
            ];
        } elseif (substr($item, -5) === '.json') {
            $results[] = [
                'name' => $item,
                'path' => $relativePath,
                'type' => 'file'
            ];
        }
    }
    return $results;
}

try {
    echo json_encode(getStructure($projectsDir));
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
