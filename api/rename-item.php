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
$newName = $input['newName'] ?? '';

if (!$itemPath || !$newName) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing itemPath or newName']);
    exit;
}

if (strpos($itemPath, '..') !== false || strpos($newName, '..') !== false || strpos($newName, '/') !== false || strpos($newName, '\\') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path or name']);
    exit;
}

$oldFullPath = $projectsDir . '/' . $itemPath;
$dir = dirname($oldFullPath);
$newFullPath = $dir . '/' . $newName;

if (!file_exists($oldFullPath)) {
    http_response_code(404);
    echo json_encode(['error' => 'Item not found']);
    exit;
}

if (file_exists($newFullPath)) {
    http_response_code(409); // Conflict
    echo json_encode(['error' => 'Item with new name already exists']);
    exit;
}

if (rename($oldFullPath, $newFullPath)) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to rename item']);
}
?>
