import { useState } from 'react';
import { Heart, Play, Star, Calendar } from 'lucide-react';
import { isFavorite, toggleFavorite } from '../favorites';

interface Props {
  animeId: string;
  title: string;
  poster: string;
  episodes?: number;
  score?: string;
  releaseDay?: string;
  latestReleaseDate?: string;
  status?: string;
  onClick: () => void;
  compact?: boolean;
}

export default function AnimeCard({
  animeId, title, poster, episodes, score, releaseDay,
  latestReleaseDate, status, onClick, compact
}: Props) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [fav, setFav] = useState(isFavorite(animeId));
  const [imgError, setImgError] = useState(false);

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleFavorite({ animeId, title, poster, score, status });
    setFav(newState);
  };

  return (
    <div
      className="glass-card cursor-pointer group relative"
      onClick={onClick}
    >
      <div className={`relative overflow-hidden ${compact ? 'aspect-[3/4]' : 'aspect-[2/3]'}`}>
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 skeleton" />
        )}
        <img
          src={poster}
          alt={title}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => { setImgError(true); setImgLoaded(true); }}
        />
        {imgError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
            <Play className="w-8 h-8 text-gray-500" />
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        
        {/* Favorite button */}
        <button
          onClick={handleFav}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all active:scale-90"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${fav ? 'fill-rose-500 text-rose-500' : 'text-white/70'}`}
          />
        </button>

        {/* Status badge */}
        {status && (
          <span className={`absolute top-2 left-2 badge-glass text-[0.6rem] ${status === 'Ongoing' ? '!bg-emerald-500/20 !border-emerald-500/30 !text-emerald-300' : ''}`}>
            {status}
          </span>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-indigo-500/80 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <Play className="w-5 h-5 text-white fill-white ml-0.5" />
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          {score && score !== '' && (
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[0.65rem] text-amber-300 font-semibold">{score}</span>
            </div>
          )}
          {episodes && (
            <div className="flex items-center gap-1 mb-1">
              <Play className="w-3 h-3 text-indigo-300" />
              <span className="text-[0.65rem] text-indigo-200">Ep {episodes}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-2.5 pt-2">
        <h3 className="text-xs font-medium text-gray-200 line-clamp-2 leading-tight">{title}</h3>
        {(releaseDay || latestReleaseDate) && (
          <div className="flex items-center gap-1 mt-1.5">
            <Calendar className="w-3 h-3 text-gray-500" />
            <span className="text-[0.6rem] text-gray-500">
              {releaseDay && `${releaseDay}`}
              {latestReleaseDate && ` · ${latestReleaseDate}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
