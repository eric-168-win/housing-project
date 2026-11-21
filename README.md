# 住房項目

Static AstroJS housing search site (Hong Kong). Traditional Chinese source data, VS Code Light Mode UI, district filters, Google-style results, and a Taobao-style detail view. Sheet + Drive sync via Apps Script (`gas/`).

## Requirements

- Node.js 22.23.4+ (see `package.json` `engines`)

## Run locally

```sh
npm install
npm run dev
```

Open the URL printed by Astro (default: [http://localhost:4321](http://localhost:4321)).

## Other commands

| Command           | Action                          |
| ----------------- | ------------------------------- |
| `npm run build`   | Build static site to `./dist/`  |
| `npm run preview` | Preview the production build    |

## Data

- Rooms: `public/data/text/rooms.json` (Traditional Chinese)
- Images: `public/data/image/<roomId>/<n>.png`
- UI image URLs resolve as `/data/image/...`
- Source of truth for production sync: Google Sheet + Drive (see Phase 3 / `gas/README.md`)

## Live

- GitHub: https://github.com/eric-168-win/housing-project
- Cloudflare Pages: https://housing-project.pages.dev/

## Sheet → GitHub sync (Phase 4)

See **[gas/README.md](gas/README.md)** for clasp push, Fine-grained PAT (`GITHUB_PAT` Script Property), and the **住房項目 → update rooms data** menu.
