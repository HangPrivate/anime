import { useState, useRef, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { searchAnime, type AnimeItem } from '../api';
import AnimeCard from '../components/AnimeCard';

interface Props {
  onAnimeClick: (slug: string) => void;
}

export default function SearchPage({ onAnimeClick }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const doSearch = (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    searchAnime(q.trim())
      .then(setResults)
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 500);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  return (
    <div className="fade-in pb-4">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleChange(e.target.value)}
            placeholder="Cari anime..."
            className="glass-input w-full pl-10 pr-10 py-3 text-sm"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div className="px-4">
          <p className="text-xs text-gray-500 mb-3">{results.length} hasil ditemukan</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {results.map(anime => (
              <AnimeCard
                key={anime.animeId}
                animeId={anime.animeId}
                title={anime.title}
                poster={anime.poster}
                score={anime.score}
                status={anime.status}
                onClick={() => onAnimeClick(anime.animeId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="glass p-8 text-center max-w-xs">
            <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Tidak ditemukan anime untuk "{query}"</p>
            <p className="text-gray-600 text-xs mt-1">Coba kata kunci lain</p>
          </div>
        </div>
      )}

      {/* Initial state */}
      {!loading && !searched && (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="glass p-8 text-center max-w-xs">
            <Search className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Ketik untuk mencari anime</p>
            <p className="text-gray-600 text-xs mt-1">Minimal 2 karakter</p>
          </div>
        </div>
      )}
    </div>
  );
}
