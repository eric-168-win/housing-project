import { Converter } from 'opencc-js/t2cn';

export type Room = {
  district: string;
  building: string;
  'code name': string;
  gender?: string;
  rent: number | string;
  image: string[];
  'youtube link'?: string;
};

export type BuildingGroup = {
  buildingName: string;
  rooms: Room[];
  thumbnail: string;
};

type Lang = 'zh-Hant' | 'zh-Hans';

type MediaItem =
  | { kind: 'image'; src: string; roomIndex: number }
  | { kind: 'youtube'; videoId: string; url: string; roomIndex: number };

const AREA_DISTRICTS: Record<string, string[]> = {
  香港島: ['中西區', '灣仔區', '東區', '南區'],
  九龍: ['油尖旺區', '深水埗區', '九龍城區', '黃大仙區', '觀塘區'],
  新界: ['葵青區', '荃灣區', '屯門區', '元朗區', '北區', '大埔區', '沙田區', '西貢區', '離島區'],
};

const LABELS = {
  searchNav: '搜尋房源',
  pageTitle: '搜尋房源',
  brand: '住房項目',
  areaLabel: '主要地區',
  subDistrictLabel: '分區',
  search: '搜尋',
  clear: '清除',
  needSubDistrict: '請先選擇至少一個分區',
  pickAreaFirst: '請先選擇主要地區',
  resultsCount: (n: number) => `約 ${n} 個樓宇結果`,
  emptyBeforeSearch: '選擇地區後按「搜尋」以顯示房源。',
  emptyNoResults: '沒有符合條件的房源。',
  back: '← 返回搜尋結果',
  unitsInBuilding: '此樓宇單位',
  district: '地區',
  rentPerMonth: '月租',
  roomCount: (n: number) => `${n} 個單位`,
  codeRoom: (code: string) => `${code}房`,
  genderMale: '只限男性',
  genderFemale: '只限女性',
  genderAny: '性別不限',
  whatsapp: 'WhatsApp',
  contactNote: '請提早至少1日及2日預約上門參觀。不要來電。謝謝。',
  langHant: '繁體中文',
  langHans: '简体中文',
  hkd: (n: string | number) => `HK$ ${Number(n).toLocaleString('en-HK')}`,
} as const;

const converter = Converter({ from: 'hk', to: 'cn' });

function t(text: string, lang: Lang): string {
  return lang === 'zh-Hans' ? converter(text) : text;
}

function imageUrl(rel: string): string {
  return `/data/image/${rel.replace(/^\/+/, '')}`;
}

function formatRent(rent: string | number, lang: Lang): string {
  return t(LABELS.hkd(rent), lang);
}

function genderLabel(gender: string | undefined, lang: Lang): string {
  const g = String(gender || '')
    .trim()
    .toLowerCase();
  if (g === 'm') return t(LABELS.genderMale, lang);
  if (g === 'f') return t(LABELS.genderFemale, lang);
  return t(LABELS.genderAny, lang);
}

function youtubeId(url: string | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed);
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace(/^\//, '').split('/')[0];
      return id || null;
    }
    const v = u.searchParams.get('v');
    if (v) return v;
    const embed = u.pathname.match(/\/embed\/([^/]+)/);
    if (embed) return embed[1];
    const shorts = u.pathname.match(/\/shorts\/([^/]+)/);
    if (shorts) return shorts[1];
  } catch {
    /* ignore */
  }
  return null;
}

function youtubeThumb(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function youtubeEmbed(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?rel=0`;
}

export function initSearchApp(root: HTMLElement): void {
  let lang: Lang = 'zh-Hant';
  let rooms: Room[] = [];
  let selectedAreas = new Set<string>();
  let selectedDistricts = new Set<string>();
  let results: BuildingGroup[] = [];
  let hasSearched = false;
  let activeBuilding: BuildingGroup | null = null;
  let activeMediaIndex = 0;
  let selectedUnit = 0;

  const els = {
    langHant: root.querySelector<HTMLButtonElement>('#lang-hant')!,
    langHans: root.querySelector<HTMLButtonElement>('#lang-hans')!,
    navSearch: root.querySelector<HTMLButtonElement>('#nav-search')!,
    brand: root.querySelector<HTMLElement>('#brand-name')!,
    pageTitle: root.querySelector<HTMLElement>('#page-title')!,
    searchView: root.querySelector<HTMLElement>('#search-view')!,
    detailView: root.querySelector<HTMLElement>('#detail-view')!,
    areaGroup: root.querySelector<HTMLElement>('#area-group')!,
    districtGroup: root.querySelector<HTMLElement>('#district-group')!,
    areaLabel: root.querySelector<HTMLElement>('#area-label')!,
    districtLabel: root.querySelector<HTMLElement>('#district-label')!,
    searchBtn: root.querySelector<HTMLButtonElement>('#search-btn')!,
    clearBtn: root.querySelector<HTMLButtonElement>('#clear-btn')!,
    prompt: root.querySelector<HTMLElement>('#search-prompt')!,
    resultsMeta: root.querySelector<HTMLElement>('#results-meta')!,
    resultsList: root.querySelector<HTMLElement>('#results-list')!,
    emptyState: root.querySelector<HTMLElement>('#empty-state')!,
    backBtn: root.querySelector<HTMLButtonElement>('#back-btn')!,
    selectionLabel: root.querySelector<HTMLElement>('#selection-label')!,
    detailTitle: root.querySelector<HTMLElement>('#detail-title')!,
    mainImage: root.querySelector<HTMLImageElement>('#main-image')!,
    mainVideo: root.querySelector<HTMLIFrameElement>('#main-video')!,
    thumbs: root.querySelector<HTMLElement>('#thumbs')!,
    unitsTitle: root.querySelector<HTMLElement>('#units-title')!,
    unitsList: root.querySelector<HTMLElement>('#units-list')!,
    whatsappLink: root.querySelector<HTMLAnchorElement>('#whatsapp-link')!,
    contactNote: root.querySelector<HTMLElement>('#contact-note')!,
  };

  function districtsPresent(): Set<string> {
    return new Set(rooms.map((r) => r.district).filter(Boolean));
  }

  function areasWithRooms(): string[] {
    const present = districtsPresent();
    return Object.keys(AREA_DISTRICTS).filter((area) =>
      AREA_DISTRICTS[area].some((d) => present.has(d)),
    );
  }

  function districtsWithRoomsIn(area: string): string[] {
    const present = districtsPresent();
    return AREA_DISTRICTS[area].filter((d) => present.has(d));
  }

  function applyDefaultFilters(): void {
    selectedAreas.clear();
    selectedDistricts.clear();
    const areas = areasWithRooms();
    if (areas.length === 1) {
      selectedAreas.add(areas[0]);
      const districts = districtsWithRoomsIn(areas[0]);
      if (districts.length === 1) selectedDistricts.add(districts[0]);
    }
  }

  function renderChrome(): void {
    document.documentElement.lang = lang === 'zh-Hans' ? 'zh-Hans' : 'zh-Hant';
    document.title = t(LABELS.brand, lang);

    els.langHant.textContent = LABELS.langHant;
    els.langHans.textContent = LABELS.langHans;
    els.langHant.classList.toggle('active', lang === 'zh-Hant');
    els.langHans.classList.toggle('active', lang === 'zh-Hans');
    els.langHant.setAttribute('aria-pressed', String(lang === 'zh-Hant'));
    els.langHans.setAttribute('aria-pressed', String(lang === 'zh-Hans'));

    els.navSearch.textContent = t(LABELS.searchNav, lang);
    els.brand.textContent = t(LABELS.brand, lang);
    // Building name lives only in the detail left panel — keep chrome as page title.
    els.pageTitle.textContent = t(LABELS.pageTitle, lang);

    els.areaLabel.textContent = t(LABELS.areaLabel, lang);
    els.districtLabel.textContent = t(LABELS.subDistrictLabel, lang);
    els.searchBtn.textContent = t(LABELS.search, lang);
    els.clearBtn.textContent = t(LABELS.clear, lang);
    els.prompt.textContent = t(LABELS.needSubDistrict, lang);
    els.backBtn.textContent = t(LABELS.back, lang);
    els.unitsTitle.textContent = t(LABELS.unitsInBuilding, lang);
    els.whatsappLink.textContent = LABELS.whatsapp;
    els.contactNote.textContent = t(LABELS.contactNote, lang);
  }

  function renderAreaCheckboxes(): void {
    els.areaGroup.innerHTML = '';
    for (const area of areasWithRooms()) {
      const label = document.createElement('label');
      label.className = 'checkbox-item';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = area;
      input.checked = selectedAreas.has(area);
      input.addEventListener('change', () => {
        if (input.checked) selectedAreas.add(area);
        else {
          selectedAreas.delete(area);
          for (const d of AREA_DISTRICTS[area]) selectedDistricts.delete(d);
        }
        renderDistrictCheckboxes();
        updateSearchEnabled();
      });
      label.append(input, document.createTextNode(t(area, lang)));
      els.areaGroup.append(label);
    }
  }

  function availableDistricts(): string[] {
    if (selectedAreas.size === 0) return [];
    const list: string[] = [];
    for (const area of selectedAreas) {
      list.push(...districtsWithRoomsIn(area));
    }
    return list;
  }

  function renderDistrictCheckboxes(): void {
    const districts = availableDistricts();
    els.districtGroup.innerHTML = '';
    if (selectedAreas.size === 0) {
      const hint = document.createElement('span');
      hint.className = 'result-snippet';
      hint.textContent = t(LABELS.pickAreaFirst, lang);
      els.districtGroup.append(hint);
      return;
    }
    if (districts.length === 0) {
      const hint = document.createElement('span');
      hint.className = 'result-snippet';
      hint.textContent = t(LABELS.emptyNoResults, lang);
      els.districtGroup.append(hint);
      return;
    }
    for (const district of districts) {
      const label = document.createElement('label');
      label.className = 'checkbox-item';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = district;
      input.checked = selectedDistricts.has(district);
      input.addEventListener('change', () => {
        if (input.checked) selectedDistricts.add(district);
        else selectedDistricts.delete(district);
        updateSearchEnabled();
      });
      label.append(input, document.createTextNode(t(district, lang)));
      els.districtGroup.append(label);
    }
  }

  function updateSearchEnabled(): void {
    const ok = selectedDistricts.size >= 1;
    els.searchBtn.disabled = !ok;
    els.prompt.hidden = ok;
  }

  function groupByBuilding(list: Room[]): BuildingGroup[] {
    const map = new Map<string, BuildingGroup>();
    for (const room of list) {
      const name = room.building;
      let group = map.get(name);
      if (!group) {
        group = {
          buildingName: name,
          rooms: [],
          thumbnail: room.image[0] ? imageUrl(room.image[0]) : '',
        };
        map.set(name, group);
      }
      group.rooms.push(room);
    }
    return [...map.values()];
  }

  function runSearch(): void {
    if (selectedDistricts.size < 1) {
      updateSearchEnabled();
      return;
    }
    const filtered = rooms.filter((r) => selectedDistricts.has(r.district));
    results = groupByBuilding(filtered);
    hasSearched = true;
    activeBuilding = null;
    showSearch();
    renderResults();
  }

  function clearFilters(): void {
    results = [];
    hasSearched = false;
    activeBuilding = null;
    applyDefaultFilters();
    renderAreaCheckboxes();
    renderDistrictCheckboxes();
    updateSearchEnabled();
    showSearch();
    renderResults();
  }

  function renderResults(): void {
    els.resultsList.innerHTML = '';
    if (!hasSearched) {
      els.resultsMeta.hidden = true;
      els.emptyState.hidden = false;
      els.emptyState.textContent = t(LABELS.emptyBeforeSearch, lang);
      return;
    }
    if (results.length === 0) {
      els.resultsMeta.hidden = true;
      els.emptyState.hidden = false;
      els.emptyState.textContent = t(LABELS.emptyNoResults, lang);
      return;
    }
    els.emptyState.hidden = true;
    els.resultsMeta.hidden = false;
    els.resultsMeta.textContent = t(LABELS.resultsCount(results.length), lang);

    for (const group of results) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'result-item';
      const img = document.createElement('img');
      img.className = 'result-thumb';
      img.src = group.thumbnail;
      img.alt = t(group.buildingName, lang);
      img.loading = 'lazy';

      const body = document.createElement('div');
      const title = document.createElement('div');
      title.className = 'result-title';
      title.textContent = `${t(group.buildingName, lang)} (${group.rooms.length})`;

      const snippet = document.createElement('div');
      snippet.className = 'result-snippet';
      const districts = [...new Set(group.rooms.map((r) => t(r.district, lang)))].join('、');
      const rents = group.rooms.map((r) => Number(r.rent));
      const min = Math.min(...rents);
      const max = Math.max(...rents);
      const rentText =
        min === max
          ? formatRent(min, lang)
          : `${formatRent(min, lang)} – ${formatRent(max, lang)}`;
      snippet.textContent = `${districts} · ${t(LABELS.roomCount(group.rooms.length), lang)} · ${rentText}`;

      body.append(title, snippet);
      btn.append(img, body);
      btn.addEventListener('click', () => openDetail(group));
      els.resultsList.append(btn);
    }
  }

  function mediaForRoom(room: Room, roomIndex: number): MediaItem[] {
    const items: MediaItem[] = room.image.map((src) => ({
      kind: 'image' as const,
      src,
      roomIndex,
    }));
    const id = youtubeId(room['youtube link']);
    if (id) {
      items.push({
        kind: 'youtube',
        videoId: id,
        url: room['youtube link']!.trim(),
        roomIndex,
      });
    }
    return items;
  }

  function buildMedia(group: BuildingGroup): MediaItem[] {
    const room = group.rooms[selectedUnit];
    return room ? mediaForRoom(room, selectedUnit) : [];
  }

  function selectionLabelText(group: BuildingGroup): string {
    const room = group.rooms[selectedUnit];
    if (!room) return '';
    return t(LABELS.codeRoom(room['code name'] || String(selectedUnit + 1)), lang);
  }

  function openDetail(group: BuildingGroup): void {
    activeBuilding = group;
    selectedUnit = 0;
    activeMediaIndex = 0;
    showDetail();
    renderDetail();
  }

  function selectUnit(next: number): void {
    selectedUnit = next;
    activeMediaIndex = 0;
    renderDetail();
  }

  function showMainMedia(item: MediaItem | undefined, buildingName: string): void {
    if (!item) {
      els.mainImage.hidden = false;
      els.mainVideo.hidden = true;
      els.mainVideo.removeAttribute('src');
      els.mainImage.removeAttribute('src');
      return;
    }
    if (item.kind === 'youtube') {
      els.mainImage.hidden = true;
      els.mainVideo.hidden = false;
      els.mainVideo.src = youtubeEmbed(item.videoId);
      els.mainVideo.title = t(buildingName, lang);
    } else {
      els.mainVideo.hidden = true;
      els.mainVideo.removeAttribute('src');
      els.mainImage.hidden = false;
      els.mainImage.src = imageUrl(item.src);
      els.mainImage.alt = t(buildingName, lang);
    }
  }

  function renderDetail(): void {
    if (!activeBuilding) return;
    const group = activeBuilding;
    const media = buildMedia(group);
    if (activeMediaIndex >= media.length) activeMediaIndex = 0;

    els.pageTitle.textContent = t(LABELS.pageTitle, lang);
    els.detailTitle.textContent = t(group.buildingName, lang);
    els.unitsTitle.textContent = t(LABELS.unitsInBuilding, lang);
    els.whatsappLink.textContent = LABELS.whatsapp;
    els.contactNote.textContent = t(LABELS.contactNote, lang);
    els.selectionLabel.hidden = false;
    els.selectionLabel.textContent = selectionLabelText(group);

    showMainMedia(media[activeMediaIndex], group.buildingName);

    els.thumbs.innerHTML = '';
    media.forEach((item, i) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = `thumb-btn${i === activeMediaIndex ? ' active' : ''}${item.kind === 'youtube' ? ' thumb-youtube' : ''}`;
      thumb.setAttribute('aria-label', `${i + 1}`);
      if (item.kind === 'image') {
        const img = document.createElement('img');
        img.src = imageUrl(item.src);
        img.alt = '';
        thumb.append(img);
      } else {
        const img = document.createElement('img');
        img.src = youtubeThumb(item.videoId);
        img.alt = 'YouTube';
        const play = document.createElement('span');
        play.className = 'thumb-play';
        play.setAttribute('aria-hidden', 'true');
        thumb.append(img, play);
      }
      thumb.addEventListener('click', () => {
        activeMediaIndex = i;
        renderDetail();
      });
      els.thumbs.append(thumb);
    });

    els.unitsList.innerHTML = '';
    group.rooms.forEach((room, index) => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `unit-card${selectedUnit === index ? ' selected' : ''}`;
      const line1 = document.createElement('p');
      line1.className = 'unit-code';
      line1.textContent = t(LABELS.codeRoom(room['code name'] || String(index + 1)), lang);
      const rent = document.createElement('p');
      rent.className = 'unit-rent';
      rent.textContent = `${t(LABELS.rentPerMonth, lang)} ${formatRent(room.rent, lang)}`;
      const gender = document.createElement('p');
      gender.className = 'unit-gender';
      gender.textContent = genderLabel(room.gender, lang);
      btn.append(line1, rent, gender);
      btn.addEventListener('click', () => selectUnit(index));
      li.append(btn);
      els.unitsList.append(li);
    });
  }

  function showSearch(): void {
    els.searchView.classList.add('visible');
    els.detailView.classList.remove('visible');
    els.pageTitle.textContent = t(LABELS.pageTitle, lang);
    els.selectionLabel.hidden = true;
    els.mainVideo.hidden = true;
    els.mainVideo.removeAttribute('src');
  }

  function showDetail(): void {
    els.searchView.classList.remove('visible');
    els.detailView.classList.add('visible');
  }

  function setLang(next: Lang): void {
    lang = next;
    renderChrome();
    renderAreaCheckboxes();
    renderDistrictCheckboxes();
    updateSearchEnabled();
    if (activeBuilding) renderDetail();
    else renderResults();
  }

  els.langHant.addEventListener('click', () => setLang('zh-Hant'));
  els.langHans.addEventListener('click', () => setLang('zh-Hans'));
  els.searchBtn.addEventListener('click', runSearch);
  els.clearBtn.addEventListener('click', clearFilters);
  els.backBtn.addEventListener('click', () => {
    activeBuilding = null;
    showSearch();
    renderResults();
  });
  els.navSearch.addEventListener('click', () => {
    activeBuilding = null;
    showSearch();
    renderResults();
  });

  async function boot(): Promise<void> {
    renderChrome();
    showSearch();
    renderResults();

    const res = await fetch('/data/text/rooms.json');
    if (!res.ok) throw new Error(`Failed to load rooms.json: ${res.status}`);
    rooms = (await res.json()) as Room[];
    applyDefaultFilters();
    renderAreaCheckboxes();
    renderDistrictCheckboxes();
    updateSearchEnabled();
  }

  void boot();
}
