# 住房項目（Phase 1）

Static AstroJS local preview for Hong Kong housing search. Traditional Chinese source data, VS Code Light Mode UI, district filters, Google-style results, and a Taobao-style detail view.

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

## Mock data

- Rooms: `public/data/text/rooms.json` (Traditional Chinese)
- Images: `public/data/image/<roomId>/<n>.png`
- UI image URLs resolve as `/data/image/...`
- Regenerate placeholder images: `node scripts/generate-mock-images.mjs`

## Phase 1 features

- Left sidebar language toggle: 繁體中文 (default) ↔ 简体中文 via `opencc-js`
- Nav: 「搜尋房源」
- Multi-select 香港島 / 九龍 / 新界, then 18 sub-districts
- Search requires ≥1 sub-district
- Results grouped by building name with thumbnail + `Building Name (N)`
- Detail: large image, thumbnail carousel, district / rent / units in building

Phase 2–4 (deploy, sync, etc.) are out of scope for this folder setup.
