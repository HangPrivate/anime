import { useEffect, useState } from 'react';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Play, Download,
  Clock, Tag, Monitor, Server, Loader2, ExternalLink, ChevronDown
} from 'lucide-react';
import { fetchEpisode, fetchServer, type EpisodeData } from '../api';

interface Props {
  episodeId: string;
  onBack: () => void;
  onEpisodeChange: (episodeId: string) => void;
  onAnimeClick: (slug: string) => void;
}

export default function WatchPage({ episodeId, onBack, onEpisodeChange, onAnimeClick }: Props) {
  const [data, setData] = useState<EpisodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [streamUrl, setStreamUrl] = useState('');
  const [, setActiveQuality] = useState('');
  const [activeServer, setActiveServer] = useState('');
  const [loadingServer, setLoadingServer] = useState(false);
  const [showDownloads, setShowDownloads] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    setStreamUrl('');
    setActiveQuality('');
    setActiveServer('');
    window.scrollTo(0, 0);

    fetchEpisode(episodeId)
      .then(ep => {
        setData(ep);
        if (ep.defaultStreamingUrl) {
          setStreamUrl(ep.defaultStreamingUrl);
        }
        // Set default quality and server
        const qualities = ep.server?.qualities || [];
        const firstQualityWithServers = qualities.find(q => q.serverList.length > 0);
        if (firstQualityWithServers) {
          setActiveQuality(firstQualityWithServers.title);
          setActiveServer(firstQualityWithServers.serverList[0].serverId);
        }
      })
      .catch(() => setError('Gagal memuat episode'))
      .finally(() => setLoading(false));
  }, [episodeId]);

  const handleServerChange = async (serverId: string, quality: string) => {
    setActiveServer(serverId);
    setActiveQuality(quality);
    setLoadingServer(true);
    try {
      const serverData = await fetchServer(serverId);
      if (serverData.url) {
        setStreamUrl(serverData.url);
      }
    } catch {
      // Keep current stream
    }
    setLoadingServer(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] fade-in">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
        <p className="text-gray-400 text-sm mt-3">Memuat episode...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 fade-in">
        <div className="glass p-6 text-center max-w-xs">
          <p className="text-gray-400 text-sm">{error || 'Episode tidak ditemukan'}</p>
          <button onClick={onBack} className="liquid-btn px-4 py-2 mt-4 text-sm">
            Kembali
          </button>
        </div>
      </div>
    );
  }

  const qualities = data.server?.qualities?.filter(q => q.serverList.length > 0) || [];

  return (
    <div className="fade-in pb-6">
      {/* Video Player */}
      <div className="relative bg-black">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 z-20 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-xs text-white/70 font-medium truncate max-w-[200px]">
            {data.title}
          </span>
          <div className="w-9" />
        </div>

        {/* Video iframe */}
        <div className="relative w-full aspect-video bg-gray-900">
          {loadingServer && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
              <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            </div>
          )}
          {streamUrl ? (
            <iframe
              src={streamUrl}
              className="w-full h-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Play className="w-12 h-12 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">Pilih server untuk memutar</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Episode Navigation */}
      <div className="flex items-center justify-between px-4 py-3 glass-sm mx-4 mt-3 rounded-xl">
        <button
          onClick={() => data.prevEpisode && onEpisodeChange(data.prevEpisode.episodeId)}
          disabled={!data.hasPrevEpisode}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            data.hasPrevEpisode
              ? 'bg-indigo-500/15 text-indigo-300 active:scale-95'
              : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Prev
        </button>
        
        <button
          onClick={() => onAnimeClick(data.animeId)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-gray-300 text-xs font-medium"
        >
          <Monitor className="w-3.5 h-3.5" />
          Detail Anime
        </button>

        <button
          onClick={() => data.nextEpisode && onEpisodeChange(data.nextEpisode.episodeId)}
          disabled={!data.hasNextEpisode}
          className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
            data.hasNextEpisode
              ? 'bg-indigo-500/15 text-indigo-300 active:scale-95'
              : 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
          }`}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 mt-4">
        {/* Title & Info */}
        <h1 className="text-base font-bold text-white leading-tight">{data.title}</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
          {data.releaseTime && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {data.releaseTime}
            </span>
          )}
          {data.info?.duration && (
            <span className="flex items-center gap-1">
              <Play className="w-3 h-3" />
              {data.info.duration}
            </span>
          )}
          {data.info?.type && (
            <span className="badge-glass">{data.info.type}</span>
          )}
        </div>

        {/* Genres */}
        {data.info?.genreList?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {data.info.genreList.map(g => (
              <span key={g.genreId} className="badge-glass text-[0.6rem]">
                {g.title}
              </span>
            ))}
          </div>
        )}

        {/* Server Selection */}
        {qualities.length > 0 && (
          <div className="mt-5">
            <div className="flex items-center gap-1.5 mb-3">
              <Server className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Pilih Server</h3>
            </div>

            {qualities.map(quality => (
              <div key={quality.title} className="mb-3">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                  <Monitor className="w-3 h-3" />
                  {quality.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {quality.serverList.map(server => {
                    const isActive = activeServer === server.serverId;
                    return (
                      <button
                        key={server.serverId}
                        onClick={() => handleServerChange(server.serverId, quality.title)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                          isActive
                            ? 'liquid-btn shadow-lg shadow-indigo-500/20'
                            : 'glass-sm text-gray-300 hover:text-white'
                        }`}
                      >
                        {server.title.trim()}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Download Section */}
        {data.downloadUrl?.qualities?.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setShowDownloads(!showDownloads)}
              className="flex items-center justify-between w-full glass-sm p-3 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">Download</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showDownloads ? 'rotate-180' : ''}`} />
            </button>

            {showDownloads && (
              <div className="mt-2 space-y-3 slide-up">
                {data.downloadUrl.qualities.map(quality => (
                  <div key={quality.title} className="glass-sm p-3 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-white">{quality.title}</span>
                      <span className="text-[0.6rem] text-gray-500">{quality.size}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {quality.urls.map(dl => (
                        <a
                          key={dl.title}
                          href={dl.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[0.65rem] font-medium hover:bg-emerald-500/20 transition-colors"
                        >
                          {dl.title}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Episode List */}
        {data.info?.episodeList?.length > 0 && (
          <div className="mt-5">
            <button
              onClick={() => setShowEpisodes(!showEpisodes)}
              className="flex items-center justify-between w-full glass-sm p-3 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Episode Lainnya ({data.info.episodeList.length})</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showEpisodes ? 'rotate-180' : ''}`} />
            </button>

            {showEpisodes && (
              <div className="mt-2 grid grid-cols-5 sm:grid-cols-8 gap-2 slide-up">
                {data.info.episodeList.map(ep => {
                  const isCurrent = ep.episodeId === episodeId;
                  return (
                    <button
                      key={ep.episodeId}
                      onClick={() => !isCurrent && onEpisodeChange(ep.episodeId)}
                      className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                        isCurrent
                          ? 'liquid-btn'
                          : 'glass-sm text-gray-300 hover:text-white active:scale-95'
                      }`}
                    >
                      {ep.eps}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Credit */}
        {(data.info?.credit || data.info?.encoder) && (
          <div className="mt-5 glass-sm p-3 rounded-xl">
            <div className="flex items-center gap-1.5 mb-1">
              <Tag className="w-3 h-3 text-gray-500" />
              <span className="text-[0.6rem] text-gray-500 uppercase tracking-wider">Credit</span>
            </div>
            <p className="text-xs text-gray-300">
              {data.info.credit && `Credit: ${data.info.credit}`}
              {data.info.credit && data.info.encoder && ' · '}
              {data.info.encoder && `Encoder: ${data.info.encoder}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
