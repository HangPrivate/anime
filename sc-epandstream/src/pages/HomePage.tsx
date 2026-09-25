import { useEffect, useState } from 'react';
import { TrendingUp, CheckCircle, ChevronRight } from 'lucide-react';
import { fetchHome, type HomeData } from '../api';
import AnimeCard from '../components/AnimeCard';
import { CardSkeleton } from '../components/Skeleton';

interface Props {
  onAnimeClick: (slug: string) => void;
}

export default function HomePage({ onAnimeClick }: Props) {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [featuredIndex, setFeaturedIndex] = useState(0);

  useEffect(() => {
    setLoading(true);
    fetchHome()
      .then(setData)
      .catch(() => setError('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!data?.ongoing?.animeList?.length) return;
    const interval = setInterval(() => {
      setFeaturedIndex(prev => (prev + 1) % Math.min(data.ongoing.animeList.length, 5));
    }, 5000);
    return () => clearInterval(interval);
  }, [data]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 fade-in">
        <div className="glass p-6 text-center max-w-xs">
          <p className="text-gray-400 text-sm">{error}</p>
          <button onClick={() => window.location.reload()} className="liquid-btn px-4 py-2 mt-4 text-sm">
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 space-y-6 fade-in">
        <div className="h-48 skeleton rounded-2xl" />
        <CardSkeleton count={6} />
      </div>
    );
  }

  const featured = data?.ongoing?.animeList?.slice(0, 5) || [];
  const currentFeatured = featured[featuredIndex];

  return (
    <div className="fade-in pb-4">
      {/* Hero / Featured Banner */}
      {currentFeatured && (
        <div
          className="relative h-56 sm:h-72 mx-4 mt-3 rounded-2xl overflow-hidden cursor-pointer glow-accent"
          onClick={() => onAnimeClick(currentFeatured.animeId)}
        >
          <img
            src={currentFeatured.poster}
            alt={currentFeatured.title}
            className="w-full h-full object-cover transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <span className="badge-glass !bg-emerald-500/20 !border-emerald-500/30 !text-emerald-300 mb-2 inline-block">
              Ongoing
            </span>
            <h2 className="text-white font-bold text-lg leading-tight line-clamp-2">{currentFeatured.title}</h2>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-300">
              <span>Ep {currentFeatured.episodes}</span>
              <span>{currentFeatured.releaseDay}</span>
            </div>
          </div>
          {/* Dots */}
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); setFeaturedIndex(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === featuredIndex ? 'bg-indigo-400 w-4' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Ongoing Section */}
      <section className="mt-6 px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-white">Ongoing Anime</h2>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {data?.ongoing?.animeList?.map(anime => (
            <AnimeCard
              key={anime.animeId}
              animeId={anime.animeId}
              title={anime.title}
              poster={anime.poster}
              episodes={anime.episodes}
              releaseDay={anime.releaseDay}
              latestReleaseDate={anime.latestReleaseDate}
              status="Ongoing"
              onClick={() => onAnimeClick(anime.animeId)}
            />
          ))}
        </div>
      </section>

      {/* Completed Section */}
      <section className="mt-8 px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Completed</h2>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {data?.completed?.animeList?.map(anime => (
            <AnimeCard
              key={anime.animeId}
              animeId={anime.animeId}
              title={anime.title}
              poster={anime.poster}
              episodes={anime.episodes}
              score={anime.score}
              latestReleaseDate={anime.lastReleaseDate}
              status="Completed"
              onClick={() => onAnimeClick(anime.animeId)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
