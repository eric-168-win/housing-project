/**
 * GitHub helpers: auth, existence checks, and single-commit Git Data API push.
 */

function getGitHubPat_() {
  var pat = PropertiesService.getScriptProperties().getProperty(CONFIG.GITHUB_PAT_PROPERTY);
  if (!pat || !String(pat).trim()) {
    throw new Error(
      'Missing Script Property "' + CONFIG.GITHUB_PAT_PROPERTY + '". ' +
      'Open Extensions → Apps Script → Project Settings → Script properties, ' +
      'add a Fine-grained PAT with Contents read/write on ' +
      CONFIG.GITHUB_OWNER + '/' + CONFIG.GITHUB_REPO + '.'
    );
  }
  return String(pat).trim();
}

function githubRequest_(method, apiPath, payload) {
  var url = 'https://api.github.com' + apiPath;
  var options = {
    method: method,
    headers: {
      Authorization: 'Bearer ' + getGitHubPat_(),
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'housing-project-gas-sync'
    },
    muteHttpExceptions: true
  };
  if (payload !== undefined && payload !== null) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }

  var response = UrlFetchApp.fetch(url, options);
  var code = response.getResponseCode();
  var body = response.getContentText();
  var parsed = null;
  try {
    parsed = body ? JSON.parse(body) : null;
  } catch (e) {
    parsed = { raw: body };
  }

  if (code < 200 || code >= 300) {
    var msg = 'GitHub ' + method + ' ' + apiPath + ' failed (' + code + ')';
    if (parsed && parsed.message) {
      msg += ': ' + parsed.message;
    }
    throw new Error(msg);
  }
  return parsed;
}

function githubRepoPath_() {
  return '/repos/' + CONFIG.GITHUB_OWNER + '/' + CONFIG.GITHUB_REPO;
}

/**
 * Returns a set of existing paths under IMAGE_REPO_PREFIX on the default branch.
 * @return {Object.<string, boolean>} map of relative image paths (e.g. room01/1.png)
 */
function listExistingGithubImages_() {
  var existing = {};
  // Recursive tree of HEAD
  var ref = githubRequest_('get', githubRepoPath_() + '/git/ref/heads/' + CONFIG.GITHUB_BRANCH);
  var commitSha = ref.object.sha;
  var commit = githubRequest_('get', githubRepoPath_() + '/git/commits/' + commitSha);
  var treeSha = commit.tree.sha;
  var tree = githubRequest_(
    'get',
    githubRepoPath_() + '/git/trees/' + treeSha + '?recursive=1'
  );

  var prefix = CONFIG.IMAGE_REPO_PREFIX;
  (tree.tree || []).forEach(function (item) {
    if (item.type === 'blob' && item.path && item.path.indexOf(prefix) === 0) {
      var rel = item.path.substring(prefix.length);
      existing[rel] = true;
    }
  });
  return existing;
}

/**
 * Create a blob; returns sha.
 * @param {string} contentBase64
 * @return {string}
 */
function createGithubBlob_(contentBase64) {
  var result = githubRequest_('post', githubRepoPath_() + '/git/blobs', {
    content: contentBase64,
    encoding: 'base64'
  });
  return result.sha;
}

/**
 * Bytes → base64 (Apps Script Utilities).
 * @param {GoogleAppsScript.Byte[]} bytes
 * @return {string}
 */
function bytesToBase64_(bytes) {
  return Utilities.base64Encode(bytes);
}

/**
 * UTF-8 string → base64.
 * @param {string} text
 * @return {string}
 */
function textToBase64_(text) {
  return Utilities.base64Encode(text, Utilities.Charset.UTF_8);
}

/**
 * Single commit: update rooms.json and add only new image files.
 * @param {string} roomsJsonText
 * @param {Array<{path: string, bytes: GoogleAppsScript.Byte[]}>} newImages
 * @param {string} message
 * @return {{commitSha: string, htmlUrl: string, filesChanged: number}}
 */
function commitRoomsAndImages_(roomsJsonText, newImages, message) {
  var ref = githubRequest_('get', githubRepoPath_() + '/git/ref/heads/' + CONFIG.GITHUB_BRANCH);
  var parentSha = ref.object.sha;
  var parentCommit = githubRequest_('get', githubRepoPath_() + '/git/commits/' + parentSha);
  var baseTreeSha = parentCommit.tree.sha;

  var treeItems = [];

  // rooms.json always updated
  var roomsBlobSha = createGithubBlob_(textToBase64_(roomsJsonText));
  treeItems.push({
    path: CONFIG.ROOMS_JSON_PATH,
    mode: '100644',
    type: 'blob',
    sha: roomsBlobSha
  });

  newImages.forEach(function (img) {
    var blobSha = createGithubBlob_(bytesToBase64_(img.bytes));
    treeItems.push({
      path: CONFIG.IMAGE_REPO_PREFIX + img.path,
      mode: '100644',
      type: 'blob',
      sha: blobSha
    });
  });

  var newTree = githubRequest_('post', githubRepoPath_() + '/git/trees', {
    base_tree: baseTreeSha,
    tree: treeItems
  });

  var newCommit = githubRequest_('post', githubRepoPath_() + '/git/commits', {
    message: message,
    tree: newTree.sha,
    parents: [parentSha]
  });

  githubRequest_('patch', githubRepoPath_() + '/git/refs/heads/' + CONFIG.GITHUB_BRANCH, {
    sha: newCommit.sha,
    force: false
  });

  return {
    commitSha: newCommit.sha,
    htmlUrl: newCommit.html_url ||
      ('https://github.com/' + CONFIG.GITHUB_OWNER + '/' + CONFIG.GITHUB_REPO + '/commit/' + newCommit.sha),
    filesChanged: treeItems.length
  };
}
