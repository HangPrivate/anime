import { useState, useEffect } from 'react';
import { Home, CalendarDays, Search, Heart, Library } from 'lucide-react';
import HomePage from './pages/HomePage';
import SchedulePage from './pages/SchedulePage';
import SearchPage from './pages/SearchPage';
import FavoritesPage from './pages/FavoritesPage';
import ExplorePage from './pages/ExplorePage';
import DetailPage from './pages/DetailPage';
import WatchPage from './pages/WatchPage';
import { getFavorites } from './favorites';

type Tab = 'home' | 'schedule' | 'search' | 'favorites' | 'explore';

interface ViewState {
  type: 'tab' | 'detail' | 'watch';
  slug?: string;
  episodeId?: string;
}

interface HistoryItem {
  type: 'detail' | 'watch';
  slug?: string;
  episodeId?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [view, setView] = useState<ViewState>({ type: 'tab' });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favCount, setFavCount] = useState(getFavorites().length);

  useEffect(() => {
    const handler = () => setFavCount(getFavorites().length);
    window.addEventListener('favorites-changed', handler);
    return () => window.removeEventListener('favorites-changed', handler);
  }, []);

  const openDetail = (slug: string) => {
    if (view.type !== 'tab') {
      setHistory(prev => [...prev, { type: view.type, slug: view.slug, episodeId: view.episodeId } as HistoryItem]);
    }
    setView({ type: 'detail', slug });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openWatch = (episodeId: string) => {
    if (view.type !== 'tab') {
      setHistory(prev => [...prev, { type: view.type, slug: view.slug, episodeId: view.episodeId } as HistoryItem]);
    }
    setView({ type: 'watch', episodeId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setView({ type: prev.type, slug: prev.slug, episodeId: prev.episodeId });
    } else {
      setView({ type: 'tab' });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const switchTab = (tab: Tab) => {
    setActiveTab(tab);
    setView({ type: 'tab' });
    setHistory([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabs: { id: Tab; icon: typeof Home; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'schedule', icon: CalendarDays, label: 'Jadwal' },
    { id: 'search', icon: Search, label: 'Cari' },
    { id: 'explore', icon: Library, label: 'Explore' },
    { id: 'favorites', icon: Heart, label: 'Favorit' },
  ];

  const showNav = view.type === 'tab';

  return (
    <div className="relative min-h-dvh flex flex-col">
      {/* Background */}
      <div className="bg-scene">
        <div
          className="absolute w-[300px] h-[300px] rounded-full opacity-60"
          style={{
            background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
            top: '40%',
            right: '20%',
            animation: 'float-orb 18s ease-in-out infinite 5s',
          }}
        />
      </div>

      {/* Header */}
      {showNav && (
        <header className="sticky top-0 z-30 glass-nav px-4 py-3 !border-t-0 !border-b border-b-white/[0.06] !rounded-none">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" fill="white" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold text-white tracking-tight">AniWave</h1>
                <p className="text-[0.55rem] text-gray-500 -mt-0.5">Anime Streaming</p>
              </div>
            </div>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={`flex-1 relative z-10 max-w-2xl mx-auto w-full ${showNav ? 'pb-20' : ''}`}>
        {view.type === 'detail' && view.slug && (
          <DetailPage
            slug={view.slug}
            onBack={goBack}
            onAnimeClick={openDetail}
            onEpisodeClick={openWatch}
          />
        )}
        {view.type === 'watch' && view.episodeId && (
          <WatchPage
            episodeId={view.episodeId}
            onBack={goBack}
            onEpisodeChange={openWatch}
            onAnimeClick={openDetail}
          />
        )}
        {view.type === 'tab' && (
          <>
            {activeTab === 'home' && <HomePage onAnimeClick={openDetail} />}
            {activeTab === 'schedule' && <SchedulePage onAnimeClick={openDetail} />}
            {activeTab === 'search' && <SearchPage onAnimeClick={openDetail} />}
            {activeTab === 'favorites' && <FavoritesPage onAnimeClick={openDetail} />}
            {activeTab === 'explore' && <ExplorePage onAnimeClick={openDetail} />}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      {showNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 glass-nav safe-area-bottom">
          <div className="max-w-2xl mx-auto flex">
            {tabs.map(tab => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => switchTab(tab.id)}
                  className={`flex-1 flex flex-col items-center justify-center py-2.5 pt-3 transition-all relative ${
                    isActive ? 'text-indigo-400' : 'text-gray-500'
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-indigo-400" />
                  )}
                  <span className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : ''}`} />
                    {tab.id === 'favorites' && favCount > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] rounded-full bg-rose-500 text-white text-[0.5rem] font-bold flex items-center justify-center px-1 border border-[#07070f]">
                        {favCount > 99 ? '99+' : favCount}
                      </span>
                    )}
                  </span>
                  <span className={`text-[0.6rem] mt-1 font-medium ${isActive ? 'text-indigo-400' : ''}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
