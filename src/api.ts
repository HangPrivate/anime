// Determine if we should use proxy
const isProduction = typeof window !== 'undefined' && 
  !window.location.hostname.includes('localhost') && 
  !window.location.hostname.includes('127.0.0.1');

const DIRECT_URL = 'https://www.sankavollerei.com/anime';
const PROXY_URL = '/api';

function getBaseUrl(): string {
  return isProduction ? PROXY_URL : DIRECT_URL;
}

export interface AnimeItem {
  title: string;
  poster: string;
  episodes?: number;
  releaseDay?: string;
  latestReleaseDate?: string;
  lastReleaseDate?: string;
  score?: string;
  animeId: string;
  href: string;
  status?: string;
  genreList?: Genre[];
}

export interface Genre {
  title: string;
  genreId: string;
  href: string;
}

export interface Episode {
  title: string;
  eps: number;
  date: string;
  episodeId: string;
  href: string;
  otakudesuUrl: string;
}

export interface AnimeDetail {
  title: string;
  poster: string;
  japanese: string;
  score: string;
  producers: string;
  type: string;
  status: string;
  episodes: number | null;
  duration: string;
  aired: string;
  studios: string;
  batch: string | null;
  synopsis: {
    paragraphs: string[];
    connections: any[];
  };
  genreList: Genre[];
  episodeList: Episode[];
  recommendedAnimeList: AnimeItem[];
}

export interface ScheduleDay {
  day: string;
  anime_list: {
    title: string;
    slug: string;
    url: string;
    poster: string;
  }[];
}

export interface HomeData {
  ongoing: {
    href: string;
    animeList: AnimeItem[];
  };
  completed: {
    href: string;
    animeList: AnimeItem[];
  };
}

export interface UnlimitedItem {
  startWith: string;
  animeList: {
    title: string;
    animeId: string;
    href: string;
  }[];
}

export interface ServerQuality {
  title: string;
  serverList: {
    title: string;
    serverId: string;
    href: string;
  }[];
}

export interface DownloadQuality {
  title: string;
  size: string;
  urls: {
    title: string;
    url: string;
  }[];
}

export interface EpisodeData {
  title: string;
  animeId: string;
  releaseTime: string;
  defaultStreamingUrl: string;
  hasPrevEpisode: boolean;
  prevEpisode: {
    title: string;
    episodeId: string;
    href: string;
    otakudesuUrl: string;
  } | null;
  hasNextEpisode: boolean;
  nextEpisode: {
    title: string;
    episodeId: string;
    href: string;
    otakudesuUrl: string;
  } | null;
  server: {
    qualities: ServerQuality[];
  };
  downloadUrl: {
    qualities: DownloadQuality[];
  };
  info: {
    credit: string;
    encoder: string;
    duration: string;
    type: string;
    genreList: Genre[];
    episodeList: Episode[];
  };
}

export interface ServerData {
  url: string;
}

async function fetchAPI<T>(path: string): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path}`;
  
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
  });
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  
  const json = await res.json();
  
  // Handle both direct API response and proxied response
  if (json.data !== undefined) {
    return json.data;
  }
  
  return json;
}

export async function fetchHome(): Promise<HomeData> {
  return fetchAPI<HomeData>('/home');
}

export async function fetchSchedule(): Promise<ScheduleDay[]> {
  return fetchAPI<ScheduleDay[]>('/schedule');
}

export async function fetchAnimeDetail(slug: string): Promise<AnimeDetail> {
  return fetchAPI<AnimeDetail>(`/anime/${slug}`);
}

export async function searchAnime(query: string): Promise<AnimeItem[]> {
  const data = await fetchAPI<{ animeList: AnimeItem[] } | AnimeItem[]>(`/search/${encodeURIComponent(query)}`);
  if (Array.isArray(data)) {
    return data;
  }
  return data?.animeList || [];
}

export async function fetchUnlimited(): Promise<UnlimitedItem[]> {
  const data = await fetchAPI<{ list: UnlimitedItem[] } | UnlimitedItem[]>('/unlimited');
  if (Array.isArray(data)) {
    return data;
  }
  return data?.list || [];
}

export async function fetchEpisode(episodeId: string): Promise<EpisodeData> {
  return fetchAPI<EpisodeData>(`/episode/${episodeId}`);
}

export async function fetchServer(serverId: string): Promise<ServerData> {
  return fetchAPI<ServerData>(`/server/${serverId}`);
}
