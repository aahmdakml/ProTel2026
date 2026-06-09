import { useEffect, useRef, useState } from 'react';
import { Upload, Map as MapIcon, Check, Loader2, Video, ChevronDown, RefreshCw, Clapperboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/api/client';
import { videoOpsApi, VideoEntry, ParsedVideoEntry } from '@/api/gisProc';
import axios from 'axios';

interface MapVisualManagerProps {
  fieldId: string;
  initialVisualUrl?: string;
  initialBounds?: number[][];
  onSuccess: () => void;
}

export function MapVisualManager({ fieldId, initialVisualUrl, initialBounds, onSuccess }: MapVisualManagerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  // Video source selector state
  const [videos, setVideos] = useState<VideoEntry[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);

  // Parse options state
  const [frameIntervalSec, setFrameIntervalSec] = useState<number>(1);
  const [startSec, setStartSec] = useState<number>(0);
  const [endSec, setEndSec] = useState<number | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // SSE job state
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [sseStatus, setSseStatus] = useState<string>('');
  const [sseDone, setSseDone] = useState(false);
  const [sseError, setSseError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Parsed videos state
  const [parsedVideos, setParsedVideos] = useState<ParsedVideoEntry[]>([]);
  const [parsedVideosLoading, setParsedVideosLoading] = useState(false);
  const [parsedVideosError, setParsedVideosError] = useState<string | null>(null);

  const bounds = initialBounds ? JSON.stringify(initialBounds) : '[[ -6.2100, 106.8100], [-6.2110, 106.8110]]';

  const fetchVideos = async () => {
    setVideosLoading(true);
    setVideosError(null);
    try {
      const meRes = await apiClient.get('/auth/me');
      const ownerId: string = meRes.data.data.id;
      const videosRes = await videoOpsApi.getVideos(ownerId);
      setVideos(videosRes.data.video ?? []);
    } catch (err: any) {
      setVideosError(err.response?.data?.message || err.message || 'Gagal memuat video');
    } finally {
      setVideosLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleVideoSelect = async (videoId: string) => {
    setSelectedVideoId(videoId);
    setParsedVideos([]);
    setParsedVideosError(null);

    if (!videoId) return;

    const selectedVideo = videos.find((v) => v._id === videoId);
    if (!selectedVideo) return;

    setParsedVideosLoading(true);
    try {
      const meRes = await apiClient.get('/auth/me');
      const ownerId: string = meRes.data.data.id;
      const res = await videoOpsApi.getParsedVideos(ownerId, selectedVideo.filename);
      setParsedVideos(res.data.images ?? []);
    } catch (err: any) {
      setParsedVideosError(err.response?.data?.message || err.message || 'Gagal memuat parsed video');
    } finally {
      setParsedVideosLoading(false);
    }
  };

  // Cleanup EventSource on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  const subscribeToJob = (jobId: string) => {
    eventSourceRef.current?.close();
    setSseStatus('');
    setSseDone(false);
    setSseError(null);
    setActiveJobId(jobId);

    const baseUrl = import.meta.env.VITE_GISPROC_API_BASE_URI as string;
    const es = new EventSource(`${baseUrl}/api/video-ops/jobs/${jobId}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      setSseStatus(event.data);
    };

    es.addEventListener('done', (event) => {
      setSseStatus((event as MessageEvent).data || 'Selesai');
      setSseDone(true);
      es.close();
    });

    es.addEventListener('error_event', (event) => {
      setSseError((event as MessageEvent).data || 'Terjadi kesalahan pada job');
      es.close();
    });

    es.onerror = () => {
      setSseDone((done) => {
        if (!done) setSseError('Koneksi SSE terputus');
        return done;
      });
      es.close();
    };
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');

    try {
      // 1. Get presigned URL
      const { data: { data: { uploadUrl, storageKey } } } = await apiClient.post(`/fields/${fieldId}/map-visual/upload-url`, {
        filename: file.name,
        content_type: file.type
      });

      // 2. Upload to R2 directly
      await axios.put(uploadUrl, file, {
        headers: { 'Content-Type': file.type }
      });

      // 3. Finalize
      await apiClient.post(`/fields/${fieldId}/map-visual/finalize`, {
        storage_key: storageKey
      });

      // 4. Update Bounds
      let parsedBounds;
      try {
        parsedBounds = JSON.parse(bounds);
      } catch (e) {
        throw new Error('Format koordinat tidak valid. Gunakan format: [[lat, lng], [lat, lng]]');
      }

      await apiClient.patch(`/fields/${fieldId}/map-visual/bounds`, {
        bounds: parsedBounds
      });

      setFile(null);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Gagal mengupload visual');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-xl bg-muted/10">

      {/* Video Source Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Sumber Video</h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground"
            onClick={fetchVideos}
            disabled={videosLoading}
            title="Refresh daftar video"
          >
            <RefreshCw className={`h-3 w-3 ${videosLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {videosError ? (
          <p className="text-xs text-destructive">{videosError}</p>
        ) : (
          <div className="relative">
            <select
              className="w-full appearance-none border rounded-md bg-background px-3 py-2 text-sm pr-8 text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed"
              value={selectedVideoId}
              onChange={(e) => handleVideoSelect(e.target.value)}
              disabled={videosLoading || videos.length === 0}
            >
              <option value="">
                {videosLoading
                  ? 'Memuat video...'
                  : videos.length === 0
                  ? 'Tidak ada video tersedia'
                  : '-- Pilih sumber video --'}
              </option>
              {videos.map((video) => (
                <option key={video._id} value={video._id}>
                  {video.filename}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        )}

      </div>

      {/* Parse to Frames */}
      {selectedVideoId && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <Clapperboard className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Parse Video ke Frame</h3>
          </div>

          {/* Parsed videos status */}
          {parsedVideosLoading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Memeriksa hasil parse...
            </p>
          )}
          {!parsedVideosLoading && parsedVideosError && (
            <p className="text-xs text-destructive">{parsedVideosError}</p>
          )}
          {!parsedVideosLoading && parsedVideos.length > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2">
              <Check className="h-3.5 w-3.5 text-green-600 shrink-0" />
              <p className="text-xs text-green-700 dark:text-green-400">
                Video sudah diparsing — <span className="font-semibold">{parsedVideos.reduce((sum, entry) => sum + entry.imageFrames.length, 0)} frame</span> tersedia
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {/* Frame Interval in Seconds */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Interval Frame (detik)</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={frameIntervalSec}
                onChange={(e) => setFrameIntervalSec(parseFloat(e.target.value))}
                className="border rounded-md bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Start Second */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Mulai (detik)</label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline leading-none"
                  onClick={() => setStartSec(0)}
                >
                  Dari Awal
                </button>
              </div>
              <input
                type="number"
                min={0}
                step={1}
                value={startSec}
                onChange={(e) => setStartSec(parseFloat(e.target.value))}
                className="border rounded-md bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* End Second */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Akhir (detik)</label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline leading-none"
                  onClick={() => setEndSec(null)}
                >
                  Sampai Akhir
                </button>
              </div>
              <input
                type="number"
                min={0}
                step={1}
                value={endSec ?? ''}
                placeholder="Sampai akhir"
                onChange={(e) => setEndSec(e.target.value === '' ? null : parseFloat(e.target.value))}
                className="border rounded-md bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {parseError && <p className="text-xs text-destructive">{parseError}</p>}

          {/* SSE Progress Panel — shown while a job is active */}
          {activeJobId && (
            <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                {!sseDone && !sseError && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    <p className="text-xs text-foreground flex-1 truncate">
                      {sseStatus || 'Menunggu...'}
                    </p>
                  </>
                )}
                {sseDone && (
                  <>
                    <Check className="h-4 w-4 text-green-600 shrink-0" />
                    <p className="text-xs text-green-600 font-medium flex-1">
                      {sseStatus || 'Selesai'}
                    </p>
                  </>
                )}
                {sseError && (
                  <p className="text-xs text-destructive flex-1">{sseError}</p>
                )}
              </div>

              {(sseDone || sseError) && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs"
                  onClick={() => {
                    setActiveJobId(null);
                    setSseStatus('');
                    setSseDone(false);
                    setSseError(null);
                  }}
                >
                  Parse Baru
                </Button>
              )}
            </div>
          )}

          {/* Parse button — hidden while job is active */}
          {!activeJobId && (
            <Button
              className="w-full"
              variant="secondary"
              disabled={parsing}
              onClick={async () => {
                setParseError(null);
                setParsing(true);
                try {
                  const meRes = await apiClient.get('/auth/me');
                  const ownerId: string = meRes.data.data.id;

                  const selectedVideo = videos.find((v) => v._id === selectedVideoId);
                  if (!selectedVideo) throw new Error('Video tidak ditemukan');

                  const frameInterval = Math.round(frameIntervalSec * selectedVideo.fps);

                  const res = await videoOpsApi.parseVideo({
                    owner_id: ownerId,
                    filename: selectedVideo.filename,
                    frame_interval: frameInterval,
                    start: startSec,
                    end: endSec,
                  });

                  const jobId: string = res.data.job_id;
                  subscribeToJob(jobId);
                } catch (err: any) {
                  setParseError(err.response?.data?.message || err.message || 'Gagal parse video');
                } finally {
                  setParsing(false);
                }
              }}
            >
              {parsing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clapperboard className="h-4 w-4 mr-2" />}
              Parse ke Frame
            </Button>
          )}
        </div>
      )}

      <div className="border-t border-border/50" />

      {/* Drone Imagery (2D Visual) */}
      <div className="flex items-center gap-2 mb-2">
        <MapIcon className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm">Drone Imagery (2D Visual)</h3>
      </div>

      {initialVisualUrl && !file && (
        <div className="relative aspect-video rounded-lg overflow-hidden border bg-background group">
          <img src={initialVisualUrl} alt="Map Visual" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button variant="secondary" size="sm" onClick={() => setFile(null)}>Ganti Gambar</Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {!initialVisualUrl || file ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/5 hover:bg-muted/10 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">
                    {file ? file.name : "Upload Orthophoto (PNG/JPG/JPEG/TIF)"}
                  </p>
                </div>
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/png,image/jpeg,image/jpg,image/tiff,image/x-tiff,.tif,.tiff"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button 
              className="w-full" 
              onClick={handleUpload} 
              disabled={!file || uploading}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
              Simpan Visual Lahan
            </Button>
          </div>
        ) : (
          <div className="flex justify-between items-center bg-background p-2 rounded border">
            <span className="text-xs font-medium text-green-600 flex items-center gap-1">
              <Check className="h-3 w-3" /> Visual Aktif
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={async () => {
              if(confirm('Hapus visual peta ini?')) {
                await apiClient.delete(`/fields/${fieldId}/map-visual`);
                onSuccess();
              }
            }}>Hapus</Button>
          </div>
        )}
      </div>
    </div>
  );
}
