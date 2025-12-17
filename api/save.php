<?php
header('Content-Type: application/json');

// Ensure a larger limit for JSON payloads if needed (standard is usually ok for paths)
// But for datasets, we need more memory maybe.
ini_set('memory_limit', '512M'); 
ini_set('post_max_size', '512M');
ini_set('upload_max_filesize', '512M');

$projectsDir = __DIR__ . '/../projects';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$filePath = $input['filePath'] ?? '';
$data = $input['data'] ?? null;

if (!$filePath || !$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing filePath or data']);
    exit;
}

if (strpos($filePath, '..') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid path']);
    exit;
}

$targetPath = $projectsDir . '/' . $filePath;

// Create dir if not exists
$dir = dirname($targetPath);
if (!file_exists($dir)) {
    mkdir($dir, 0777, true);
}

if (file_put_contents($targetPath, json_encode($data, JSON_PRETTY_PRINT))) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to write file']);
}
?>
