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
    echo json_encode(['success' => true]);
    exit;
}

if (strpos($destination, '..') !== false) {
    http_response_code(403);
    echo json_encode(['error' => 'Invalid destination']);
    exit;
}

$destDir = $projectsDir . ($destination ? '/' . $destination : '');
if (!file_exists($destDir)) {
    // If destination folder doesn't exist, we probably shouldn't create it blindly unless it is the root?
    // Actually move implies destination folder exists or is root.
    // If root (empty string), it exists.
    if ($destination) mkdir($destDir, 0777, true);
}

foreach ($items as $itemPath) {
    if (strpos($itemPath, '..') !== false) continue;
    
    $srcPath = $projectsDir . '/' . $itemPath;
    if (!file_exists($srcPath)) continue;
    
    // Check if moving parent into child
    $realSrc = realpath($srcPath);
    $realDest = realpath($destDir);
    if ($realDest && strpos($realDest, $realSrc) === 0 && $realDest !== $realSrc) {
        // Destination is inside Source, skip to avoid infinite loop or errors
        continue;
    }

    $baseName = basename($srcPath);
    $destPath = $destDir . '/' . $baseName;
    
    if (file_exists($destPath)) {
        // Collision handling (rename on move if collision)
        $counter = 1;
        while (file_exists($destPath)) {
             $info = pathinfo($baseName);
             $ext = isset($info['extension']) ? '.' . $info['extension'] : '';
             $name = $info['filename'];
             $destPath = $destDir . '/' . $name . '_moved' . $counter . $ext;
             $counter++;
        }
    }
    
    rename($srcPath, $destPath);
}

echo json_encode(['success' => true]);
?>
