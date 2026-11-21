# GAS — Sheet → GitHub sync

Apps Script (clasp) that syncs the Google Sheet `rooms` tab into this repo:

- Writes `public/data/text/rooms.json`
- Copies new PNGs from Drive `image/` into `public/data/image/...` (incremental skip if already on GitHub)
- Creates **one** commit via the GitHub Git Data API

## Custom menu

In the Sheet: **住房項目 → update rooms data**

## One-time setup

### 1. clasp (already set up)

Bound script on Sheet `rooms`:

- Script ID: `1OImg88Kk6TWf5hizdvd2D91pxiC5e5jnZANt6nr70e8mjRTVC1VK7oEA`
- Editor: https://script.google.com/d/1OImg88Kk6TWf5hizdvd2D91pxiC5e5jnZANt6nr70e8mjRTVC1VK7oEA/edit
- Sheet: https://docs.google.com/spreadsheets/d/14WvEtQWAxbwLyKGr-3bOVAR096sfJYdhp_m17plcQFg/edit

To push local edits later:

```sh
cd gas
clasp push
```

Open the script: `clasp open-script` (or **Extensions → Apps Script** in the Sheet).

Authorize when prompted (Sheets, Drive read, external URL fetch).

### 2. GitHub Fine-grained PAT → Script Property

1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate**
2. Suggested settings:
   - **Resource owner:** `eric-168-win`
   - **Repository access:** Only select repositories → `housing-project`
   - **Permissions → Repository:**
     - **Contents:** Read and write (required for blobs / trees / commits / updating `main`)
     - **Metadata:** Read-only (default)
3. Copy the token (shown once).
4. In the Sheet: **Extensions → Apps Script → Project Settings** (gear) → **Script properties** → **Add script property**:
   - **Property:** `GITHUB_PAT`
   - **Value:** *(paste the Fine-grained PAT)*
5. Save. Never commit the token; never put it in `.gs` files.

### 3. First sync

Reload the Sheet → menu **住房項目 → update rooms data**.

Cloudflare Pages will rebuild from the new commit on `main`.

## Config (non-secret)

See `Config.gs`: Drive `image/` folder ID, GitHub owner/repo/branch, path prefixes.

## Local files

| File | Role |
|------|------|
| `Menu.gs` | `onOpen` menu |
| `Sync.gs` | `updateRoomsData` entry |
| `SheetReader.gs` | Parse sheet → rooms + image paths |
| `DriveImages.gs` | Resolve/download PNGs under Drive `image/` |
| `GitHub.gs` | PAT + Git Data API single commit |
| `appsscript.json` | OAuth scopes / V8 |
| `.clasp.json` | Script ID (safe to commit; no secrets) |
