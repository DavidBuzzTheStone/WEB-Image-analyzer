<?php
header('Content-Type: application/json');

$projectsDir = __DIR__ . '/../projects';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$folderPath = $input['folderPath'] ?? '';

if (!$folderPath) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing folderPath']);
    exit;
}

// Security: Prevent Directory Traversal
if (strpos($folderPath, '..') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$targetPath = $projectsDir . '/' . $folderPath;

if (!file_exists($targetPath)) {
    if (mkdir($targetPath, 0777, true)) {
        echo json_encode(['success' => true]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create folder']);
    }
} else {
    echo json_encode(['success' => true]);
}
?>
