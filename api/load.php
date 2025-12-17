<?php
header('Content-Type: application/json');

$projectsDir = __DIR__ . '/../projects';

$filePath = $_GET['filePath'] ?? '';

if (!$filePath) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing filePath']);
    exit;
}

if (strpos($filePath, '..') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$targetPath = $projectsDir . '/' . $filePath;

if (file_exists($targetPath)) {
    echo file_get_contents($targetPath);
} else {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
}
?>
