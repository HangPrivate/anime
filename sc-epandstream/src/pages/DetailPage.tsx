import { useEffect, useState } from 'react';
import {
  ArrowLeft, Heart, Star, Play, Clock, Tv, Users,
  Film, Calendar, Tag, ChevronDown, ChevronUp
} from 'lucide-react';
import { fetchAnimeDetail, type AnimeDetail } from '../api';
import { isFavorite, toggleFavorite } from '../favorites';
import { DetailSkeleton } from '../components/Skeleton';

interface Props {
  slug: string;
  onBack: () => void;
  onAnimeClick: (slug: string) => void;
  onEpisodeClick: (episodeId: string) => void;
}

export default function DetailPage({ slug, onBack, onAnimeClick, onEpisodeClick }: Props) {
  const [detail, setDetail] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fav, setFav] = useState(false);
  const [showAllEps, setShowAllEps] = useState(false);
  const [synopsisExpanded, setSynopsisExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    setShowAllEps(false);
    setSynopsisExpanded(false);
    window.scrollTo(0, 0);
    fetchAnimeDetail(slug)
      .then(data => {
        setDetail(data);
        setFav(isFavorite(slug));
      })
      .catch(() => setError('Gagal memuat detail anime'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleFav = () => {
    if (!detail) return;
    const newState = toggleFavorite({
      animeId: slug,
      title: detail.title,
      poster: detail.poster,
      score: detail.score,
      status: detail.status,
    });
    setFav(newState);
  };

  if (loading) return <DetailSkeleton />;

  if (error || !detail) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 fade-in">
        <div className="glass p-6 text-center max-w-xs">
          <p className="text-gray-400 text-sm">{error || 'Anime tidak ditemukan'}</p>
          <button onClick={onBack} className="liquid-btn px-4 py-2 mt-4 text-sm">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const visibleEps = showAllEps ? detail.episodeList : detail.episodeList.slice(0, 10);

  return (
    <div className="fade-in pb-6">
      {/* Hero */}
      <div className="relative h-64 sm:h-80">
        <img src={detail.poster} alt={detail.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07070f] via-[#07070f]/60 to-transparent" />
        
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={handleFav}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all active:scale-90"
          >
            <Heart className={`w-5 h-5 transition-colors ${fav ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-20 relative z-10">
        <div className="flex gap-4">
          {/* Poster */}
          <div className="w-28 flex-shrink-0">
            <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/10 shadow-xl shadow-black/50">
              <img src={detail.poster} alt={detail.title} className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-8">
            <h1 className="text-lg font-bold text-white leading-tight">{detail.title}</h1>
            {detail.japanese && detail.japanese !== detail.title && (
              <p className="text-xs text-gray-400 mt-1">{detail.japanese}</p>
            )}
            <div className="flex flex-wrap gap-2 mt-3">
              {detail.score && detail.score !== '' && (
                <span className="badge-glass flex items-center gap-1 !bg-amber-500/15 !border-amber-500/25 !text-amber-300">
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                  {detail.score}
                </span>
              )}
              <span className={`badge-glass ${detail.status === 'Ongoing' ? '!bg-emerald-500/15 !border-emerald-500/25 !text-emerald-300' : '!bg-blue-500/15 !border-blue-500/25 !text-blue-300'}`}>
                {detail.status}
              </span>
              <span className="badge-glass">{detail.type}</span>
            </div>
          </div>
        </div>

        {/* Quick Info Grid */}
        <div className="grid grid-cols-2 gap-2 mt-5">
          {detail.studios && (
            <div className="glass-sm p-3 flex items-center gap-2.5">
              <Film className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[0.6rem] text-gray-500 uppercase tracking-wider">Studio</p>
                <p className="text-xs text-gray-200 line-clamp-1">{detail.studios}</p>
              </div>
            </div>
          )}
          {detail.duration && (
            <div className="glass-sm p-3 flex items-center gap-2.5">
              <Clock className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-[0.6rem] text-gray-500 uppercase tracking-wider">Durasi</p>
                <p className="text-xs text-gray-200">{detail.duration}</p>
              </div>
            </div>
          )}
          {detail.episodes && (
            <div className="glass-sm p-3 flex items-center gap-2.5">
              <Tv className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-[0.6rem] text-gray-500 uppercase tracking-wider">Episode</p>
                <p className="text-xs text-gray-200">{detail.episodes} eps</p>
              </div>
            </div>
          )}
          {detail.aired && (
            <div className="glass-sm p-3 flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-pink-400 flex-shrink-0" />
              <div>
                <p className="text-[0.6rem] text-gray-500 uppercase tracking-wider">Tayang</p>
                <p className="text-xs text-gray-200 line-clamp-1">{detail.aired}</p>
              </div>
            </div>
          )}
          {detail.producers && (
            <div className="glass-sm p-3 flex items-center gap-2.5 col-span-2">
              <Users className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[0.6rem] text-gray-500 uppercase tracking-wider">Produser</p>
                <p className="text-xs text-gray-200 line-clamp-1">{detail.producers}</p>
              </div>
            </div>
          )}
        </div>

        {/* Genres */}
        {detail.genreList?.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5 text-gray-400" />
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Genre</h3>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {detail.genreList.map(g => (
                <span key={g.genreId} className="badge-glass">{g.title}</span>
              ))}
            </div>
          </div>
        )}

        {/* Synopsis */}
        {detail.synopsis?.paragraphs?.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold text-white mb-2">Sinopsis</h3>
            <div className="glass-sm p-3">
              <div className={`text-xs text-gray-300 leading-relaxed space-y-2 ${!synopsisExpanded ? 'line-clamp-3' : ''}`}>
                {detail.synopsis.paragraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
              {detail.synopsis.paragraphs.join('').length > 150 && (
                <button
                  onClick={() => setSynopsisExpanded(!synopsisExpanded)}
                  className="flex items-center gap-1 text-indigo-400 text-xs mt-2 font-medium"
                >
                  {synopsisExpanded ? 'Lebih sedikit' : 'Selengkapnya'}
                  {synopsisExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Episode List */}
        {detail.episodeList?.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-white">Episode ({detail.episodeList.length})</h3>
            </div>
            <div className="space-y-2">
              {visibleEps.map((ep, idx) => (
                <button
                  key={ep.episodeId}
                  onClick={() => onEpisodeClick(ep.episodeId)}
                  className="w-full glass-sm flex items-center gap-3 p-3 cursor-pointer group text-left"
                  style={{ animationDelay: `${idx * 30}ms` }}
                >
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/30 transition-colors">
                    <Play className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-200 line-clamp-1">Episode {ep.eps}</p>
                    <p className="text-[0.6rem] text-gray-500">{ep.date}</p>
                  </div>
                  <Play className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                </button>
              ))}
            </div>
            {detail.episodeList.length > 10 && (
              <button
                onClick={() => setShowAllEps(!showAllEps)}
                className="w-full glass-sm mt-2 p-3 text-xs text-indigo-400 font-medium flex items-center justify-center gap-1"
              >
                {showAllEps ? 'Sembunyikan' : `Tampilkan semua (${detail.episodeList.length})`}
                {showAllEps ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        )}

        {/* Recommended */}
        {detail.recommendedAnimeList?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-white mb-3">Rekomendasi</h3>
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {detail.recommendedAnimeList.map(anime => (
                <div
                  key={anime.animeId}
                  className="w-28 flex-shrink-0 cursor-pointer group"
                  onClick={() => onAnimeClick(anime.animeId)}
                >
                  <div className="aspect-[2/3] rounded-xl overflow-hidden border border-white/8 group-hover:border-indigo-500/30 transition-all">
                    <img src={anime.poster} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                  <p className="text-[0.65rem] text-gray-300 mt-1.5 line-clamp-2 leading-tight">{anime.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
