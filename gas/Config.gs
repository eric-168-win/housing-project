/**
 * Non-secret project constants for 住房項目 sync.
 * GitHub PAT lives only in Script Properties (GITHUB_PAT) — never here.
 */
var CONFIG = {
  SHEET_TAB: 'rooms',
  IMAGE_FOLDER_ID: '1vxZbGY4dQDzJTOMkPgJwYZASfKyHv1Sy',
  GITHUB_OWNER: 'eric-168-win',
  GITHUB_REPO: 'housing-project',
  GITHUB_BRANCH: 'main',
  ROOMS_JSON_PATH: 'public/data/text/rooms.json',
  IMAGE_REPO_PREFIX: 'public/data/image/',
  /** Script property key for Fine-grained GitHub PAT */
  GITHUB_PAT_PROPERTY: 'GITHUB_PAT',
  REQUIRED_HEADERS: ['building name', 'district', 'rent', 'image']
};
