/**
 * Resolve a relative path under the Drive image/ folder to a File.
 * e.g. "room01/1.png" → File
 * @param {string} relativePath
 * @return {GoogleAppsScript.Drive.File}
 */
function getDriveImageFile_(relativePath) {
  var parts = relativePath.split('/').filter(function (p) {
    return p.length > 0;
  });
  if (parts.length === 0) {
    throw new Error('Empty image path.');
  }

  var folder = DriveApp.getFolderById(CONFIG.IMAGE_FOLDER_ID);
  for (var i = 0; i < parts.length - 1; i++) {
    var folders = folder.getFoldersByName(parts[i]);
    if (!folders.hasNext()) {
      throw new Error('Drive folder not found for path segment "' + parts[i] + '" in "' + relativePath + '".');
    }
    folder = folders.next();
  }

  var fileName = parts[parts.length - 1];
  var files = folder.getFilesByName(fileName);
  if (!files.hasNext()) {
    throw new Error('Drive file not found: image/' + relativePath);
  }
  return files.next();
}

/**
 * Download PNG bytes for a relative image path.
 * @param {string} relativePath
 * @return {{path: string, bytes: GoogleAppsScript.Byte[], contentType: string}}
 */
function downloadDriveImage_(relativePath) {
  var file = getDriveImageFile_(relativePath);
  var blob = file.getBlob();
  return {
    path: relativePath,
    bytes: blob.getBytes(),
    contentType: blob.getContentType() || 'image/png'
  };
}
