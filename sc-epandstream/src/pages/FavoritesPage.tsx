import { useEffect, useState } from 'react';
import { Heart, Trash2, Star } from 'lucide-react';
import { getFavorites, removeFavorite, type FavoriteAnime } from '../favorites';

interface Props {
  onAnimeClick: (slug: string) => void;
}

export default function FavoritesPage({ onAnimeClick }: Props) {
  const [favorites, setFavorites] = useState<FavoriteAnime[]>([]);

  const loadFavorites = () => {
    setFavorites(getFavorites().sort((a, b) => b.addedAt - a.addedAt));
  };

  useEffect(() => {
    loadFavorites();
    const handler = () => loadFavorites();
    window.addEventListener('favorites-changed', handler);
    return () => window.removeEventListener('favorites-changed', handler);
  }, []);

  const handleRemove = (e: React.MouseEvent, animeId: string) => {
    e.stopPropagation();
    removeFavorite(animeId);
    loadFavorites();
  };

  return (
    <div className="fade-in pb-4">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <Heart className="w-5 h-5 text-rose-400" />
          <h1 className="text-lg font-bold text-white">Favorit</h1>
        </div>
        <p className="text-xs text-gray-500">{favorites.length} anime tersimpan</p>
      </div>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 px-4">
          <div className="glass p-8 text-center max-w-xs">
            <Heart className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Belum ada anime favorit</p>
            <p className="text-gray-600 text-xs mt-1">Tap ikon hati di kartu anime untuk menambahkan</p>
          </div>
        </div>
      ) : (
        <div className="px-4 mt-3 space-y-3">
          {favorites.map((anime, idx) => (
            <div
              key={anime.animeId}
              className="glass-card flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => onAnimeClick(anime.animeId)}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-white/8">
                <img
                  src={anime.poster}
                  alt={anime.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">{anime.title}</h3>
                <div className="flex items-center gap-2 mt-1.5">
                  {anime.score && anime.score !== '' && (
                    <span className="flex items-center gap-1 text-[0.65rem] text-amber-300">
                      <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                      {anime.score}
                    </span>
                  )}
                  {anime.status && (
                    <span className={`badge-glass text-[0.6rem] ${anime.status === 'Ongoing' ? '!bg-emerald-500/15 !text-emerald-300' : ''}`}>
                      {anime.status}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => handleRemove(e, anime.animeId)}
                className="p-2 rounded-lg hover:bg-rose-500/15 transition-colors flex-shrink-0 active:scale-90"
              >
                <Trash2 className="w-4 h-4 text-rose-400/70" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
