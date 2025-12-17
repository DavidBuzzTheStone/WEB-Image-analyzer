<?php
header('Content-Type: application/json');

$projectsDir = __DIR__ . '/../projects';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$itemPath = $input['itemPath'] ?? '';

if (!$itemPath) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing itemPath']);
    exit;
}

if (strpos($itemPath, '..') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$targetPath = $projectsDir . '/' . $itemPath;

// Recursive delete function
function deleteRecursive($path) {
    if (is_dir($path)) {
        $files = scandir($path);
        foreach ($files as $file) {
            if ($file != "." && $file != "..") {
                deleteRecursive($path . DIRECTORY_SEPARATOR . $file);
            }
        }
        rmdir($path);
    } else if (file_exists($path)) {
        unlink($path);
    }
}

if (file_exists($targetPath)) {
    // Prevent deleting root
    if (realpath($targetPath) === realpath($projectsDir)) {
         http_response_code(403);
         echo json_encode(['error' => 'Cannot delete root']);
         exit;
    }

    try {
        deleteRecursive($targetPath);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete item']);
    }
} else {
    // Already gone is success
    echo json_encode(['success' => true]);
}
?>
