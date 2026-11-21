/**
 * Entry point: custom menu "update rooms data".
 * Reads Sheet → builds rooms.json → uploads missing Drive PNGs → single GitHub commit.
 */
function updateRoomsData() {
  var ui = SpreadsheetApp.getUi();
  try {
    var result = syncRoomsToGithub_();
    ui.alert(
      'update rooms data — success',
      result.summary,
      ui.ButtonSet.OK
    );
  } catch (err) {
    Logger.log(err);
    ui.alert(
      'update rooms data — failed',
      String(err && err.message ? err.message : err),
      ui.ButtonSet.OK
    );
    throw err;
  }
}

/**
 * Core sync (also callable from the Apps Script editor for testing).
 * @return {{summary: string, commitSha: string|null, newImages: number, skippedImages: number, roomCount: number}}
 */
function syncRoomsToGithub_() {
  getGitHubPat_(); // fail fast if token missing

  var parsed = readRoomsFromSheet_();
  var rooms = parsed.rooms;
  var imagePaths = parsed.imagePaths;

  if (rooms.length === 0) {
    throw new Error('No room rows to sync.');
  }

  // Validate every referenced image exists on Drive before touching GitHub
  imagePaths.forEach(function (rel) {
    getDriveImageFile_(rel);
  });

  var existing = listExistingGithubImages_();
  var toUpload = [];
  var skipped = 0;

  imagePaths.forEach(function (rel) {
    if (existing[rel]) {
      skipped++;
      return;
    }
    toUpload.push(downloadDriveImage_(rel));
  });

  var roomsJsonText = JSON.stringify(rooms, null, 2) + '\n';
  var message =
    'chore(data): sync rooms from Google Sheet (' +
    rooms.length +
    ' rooms, ' +
    toUpload.length +
    ' new images)';

  var commit = commitRoomsAndImages_(roomsJsonText, toUpload, message);

  var summary =
    'Rooms: ' + rooms.length + '\n' +
    'Images referenced: ' + imagePaths.length + '\n' +
    'New images uploaded: ' + toUpload.length + '\n' +
    'Images skipped (already on GitHub): ' + skipped + '\n' +
    'Files in commit: ' + commit.filesChanged + '\n' +
    'Commit: ' + commit.commitSha + '\n' +
    commit.htmlUrl;

  Logger.log(summary);
  return {
    summary: summary,
    commitSha: commit.commitSha,
    newImages: toUpload.length,
    skippedImages: skipped,
    roomCount: rooms.length
  };
}
