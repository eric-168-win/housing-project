import { Converter } from 'opencc-js/t2cn';

export type Room = {
  'building name': string;
  district: string;
  rent: number | string;
  image: string[];
};

export type BuildingGroup = {
  buildingName: string;
  rooms: Room[];
  thumbnail: string;
};

type Lang = 'zh-Hant' | 'zh-Hans';

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
  resultsCount: (n: number) => `約 ${n} 個樓宇結果`,
  emptyBeforeSearch: '選擇地區後按「搜尋」以顯示房源。',
  emptyNoResults: '沒有符合條件的房源。',
  back: '← 返回搜尋結果',
  unitsInBuilding: '此樓宇單位',
  district: '地區',
  rentPerMonth: '月租',
  roomCount: (n: number) => `${n} 個單位`,
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

export function initSearchApp(root: HTMLElement): void {
  let lang: Lang = 'zh-Hant';
  let rooms: Room[] = [];
  let selectedAreas = new Set<string>();
  let selectedDistricts = new Set<string>();
  let results: BuildingGroup[] = [];
  let hasSearched = false;
  let activeBuilding: BuildingGroup | null = null;
  let activeImageIndex = 0;

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
    detailTitle: root.querySelector<HTMLElement>('#detail-title')!,
    detailMeta: root.querySelector<HTMLElement>('#detail-meta')!,
    mainImage: root.querySelector<HTMLImageElement>('#main-image')!,
    thumbs: root.querySelector<HTMLElement>('#thumbs')!,
    unitsTitle: root.querySelector<HTMLElement>('#units-title')!,
    unitsList: root.querySelector<HTMLElement>('#units-list')!,
  };

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
    els.pageTitle.textContent = activeBuilding
      ? t(activeBuilding.buildingName, lang)
      : t(LABELS.pageTitle, lang);

    els.areaLabel.textContent = t(LABELS.areaLabel, lang);
    els.districtLabel.textContent = t(LABELS.subDistrictLabel, lang);
    els.searchBtn.textContent = t(LABELS.search, lang);
    els.clearBtn.textContent = t(LABELS.clear, lang);
    els.prompt.textContent = t(LABELS.needSubDistrict, lang);
    els.backBtn.textContent = t(LABELS.back, lang);
    els.unitsTitle.textContent = t(LABELS.unitsInBuilding, lang);
  }

  function renderAreaCheckboxes(): void {
    els.areaGroup.innerHTML = '';
    for (const area of Object.keys(AREA_DISTRICTS)) {
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
      list.push(...AREA_DISTRICTS[area]);
    }
    return list;
  }

  function renderDistrictCheckboxes(): void {
    const districts = availableDistricts();
    els.districtGroup.innerHTML = '';
    if (districts.length === 0) {
      const hint = document.createElement('span');
      hint.className = 'result-snippet';
      hint.textContent = t('請先選擇主要地區', lang);
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
      const name = room['building name'];
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
    selectedAreas.clear();
    selectedDistricts.clear();
    results = [];
    hasSearched = false;
    activeBuilding = null;
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

  function allImages(group: BuildingGroup): string[] {
    const seen = new Set<string>();
    const imgs: string[] = [];
    for (const room of group.rooms) {
      for (const rel of room.image) {
        if (!seen.has(rel)) {
          seen.add(rel);
          imgs.push(rel);
        }
      }
    }
    return imgs.length ? imgs : [];
  }

  function openDetail(group: BuildingGroup): void {
    activeBuilding = group;
    activeImageIndex = 0;
    showDetail();
    renderDetail();
  }

  function renderDetail(): void {
    if (!activeBuilding) return;
    const group = activeBuilding;
    const images = allImages(group);
    const districts = [...new Set(group.rooms.map((r) => t(r.district, lang)))].join('、');

    els.pageTitle.textContent = t(group.buildingName, lang);
    els.detailTitle.textContent = t(group.buildingName, lang);
    els.detailMeta.textContent = `${t(LABELS.district, lang)}：${districts} · ${t(LABELS.roomCount(group.rooms.length), lang)}`;
    els.unitsTitle.textContent = t(LABELS.unitsInBuilding, lang);

    const current = images[activeImageIndex] ?? images[0];
    if (current) {
      els.mainImage.src = imageUrl(current);
      els.mainImage.alt = t(group.buildingName, lang);
    }

    els.thumbs.innerHTML = '';
    images.forEach((rel, i) => {
      const thumb = document.createElement('button');
      thumb.type = 'button';
      thumb.className = `thumb-btn${i === activeImageIndex ? ' active' : ''}`;
      thumb.setAttribute('aria-label', `${i + 1}`);
      const img = document.createElement('img');
      img.src = imageUrl(rel);
      img.alt = '';
      thumb.append(img);
      thumb.addEventListener('click', () => {
        activeImageIndex = i;
        renderDetail();
      });
      els.thumbs.append(thumb);
    });

    els.unitsList.innerHTML = '';
    for (const room of group.rooms) {
      const li = document.createElement('li');
      li.className = 'unit-card';
      const rent = document.createElement('p');
      rent.className = 'unit-rent';
      rent.textContent = `${t(LABELS.rentPerMonth, lang)} ${formatRent(room.rent, lang)}`;
      const district = document.createElement('div');
      district.className = 'unit-district';
      district.textContent = `${t(LABELS.district, lang)}：${t(room.district, lang)}`;
      li.append(rent, district);
      els.unitsList.append(li);
    }
  }

  function showSearch(): void {
    els.searchView.classList.add('visible');
    els.detailView.classList.remove('visible');
    els.pageTitle.textContent = t(LABELS.pageTitle, lang);
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
    renderAreaCheckboxes();
    renderDistrictCheckboxes();
    updateSearchEnabled();
    showSearch();
    renderResults();

    const res = await fetch('/data/text/rooms.json');
    if (!res.ok) throw new Error(`Failed to load rooms.json: ${res.status}`);
    rooms = (await res.json()) as Room[];
  }

  void boot();
}
