import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const rooms = [
  { id: 'room01', colors: ['#4A6FA5', '#5B8C5A', '#C17B4A'], labels: ['客廳', '睡房', '廚房'] },
  { id: 'room02', colors: ['#6B5B95', '#88B04B'], labels: ['全景', '細節'] },
  { id: 'room03', colors: ['#2E5A88', '#D4A017', '#8B4513'], labels: ['外觀', '客廳', '浴室'] },
  { id: 'room04', colors: ['#3D7A5C', '#A0522D'], labels: ['睡房', '窗外'] },
  { id: 'room05', colors: ['#5C6BC0', '#78909C', '#EF6C00'], labels: ['開放式', '書桌', '收納'] },
  { id: 'room06', colors: ['#00897B', '#5D4037'], labels: ['大廳', '走廊'] },
  { id: 'room07', colors: ['#E64A19', '#455A64', '#7CB342'], labels: ['單位', '廚房', '露台'] },
  { id: 'room08', colors: ['#3949AB', '#F9A825'], labels: ['睡房', '衣櫃'] },
  { id: 'room09', colors: ['#00695C', '#8D6E63', '#546E7A'], labels: ['全屋', '客廳', '睡房'] },
  { id: 'room10', colors: ['#6A1B9A', '#00838F'], labels: ['景觀', '室內'] },
  { id: 'room11', colors: ['#BF360C', '#37474F', '#558B2F', '#0277BD'], labels: ['1', '2', '3', '4'] },
  { id: 'room12', colors: ['#1565C0', '#6D4C41'], labels: ['外觀', '內部'] },
];

const base = 'public/data/image';
fs.mkdirSync(base, { recursive: true });
fs.mkdirSync('public/data/text', { recursive: true });

for (const room of rooms) {
  const dir = path.join(base, room.id);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 0; i < room.colors.length; i++) {
    const color = room.colors[i];
    const label = room.labels[i];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="#1e1e1e" stop-opacity="0.35"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#g)"/>
      <rect x="40" y="40" width="720" height="520" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
      <text x="400" y="290" text-anchor="middle" font-family="Segoe UI, Microsoft JhengHei, sans-serif" font-size="48" fill="white" opacity="0.95">${label}</text>
      <text x="400" y="350" text-anchor="middle" font-family="Segoe UI, Microsoft JhengHei, sans-serif" font-size="22" fill="rgba(255,255,255,0.75)">${room.id} · ${i + 1}</text>
    </svg>`;
    await sharp(Buffer.from(svg)).png().toFile(path.join(dir, `${i + 1}.png`));
  }
}

console.log('Mock images created under public/data/image/');
