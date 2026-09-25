/**
 * api/proxy.ts  —  PENGGANTI proxy lama (sankavollerei.com)
 *
 * Alur:  Frontend (src/api.ts) ──► /api/*  ──► file ini
 *          1) SCRAPER  : ambil & parse HTML otakudesu.blog (kode scraper Anda)
 *          2) ADAPTER  : ubah hasil scraper ► bentuk JSON persis seperti yang
 *                        diminta frontend (interface di src/api.ts)
 *          3) ROUTER   : mapping URL /api/... ► fungsi scraper + adapter
 *
 * UI / Tailwind / komponen TIDAK disentuh sama sekali.
 * Tipe output adapter di-import langsung dari src/api.ts, jadi kalau bentuk
 * datanya tidak cocok dengan frontend, TypeScript akan menolak saat build.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as cheerio from 'cheerio';
import type {
  AnimeDetail,
  AnimeItem,
  Episode,
  EpisodeData,
  Genre,
  HomeData,
  ScheduleDay,
  ServerData,
  ServerQuality,
  UnlimitedItem,
} from '../src/api';

/* ════════════════════════════════════════════════════════════════════════
 * 0. KONFIGURASI & HELPER UMUM
 * ════════════════════════════════════════════════════════════════════════ */

const SOURCE = 'https://otakudesu.blog';
const AJAX_URL = `${SOURCE}/wp-admin/admin-ajax.php`;
// Kode "action" admin-ajax milik scraper Anda. Kalau suatu saat stream berhenti
// jalan, biasanya dua nilai inilah yang berubah di situs sumber.
const ACTION_NONCE = 'aa1208d27f29ca340c92c66d1926f13f';
const ACTION_STREAM = '2a3505c93b0035d3f455df82bf976b84';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const FETCH_TIMEOUT_MS = 8000;

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface Failure {
  success: false;
  error: string;
}

function unwrap<T extends { success: true }>(r: T | Failure): T {
  if (!r.success) {
    throw new HttpError(/HTTP 404/.test(r.error) ? 404 : 502, r.error);
  }
  return r as T;
}

/** "https://otakudesu.blog/anime/xxx/"  ->  "xxx" */
function slugFromUrl(url: string | null | undefined, kind: 'anime' | 'episode'): string {
  if (!url) return '';
  const m = url.match(new RegExp(`/${kind}/([^/?#]+)`));
  return m ? m[1] : '';
}

function toNumber(v: unknown): number | undefined {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function episodeNumber(title: string): number | null {
  const m = title.match(/Episode\s*(\d+(?:\.\d+)?)/i);
  return m ? parseFloat(m[1]) : null;
}

/** Ambil nilai dari objek `info` scraper dengan beberapa kemungkinan nama label. */
function pickInfo(info: Record<string, string>, ...keys: string[]): string {
  const lower = new Map(Object.entries(info).map(([k, v]) => [k.toLowerCase(), v] as [string, string]));
  for (const k of keys) {
    const v = lower.get(k.toLowerCase());
    if (v) return v;
  }
  return '';
}

// Player desustream.* memakai CSP `frame-ancestors` (hanya boleh di-embed dari
// otakudesu/desustream sendiri), jadi di localhost atau domain Anda tampil
// "menolak untuk terhubung". URL-nya dibungkus lewat /api/embed (lihat serveEmbed).
const EMBED_PROXY_HOSTS = /(^|\.)desustream\.(net|me|com|info)$/i;

function wrapEmbed(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.protocol === 'https:' && EMBED_PROXY_HOSTS.test(u.hostname)) {
      return `/api/embed/${Buffer.from(url).toString('base64url')}`;
    }
  } catch {
    // URL tidak valid -> biarkan apa adanya
  }
  return url;
}

const PLACEHOLDER_POSTER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="300"><rect width="200" height="300" fill="#111827"/></svg>',
  );

/* ════════════════════════════════════════════════════════════════════════
 * 1. SCRAPER  (kode scraper Anda; selector & logika tidak diubah)
 *    Perubahan: require -> import, ditambah timeout fetch, tipe TypeScript,
 *    `info()` juga mengembalikan synopsisParagraphs, dan `watch()` dipecah:
 *    watch() = parse halaman saja, resolveStream() = ambil URL stream saat
 *    server dipilih (lazy, sama seperti alur WatchPage).
 *    genreList() & genre() tidak dipakai UI, jadi tidak disertakan.
 * ════════════════════════════════════════════════════════════════════════ */

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

interface ListItem {
  title: string;
  url: string;
  thumb: string;
  episode: string | null;
  day: string | null;
  date: string | null;
  rating: number | null;
}

interface GenreRaw {
  name: string;
  slug: string | null;
  url: string;
}

function scrapeGenreLinks($: cheerio.CheerioAPI, $scope: cheerio.Cheerio<any>): GenreRaw[] {
  const out: GenreRaw[] = [];
  $scope.find('a').each((_, a) => {
    const $a = $(a);
    const name = $a.text().trim();
    const href = $a.attr('href') || '';
    if (!name) return;
    const absolute = href.startsWith('http') ? href : `${SOURCE}${href}`;
    const slug = absolute.replace(/https?:\/\/otakudesu\.blog\/genres\/|\/$/g, '') || null;
    out.push({ name, slug, url: absolute });
  });
  return out;
}

function scrapeSection($: cheerio.CheerioAPI, $ul: cheerio.Cheerio<any>, includeRating = false): ListItem[] {
  const items: ListItem[] = [];
  $ul.find('> li').each((_, li) => {
    const $li = $(li);
    const $thumb = $li.find('div.thumb').first();
    const $a = $thumb.find('a').first();
    const $h2 = $thumb.find('h2').first();
    const title = $h2.text().trim() || $a.attr('title') || $a.text().trim();
    const url = $a.attr('href') || '';
    const thumb = $thumb.find('img').attr('src') || '';

    const epRaw = $li.find('div.epz').text().trim();
    const episode = epRaw ? epRaw.replace(/Episode\s*/i, '').trim() || null : null;

    const tipeRaw = $li.find('div.epztipe').text().trim();
    let day: string | null = null;
    let rating: number | null = null;
    if (includeRating) {
      const m = tipeRaw.match(/(\d+(?:\.\d+)?)/);
      if (m) rating = parseFloat(m[1]);
    } else {
      day = tipeRaw.replace(/^.*?fa-star.*?/i, '').trim() || tipeRaw || null;
      if (day && /^[\d.]+$/.test(day)) day = null;
    }

    const date = $li.find('div.newnime').text().trim() || null;

    items.push({ title, url, thumb, episode, day, date, rating });
  });
  return items;
}

interface HomeScrape {
  success: true;
  ongoing: ListItem[];
  complete: ListItem[];
}

async function home(): Promise<HomeScrape | Failure> {
  try {
    const html = await fetchHtml(`${SOURCE}/`);
    const $ = cheerio.load(html);

    const pick = (keyword: string) =>
      $('div.rseries')
        .filter((_, el) => $(el).find('#rvod h1').first().text().toLowerCase().includes(keyword))
        .find('div.venz > ul')
        .first();

    return {
      success: true,
      ongoing: scrapeSection($, pick('on-going'), false),
      complete: scrapeSection($, pick('complete'), true),
    };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

interface SearchItem {
  title: string;
  url: string;
  type: 'anime' | 'episode';
  thumb: string;
  alt: string;
  genres: GenreRaw[];
  status: string | null;
  rating: number | null;
}

interface SearchScrape {
  success: true;
  query: string;
  maxResults: number;
  totalItems: number;
  items: SearchItem[];
}

async function search(query: string): Promise<SearchScrape | Failure> {
  try {
    const url = `${SOURCE}/?s=${encodeURIComponent(query)}&post_type=anime`;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const titleText = $('div.rvad h1').first().text().trim() || '';
    const totalText = titleText.match(/Max\.\s*hanya\s*sampai\s*(\d+)/i);
    const maxResults = totalText ? parseInt(totalText[1], 10) : 12;

    const items: SearchItem[] = [];
    $('ul.chivsrc > li').each((_, li) => {
      const $li = $(li);
      const $a = $li.find('h2 > a').first();
      const title = $a.text().trim();
      const href = $a.attr('href') || '';
      if (!title && !href) return;

      const $img = $li.find('img').first();
      const thumb = $img.attr('src') || '';
      const alt = $img.attr('alt') || '';
      const type = /\/episode\/[^/]+\/?$/i.test(href) ? 'episode' : 'anime';

      let genres: GenreRaw[] = [];
      let status: string | null = null;
      let rating: number | null = null;
      $li.find('div.set').each((_, set) => {
        const $set = $(set);
        const text = $set.text().trim();
        if (text.startsWith('Genres')) genres = scrapeGenreLinks($, $set);
        if (text.startsWith('Status')) status = text.replace(/^Status\s*:\s*/i, '').trim() || null;
        if (text.startsWith('Rating')) {
          const m = text.match(/(\d+(?:\.\d+)?)/);
          rating = m ? parseFloat(m[1]) : null;
        }
      });

      items.push({ title, url: href, type, thumb, alt, genres, status, rating });
    });

    return { success: true, query, maxResults, totalItems: items.length, items };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

interface InfoScrape {
  success: true;
  title: string;
  thumb: string;
  info: Record<string, string>;
  genres: GenreRaw[];
  synopsis: string | null;
  synopsisParagraphs: string[];
  episodes: { title: string; url: string; date: string | null }[];
}

async function info(url: string): Promise<InfoScrape | Failure> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('div.jdlrx h1').first().text().trim() || '';
    const thumb = $('div.fotoanime img').first().attr('src') || '';

    const details: Record<string, string> = {};
    $('div.infozingle p span').each((_, span) => {
      const text = $(span).text().trim();
      const m = text.match(/^(.+?)\s*:\s*(.+)$/);
      if (!m) return;
      details[m[1].trim()] = m[2].trim();
    });

    let genres: GenreRaw[] = [];
    $('div.infozingle p span').each((_, span) => {
      const $span = $(span);
      if (!$span.text().trim().startsWith('Genre')) return;
      genres = genres.concat(scrapeGenreLinks($, $span));
    });

    const synopsis = $('div.sinopc').text().trim() || null;
    const synopsisParagraphs = $('div.sinopc p')
      .map((_, p) => $(p).text().trim())
      .get()
      .filter(Boolean);

    const episodes: { title: string; url: string; date: string | null }[] = [];
    $('div.episodelist ul li').each((_, li) => {
      const $li = $(li);
      const $a = $li.find('a').first();
      const t = $a.text().trim();
      const href = $a.attr('href') || '';
      const date = $li.find('span.zeebr').text().trim() || null;
      if (!t && !href) return;
      episodes.push({ title: t, url: href, date });
    });

    return { success: true, title, thumb, info: details, genres, synopsis, synopsisParagraphs, episodes };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

interface MirrorService {
  service: string;
  data: string; // base64 dari atribut data-content
  isDefault: boolean;
}

interface Mirror {
  resolution: string;
  services: MirrorService[];
}

interface WatchScrape {
  success: true;
  title: string;
  postedBy: string | null;
  releaseTime: string | null;
  prev: string | null;
  next: string | null;
  animeUrl: string | null;
  embedIframe: string | null;
  episodes: { title: string; url: string }[];
  mirrors: Mirror[];
}

/** Parse halaman episode. TIDAK lagi me-resolve semua stream (lambat). */
async function watch(url: string): Promise<WatchScrape | Failure> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('h1.posttl').first().text().trim() || '';
    const postedBy = $('div.kategoz span').first().text().trim() || null;
    const releaseTime = $('div.kategoz span').eq(1).text().trim() || null;

    const episodes: { title: string; url: string }[] = [];
    $('#selectcog option').each((_, opt) => {
      const $opt = $(opt);
      const href = $opt.attr('value') || '';
      const text = $opt.text().trim();
      if (!href || href === '0') return;
      episodes.push({ title: text, url: href });
    });

    const prev = $("div.prevnext a[title='Episode Sebelumnya']").attr('href') || null;
    const next = $("div.prevnext a[title='Episode Selanjutnya']").attr('href') || null;
    const animeUrl = $("div.prevnext a[rel='follow']").attr('href') || null;

    const embedIframe = $('div#embed_holder iframe').first().attr('src') || null;

    const mirrors: Mirror[] = [];
    $('div.mirrorstream ul').each((_, ul) => {
      const $ul = $(ul);
      const resolutionMatch = ($ul.text().trim() || '').match(/Mirror\s*(\d+p)/i);
      const resolution = resolutionMatch ? resolutionMatch[1] : null;
      const services: MirrorService[] = [];
      $ul.find('li a').each((_, a) => {
        const $a = $(a);
        const service = $a.text().trim();
        const data = $a.attr('data-content') || '';
        if (!service || !data) return;
        services.push({ service, data, isDefault: $a.attr('data-default') === 'true' });
      });
      if (resolution && services.length) mirrors.push({ resolution, services });
    });

    return { success: true, title, postedBy, releaseTime, prev, next, animeUrl, embedIframe, episodes, mirrors };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

// Nonce admin-ajax di-cache singkat supaya tiap klik server tidak butuh 2 request.
let nonceCache: { value: string; exp: number } | null = null;

async function getNonce(force = false): Promise<string | null> {
  if (!force && nonceCache && nonceCache.exp > Date.now()) return nonceCache.value;
  try {
    const res = await fetch(AJAX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
      body: `action=${ACTION_NONCE}`,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const value: string | null = json?.data || null;
    if (value) nonceCache = { value, exp: Date.now() + 600000 };
    return value;
  } catch (e: any) {
    console.error('Failed to fetch nonce:', e.message);
    return null;
  }
}

/** Ubah `data-content` (base64) menjadi URL iframe/video. Logika sama dengan scraper Anda. */
async function resolveStream(serverId: string): Promise<string | null> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(serverId, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
  if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) return null;

  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(decoded as Record<string, unknown>)) {
    if (typeof v === 'string' || typeof v === 'number') params[k] = String(v);
  }

  for (let attempt = 0; attempt < 2; attempt++) {
    const nonce = await getNonce(attempt === 1); // percobaan ke-2: paksa nonce baru
    if (!nonce) return null;
    try {
      const res = await fetch(AJAX_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': UA },
        body: new URLSearchParams({ ...params, nonce, action: ACTION_STREAM }).toString(),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const json: any = await res.json();
      const html = Buffer.from(json?.data || '', 'base64').toString('utf-8');
      const $s = cheerio.load(html);
      let src = $s('iframe').first().attr('src') || $s('video').first().attr('src') || $s('source').first().attr('src');
      if (!src) continue;
      if (src.startsWith('//')) src = `https:${src}`;
      if (/^https?:\/\//i.test(src)) return src;
    } catch (e: any) {
      console.error('Failed to fetch stream:', e.message);
    }
  }
  return null;
}

interface ScheduleScrape {
  success: true;
  title: string | null;
  schedule: { day: string | null; items: { title: string; url: string }[] }[];
}

async function upcoming(): Promise<ScheduleScrape | Failure> {
  try {
    const html = await fetchHtml(`${SOURCE}/jadwal-rilis/`);
    const $ = cheerio.load(html);

    const schedule: ScheduleScrape['schedule'] = [];
    $('div.kglist321').each((_, el) => {
      const day = $(el).find('h2').first().text().trim() || null;
      const items: { title: string; url: string }[] = [];
      $(el)
        .find('ul > li > a')
        .each((_, a) => {
          const $a = $(a);
          items.push({ title: $a.text().trim(), url: $a.attr('href') || '' });
        });
      schedule.push({ day, items });
    });

    const title = $('div.jdlpot h1').first().text().trim() || $('div.kgjdwl321 h1').first().text().trim() || null;

    return { success: true, title, schedule };
  } catch (e: any) {
    console.error(e);
    return { success: false, error: e.message };
  }
}

/* ════════════════════════════════════════════════════════════════════════
 * 2. ADAPTER  (hasil scraper  ►  bentuk data yang dibaca frontend)
 * ════════════════════════════════════════════════════════════════════════ */

// Cache poster (slug -> url gambar). Jadwal rilis dari situs tidak membawa
// poster, jadi poster diisi dari data lain yang pernah lewat (home/search/detail).
const posterCache = new Map<string, string>();

function rememberPosters(list: { animeId: string; poster: string }[]): void {
  for (const a of list) if (a.animeId && a.poster) posterCache.set(a.animeId, a.poster);
}

function mapGenres(list: GenreRaw[]): Genre[] {
  const seen = new Set<string>();
  const out: Genre[] = [];
  for (const g of list) {
    const genreId = g.slug || g.name.toLowerCase().replace(/\s+/g, '-');
    if (seen.has(genreId)) continue; // React memakai genreId sebagai key -> harus unik
    seen.add(genreId);
    out.push({ title: g.name, genreId, href: `/genres/${genreId}` });
  }
  return out;
}

function toAnimeItem(x: { title: string; url: string; thumb: string }, extra: Partial<AnimeItem> = {}): AnimeItem {
  const animeId = slugFromUrl(x.url, 'anime');
  return { title: x.title, poster: x.thumb, animeId, href: `/anime/${animeId}`, ...extra };
}

function toEpisode(e: { title: string; url: string; date?: string | null }, idx: number, total: number): Episode {
  const episodeId = slugFromUrl(e.url, 'episode');
  return {
    title: e.title,
    eps: episodeNumber(e.title) ?? total - idx, // fallback: urutan (daftar situs = terbaru di atas)
    date: e.date ?? '',
    episodeId,
    href: `/episode/${episodeId}`,
    otakudesuUrl: e.url,
  };
}

function toEpisodeList(list: { title: string; url: string; date?: string | null }[]): Episode[] {
  // Buang link batch/lengkap: hanya URL /episode/ yang bisa diputar WatchPage
  const eps = list.filter((e) => /\/episode\//.test(e.url));
  return eps.map((e, i) => toEpisode(e, i, eps.length));
}

/** GET /home  ->  HomeData */
function adaptHome(r: HomeScrape): HomeData {
  const ongoing = r.ongoing
    .map((i) =>
      toAnimeItem(i, {
        episodes: toNumber(i.episode),
        releaseDay: i.day ?? undefined,
        latestReleaseDate: i.date ?? undefined,
      }),
    )
    .filter((a) => a.animeId);

  const completed = r.complete
    .map((i) =>
      toAnimeItem(i, {
        episodes: toNumber(i.episode),
        score: i.rating != null ? String(i.rating) : '',
        lastReleaseDate: i.date ?? undefined,
      }),
    )
    .filter((a) => a.animeId);

  return {
    ongoing: { href: '/ongoing-anime', animeList: ongoing },
    completed: { href: '/complete-anime', animeList: completed },
  };
}

/** GET /search/:q  ->  AnimeItem[] */
function adaptSearch(r: SearchScrape): AnimeItem[] {
  return r.items
    .filter((i) => i.type === 'anime') // hasil bertipe episode tidak bisa dibuka lewat halaman detail
    .map((i) =>
      toAnimeItem(i, {
        score: i.rating != null ? String(i.rating) : '',
        status: i.status ?? undefined,
        genreList: mapGenres(i.genres),
      }),
    )
    .filter((a) => a.animeId);
}

/** GET /anime/:slug  ->  AnimeDetail */
function adaptDetail(r: InfoScrape): AnimeDetail {
  const d = r.info;
  const paragraphs = r.synopsisParagraphs.length
    ? r.synopsisParagraphs
    : (r.synopsis ?? '')
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);

  const batchLink = r.episodes.find((e) => /\/(batch|lengkap)\//.test(e.url));

  return {
    title: pickInfo(d, 'Judul', 'Title') || r.title,
    poster: r.thumb,
    japanese: pickInfo(d, 'Japanese', 'Japan'),
    score: pickInfo(d, 'Skor', 'Score'),
    producers: pickInfo(d, 'Produser', 'Producer'),
    type: pickInfo(d, 'Tipe', 'Type'),
    status: pickInfo(d, 'Status'),
    episodes: toNumber(pickInfo(d, 'Total Episode', 'Episode')) ?? null,
    duration: pickInfo(d, 'Durasi', 'Duration'),
    aired: pickInfo(d, 'Tanggal Rilis', 'Rilis', 'Aired'),
    studios: pickInfo(d, 'Studio', 'Studios'),
    batch: batchLink ? batchLink.url : null,
    synopsis: { paragraphs, connections: [] },
    genreList: mapGenres(r.genres),
    episodeList: toEpisodeList(r.episodes),
    recommendedAnimeList: [], // scraper belum mengambil rekomendasi -> bagian ini disembunyikan UI
  };
}

/** GET /episode/:id  ->  EpisodeData  (meta = data halaman anime, opsional) */
function adaptEpisode(r: WatchScrape, meta: InfoScrape | null): EpisodeData {
  const titleByUrl = new Map(r.episodes.map((e) => [e.url, e.title] as [string, string]));
  const nav = (url: string | null) => {
    if (!url || !/\/episode\//.test(url)) return null;
    const episodeId = slugFromUrl(url, 'episode');
    return { title: titleByUrl.get(url) ?? '', episodeId, href: `/episode/${episodeId}`, otakudesuUrl: url };
  };
  const prevEpisode = nav(r.prev);
  const nextEpisode = nav(r.next);

  // Kelompokkan server per resolusi (key React di WatchPage = quality.title -> harus unik)
  const byQuality = new Map<string, ServerQuality>();
  for (const m of r.mirrors) {
    let q = byQuality.get(m.resolution);
    if (!q) {
      q = { title: m.resolution, serverList: [] };
      byQuality.set(m.resolution, q);
    }
    for (const s of m.services) {
      // serverId = data-content dalam base64url (aman untuk path URL); di-resolve lazy oleh /server/:id
      const serverId = Buffer.from(s.data, 'base64').toString('base64url');
      q.serverList.push({ title: s.service, serverId, href: `/server/${serverId}` });
    }
  }

  const d = meta?.info ?? {};

  return {
    title: r.title,
    animeId: slugFromUrl(r.animeUrl, 'anime'),
    releaseTime: r.releaseTime ?? '',
    defaultStreamingUrl: wrapEmbed(r.embedIframe),
    hasPrevEpisode: !!prevEpisode,
    prevEpisode,
    hasNextEpisode: !!nextEpisode,
    nextEpisode,
    server: { qualities: Array.from(byQuality.values()) },
    downloadUrl: { qualities: [] }, // scraper belum mengambil link download -> bagian ini disembunyikan UI
    info: {
      credit: '', // tidak ada di scraper -> disembunyikan UI
      encoder: '',
      duration: pickInfo(d, 'Durasi', 'Duration'),
      type: pickInfo(d, 'Tipe', 'Type'),
      genreList: mapGenres(meta?.genres ?? []),
      episodeList: toEpisodeList(r.episodes),
    },
  };
}

const DAY_NAMES = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];

function normalizeDay(day: string | null): string {
  const d = (day ?? '').trim();
  const idx = DAY_NAMES.indexOf(d.toLowerCase().replace("jum'at", 'jumat'));
  return idx >= 0 ? DAY_NAMES[idx][0].toUpperCase() + DAY_NAMES[idx].slice(1) : d;
}

/** GET /schedule  ->  ScheduleDay[] */
function adaptSchedule(r: ScheduleScrape): ScheduleDay[] {
  return r.schedule.map((s) => ({
    day: normalizeDay(s.day),
    anime_list: s.items
      .map((i) => {
        const slug = slugFromUrl(i.url, 'anime');
        return { title: i.title, slug, url: i.url, poster: posterCache.get(slug) ?? PLACEHOLDER_POSTER };
      })
      .filter((a) => a.slug),
  }));
}

/** Kelompokkan daftar anime per huruf awal  ->  UnlimitedItem[] */
function groupAlphabet(list: { title: string; url: string }[]): UnlimitedItem[] {
  const groups = new Map<string, UnlimitedItem['animeList']>();
  const seen = new Set<string>();
  for (const a of list) {
    const animeId = slugFromUrl(a.url, 'anime');
    if (!animeId || seen.has(animeId)) continue;
    seen.add(animeId);
    const first = a.title.trim().charAt(0).toUpperCase();
    const key = /[A-Z]/.test(first) ? first : '#';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ title: a.title, animeId, href: `/anime/${animeId}` });
  }
  return Array.from(groups.entries())
    .sort(([a], [b]) => (a === '#' ? -1 : b === '#' ? 1 : a.localeCompare(b)))
    .map(([startWith, animeList]) => ({
      startWith,
      animeList: animeList.sort((x, y) => x.title.localeCompare(y.title)),
    }));
}

/* ════════════════════════════════════════════════════════════════════════
 * 3. ROUTER  (URL /api/...  ►  scraper + adapter)
 * ════════════════════════════════════════════════════════════════════════ */

const SLUG_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,160}$/;
const SERVER_ID_RE = /^[A-Za-z0-9_-]{8,1024}$/;

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([p, new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), ms); })]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

interface RouteResult {
  data: unknown;
  ttl: number; // detik, untuk Cache-Control s-maxage
}

async function route(path: string): Promise<RouteResult> {
  const [head, ...rest] = path.split('/').filter(Boolean);
  const arg = safeDecode(rest.join('/'));

  switch (head) {
    case 'home': {
      const data = adaptHome(unwrap(await home()));
      rememberPosters(data.ongoing.animeList);
      rememberPosters(data.completed.animeList);
      return { data, ttl: 300 };
    }

    case 'schedule': {
      // Jadwal tidak punya poster -> ambil home paralel (best-effort) untuk mengisi cache poster
      const [sched, homeRes] = await Promise.all([upcoming(), home()]);
      if (homeRes.success) {
        const h = adaptHome(homeRes);
        rememberPosters(h.ongoing.animeList);
        rememberPosters(h.completed.animeList);
      }
      return { data: adaptSchedule(unwrap(sched)), ttl: 3600 };
    }

    case 'unlimited': {
      // CATATAN: scraper Anda belum punya fungsi untuk halaman daftar anime A–Z.
      // Sementara daftar disusun dari data home. Setelah punya scraper "anime-list",
      // ganti isi `source` dengan hasilnya: [{ title, url }].
      const h = unwrap(await home());
      const source = [...h.ongoing, ...h.complete].map((i) => ({ title: i.title, url: i.url }));
      return { data: groupAlphabet(source), ttl: 3600 };
    }

    case 'anime': {
      if (!SLUG_RE.test(arg)) throw new HttpError(400, 'Slug tidak valid');
      const r = unwrap(await info(`${SOURCE}/anime/${arg}/`));
      const data = adaptDetail(r);
      if (!data.title && !data.episodeList.length) throw new HttpError(404, 'Anime tidak ditemukan');
      rememberPosters([{ animeId: arg, poster: data.poster }]);
      return { data, ttl: 600 };
    }

    case 'search': {
      const q = arg.trim();
      if (q.length < 2 || q.length > 100) throw new HttpError(400, 'Query tidak valid');
      const data = adaptSearch(unwrap(await search(q)));
      rememberPosters(data);
      return { data, ttl: 300 };
    }

    case 'episode': {
      if (!SLUG_RE.test(arg)) throw new HttpError(400, 'Episode ID tidak valid');
      const r = unwrap(await watch(`${SOURCE}/episode/${arg}/`));
      // Best-effort: lengkapi genre/tipe/durasi dari halaman anime (maks 2,5 detik, gagal = diabaikan)
      let meta: InfoScrape | null = null;
      if (r.animeUrl) {
        const m = await withTimeout(info(r.animeUrl), 2500);
        if (m && m.success) meta = m;
      }
      return { data: adaptEpisode(r, meta), ttl: 300 };
    }

    case 'server': {
      if (!SERVER_ID_RE.test(arg)) throw new HttpError(400, 'Server ID tidak valid');
      const url = await resolveStream(arg);
      if (!url) throw new HttpError(502, 'Gagal mengambil stream');
      const data: ServerData = { url: wrapEmbed(url) };
      return { data, ttl: 0 };
    }

    default:
      throw new HttpError(403, 'Path not allowed');
  }
}

/** GET /embed/:id  ->  halaman HTML player (tanpa CSP frame-ancestors) yang bisa masuk iframe kita. */
async function serveEmbed(id: string, res: VercelResponse) {
  try {
    if (!SERVER_ID_RE.test(id)) throw new HttpError(400, 'Embed ID tidak valid');
    let target: URL;
    try {
      target = new URL(Buffer.from(id, 'base64url').toString('utf-8'));
    } catch {
      throw new HttpError(400, 'URL embed tidak valid');
    }
    // Whitelist ketat supaya endpoint ini tidak bisa dipakai sebagai proxy bebas
    if (target.protocol !== 'https:' || !EMBED_PROXY_HOSTS.test(target.hostname)) {
      throw new HttpError(403, 'Host embed tidak diizinkan');
    }

    const r = await fetch(target.toString(), {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml', Referer: `${SOURCE}/` },
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!r.ok) throw new HttpError(502, `Embed HTTP ${r.status}`);
    const finalUrl = new URL(r.url || target.toString());
    if (!EMBED_PROXY_HOSTS.test(finalUrl.hostname)) throw new HttpError(403, 'Redirect embed tidak diizinkan');

    let html = await r.text();
    html = html.replace(/<meta[^>]+http-equiv=["']?content-security-policy["']?[^>]*>/gi, '');
    // <base> membuat resource relatif (/js, /css, dll.) tetap dimuat dari server player
    const base = `<base href="${finalUrl.toString().replace(/"/g, '&quot;')}">`;
    html = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}${base}`) : base + html;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).end(html);
  } catch (error: any) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error('Embed error:', error);
    return res.status(status).json({ error: error.message || 'Internal server error' });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const raw = req.query.path;
  let path = Array.isArray(raw) ? '/' + raw.join('/') : typeof raw === 'string' ? raw : '';
  if (!path) return res.status(400).json({ error: 'Path is required' });
  if (!path.startsWith('/')) path = '/' + path;

  if (path.startsWith('/embed/')) return serveEmbed(safeDecode(path.slice('/embed/'.length)), res);

  try {
    const { data, ttl } = await route(path);
    res.setHeader(
      'Cache-Control',
      ttl > 0 ? `s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}` : 'no-store',
    );
    // Frontend membaca `json.data` (lihat fetchAPI di src/api.ts)
    return res.status(200).json({ status: 'success', data });
  } catch (error: any) {
    const status = error instanceof HttpError ? error.status : 500;
    if (status >= 500) console.error('Proxy error:', error);
    return res.status(status).json({ error: error.message || 'Internal server error' });
  }
}
