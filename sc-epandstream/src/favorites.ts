export interface FavoriteAnime {
  animeId: string;
  title: string;
  poster: string;
  score?: string;
  status?: string;
  addedAt: number;
}

const STORAGE_KEY = 'aniwave_favorites';

export function getFavorites(): FavoriteAnime[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addFavorite(anime: Omit<FavoriteAnime, 'addedAt'>): void {
  const favorites = getFavorites();
  if (favorites.some(f => f.animeId === anime.animeId)) return;
  favorites.push({ ...anime, addedAt: Date.now() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent('favorites-changed'));
}

export function removeFavorite(animeId: string): void {
  const favorites = getFavorites().filter(f => f.animeId !== animeId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  window.dispatchEvent(new CustomEvent('favorites-changed'));
}

export function isFavorite(animeId: string): boolean {
  return getFavorites().some(f => f.animeId === animeId);
}

export function toggleFavorite(anime: Omit<FavoriteAnime, 'addedAt'>): boolean {
  if (isFavorite(anime.animeId)) {
    removeFavorite(anime.animeId);
    return false;
  } else {
    addFavorite(anime);
    return true;
  }
}
