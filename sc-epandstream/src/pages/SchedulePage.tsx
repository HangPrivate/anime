import { useEffect, useState } from 'react';
import { CalendarDays, Play } from 'lucide-react';
import { fetchSchedule, type ScheduleDay } from '../api';
import { ScheduleSkeleton } from '../components/Skeleton';

interface Props {
  onAnimeClick: (slug: string) => void;
}

const dayOrder = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function getCurrentDay(): string {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  return days[new Date().getDay()];
}

export default function SchedulePage({ onAnimeClick }: Props) {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(getCurrentDay());

  useEffect(() => {
    fetchSchedule()
      .then(data => {
        const sorted = [...data].sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
        setSchedule(sorted);
      })
      .catch(() => setError('Gagal memuat jadwal'))
      .finally(() => setLoading(false));
  }, []);

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

  if (loading) return <ScheduleSkeleton />;

  const filtered = schedule.filter(s => s.day === activeDay);

  return (
    <div className="fade-in pb-4">
      {/* Header */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays className="w-5 h-5 text-indigo-400" />
          <h1 className="text-lg font-bold text-white">Jadwal Rilis</h1>
        </div>

        {/* Day tabs */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
          {dayOrder.map(day => {
            const isActive = day === activeDay;
            const isToday = day === getCurrentDay();
            return (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'liquid-btn shadow-lg shadow-indigo-500/20'
                    : 'glass-sm text-gray-400 hover:text-white'
                }`}
              >
                {day}
                {isToday && !isActive && (
                  <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Anime list */}
      <div className="px-4 mt-3">
        {filtered.length === 0 ? (
          <div className="glass p-8 text-center">
            <CalendarDays className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Tidak ada anime untuk hari {activeDay}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered[0]?.anime_list?.map((anime, idx) => (
              <div
                key={anime.slug}
                className="glass-card flex items-center gap-3 p-3 cursor-pointer"
                onClick={() => onAnimeClick(anime.slug)}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="w-14 h-20 rounded-lg overflow-hidden flex-shrink-0 relative">
                  <img
                    src={anime.poster}
                    alt={anime.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white line-clamp-2 leading-tight">{anime.title}</h3>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="badge-glass !bg-indigo-500/15 !text-indigo-300">{activeDay}</span>
                  </div>
                </div>
                <Play className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
