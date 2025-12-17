<?php
header('Content-Type: application/json');

$projectsDir = __DIR__ . '/../projects';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$items = $input['items'] ?? [];
$destination = $input['destination'] ?? '';

if (empty($items)) {
    echo json_encode(['success' => true]); // No items to copy
    exit;
}

if (strpos($destination, '..') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid destination']);
    exit;
}

$destDir = $projectsDir . ($destination ? '/' . $destination : '');
if (!file_exists($destDir)) {
    mkdir($destDir, 0777, true);
}

function copyRecursive($src, $dst) {
    if (is_dir($src)) {
        if (!file_exists($dst)) mkdir($dst);
        $files = scandir($src);
        foreach ($files as $file) {
            if ($file != "." && $file != "..") {
                copyRecursive("$src/$file", "$dst/$file");
            }
        }
    } else if (file_exists($src)) {
        copy($src, $dst);
    }
}

foreach ($items as $itemPath) {
    if (strpos($itemPath, '..') !== false) continue;
    
    $srcPath = $projectsDir . '/' . $itemPath;
    if (!file_exists($srcPath)) continue;
    
    $baseName = basename($srcPath);
    $destPath = $destDir . '/' . $baseName;
    
    // Collision handling
    $counter = 1;
    while (file_exists($destPath)) {
        $info = pathinfo($baseName);
        $ext = isset($info['extension']) ? '.' . $info['extension'] : '';
        $name = $info['filename'];
        $destPath = $destDir . '/' . $name . '_copy' . $counter . $ext;
        $counter++;
    }
    
    copyRecursive($srcPath, $destPath);
}

echo json_encode(['success' => true]);
?>
