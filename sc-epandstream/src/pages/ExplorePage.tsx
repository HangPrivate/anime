import { useEffect, useState, useMemo } from 'react';
import { Library, Search, ChevronRight, Loader2 } from 'lucide-react';
import { fetchUnlimited, type UnlimitedItem } from '../api';

interface Props {
  onAnimeClick: (slug: string) => void;
}

export default function ExplorePage({ onAnimeClick }: Props) {
  const [data, setData] = useState<UnlimitedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchUnlimited()
      .then(d => {
        setData(d);
        if (d.length > 0) setActiveLetter(d[0].startWith);
      })
      .catch(() => setError('Gagal memuat data'))
      .finally(() => setLoading(false));
  }, []);

  const filteredList = useMemo(() => {
    if (!activeLetter) return [];
    const group = data.find(g => g.startWith === activeLetter);
    if (!group) return [];
    if (!filter.trim()) return group.animeList;
    return group.animeList.filter(a =>
      a.title.toLowerCase().includes(filter.toLowerCase())
    );
  }, [data, activeLetter, filter]);

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fade-in pb-4">
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <Library className="w-5 h-5 text-indigo-400" />
          <h1 className="text-lg font-bold text-white">Daftar Anime</h1>
        </div>

        {/* Filter */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder="Filter di grup ini..."
            className="glass-input w-full pl-9 pr-4 py-2.5 text-xs"
          />
        </div>

        {/* Letter tabs */}
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-2">
          {data.map(group => (
            <button
              key={group.startWith}
              onClick={() => { setActiveLetter(group.startWith); setFilter(''); }}
              className={`w-9 h-9 flex-shrink-0 rounded-lg text-xs font-bold transition-all flex items-center justify-center ${
                activeLetter === group.startWith
                  ? 'liquid-btn'
                  : 'glass-sm text-gray-400 hover:text-white'
              }`}
            >
              {group.startWith}
            </button>
          ))}
        </div>
      </div>

      {/* Anime List */}
      <div className="px-4 mt-2 space-y-1.5">
        {filteredList.length === 0 ? (
          <div className="glass p-8 text-center">
            <Library className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-500 text-xs">Tidak ada anime ditemukan</p>
          </div>
        ) : (
          filteredList.map((anime, idx) => (
            <div
              key={anime.animeId}
              className="glass-sm flex items-center gap-3 p-3 cursor-pointer hover:bg-white/[0.06] transition-colors active:scale-[0.99]"
              onClick={() => onAnimeClick(anime.animeId)}
              style={{ animationDelay: `${Math.min(idx * 20, 300)}ms` }}
            >
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[0.6rem] font-bold text-indigo-400">{(idx + 1).toString().padStart(2, '0')}</span>
              </div>
              <p className="flex-1 text-xs text-gray-200 line-clamp-1">{anime.title}</p>
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
            </div>
          ))
        )}
        <p className="text-center text-[0.6rem] text-gray-600 pt-2">
          {filteredList.length} anime
        </p>
      </div>
    </div>
  );
}
