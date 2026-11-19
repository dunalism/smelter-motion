import { useEffect, useRef, useState } from 'react';
import type { ProjectState } from '../types/studio';
import { formatTimecode, getCanvasDimensions, getTotalDuration } from '../engine/motionMath';
import { buildExportFileName } from '../engine/mp4ExportHelpers';
import { exportProjectVideo, type ExportProgress, type ExportResult } from '../engine/videoExporter';
import { Download, Film, Loader2, X } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
}

export function ExportModal({ isOpen, onClose, project }: ExportModalProps) {
  const [fps, setFps] = useState<number>(30);
  const [includeAudio, setIncludeAudio] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  if (!isOpen) return null;

  const dims = getCanvasDimensions(project.aspectRatio);
  const totalSec = getTotalDuration(project.scenes);

  const handleStartExport = async () => {
    setErrorMsg(null);
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
      setResultUrl(null);
    }
    setResult(null);
    setIsExporting(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await exportProjectVideo({
        project,
        fps,
        includeAudio,
        onProgress: setProgress,
        signal: controller.signal,
      });
      const url = URL.createObjectURL(res.blob);
      setResult(res);
      setResultUrl(url);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengekspor video.');
    } finally {
      setIsExporting(false);
      abortRef.current = null;
    }
  };

  const handleCancelOrClose = () => {
    if (isExporting && abortRef.current) {
      abortRef.current.abort();
      setIsExporting(false);
    }
    onClose();
  };

  const fileName = buildExportFileName(project.title);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div className="w-full max-w-lg bg-[#121722] border border-[#263044] rounded-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-[#222A3A] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Film className="w-5 h-5 text-sky-400" aria-hidden="true" />
            <h2 id="export-modal-title" className="font-display text-lg font-semibold text-white">
              Eksport Video MP4
            </h2>
          </div>
          <button
            type="button"
            onClick={handleCancelOrClose}
            aria-label="Tutup dialog ekspor"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1A2233]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-4 gap-3 text-center bg-[#0B0E14] border border-[#222A3A] rounded-lg p-3">
            <div>
              <div className="text-[11px] text-slate-400">Resolusi</div>
              <div className="font-mono text-sm font-semibold text-white tabular-nums mt-0.5">
                {dims.width}×{dims.height}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Scene</div>
              <div className="font-mono text-sm font-semibold text-white tabular-nums mt-0.5">
                {project.scenes.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Durasi</div>
              <div className="font-mono text-sm font-semibold text-white tabular-nums mt-0.5">
                {formatTimecode(totalSec)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Format</div>
              <div className="font-mono text-sm font-semibold text-sky-400 mt-0.5">
                MP4
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="export-fps" className="block text-xs font-medium text-slate-300 mb-1.5">
                Frame Rate (FPS)
              </label>
              <select
                id="export-fps"
                disabled={isExporting}
                value={fps}
                onChange={(e) => setFps(Number(e.target.value))}
                className="w-full bg-[#0B0E14] border border-[#2A3346] rounded-lg px-3 py-2 text-sm text-white tabular-nums"
              >
                <option value={30}>30 FPS (Stabil)</option>
                <option value={60}>60 FPS (Halus)</option>
              </select>
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  disabled={isExporting}
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-[#0B0E14] text-sky-500"
                />
                <span>Sertakan Suara &amp; SFX</span>
              </label>
            </div>
          </div>

          {isExporting && progress && (
            <div className="space-y-2 bg-[#0B0E14] border border-[#222A3A] rounded-lg p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-medium">
                  {progress.phase === 'preparing'
                    ? 'Menyiapkan kanvas & audio...'
                    : progress.phase === 'converting'
                      ? 'Mengonversi ke format MP4 (H.264)...'
                      : progress.phase === 'finalizing'
                        ? 'Menyelesaikan berkas MP4...'
                        : 'Merender frame video MP4...'}
                </span>
                <span className="font-mono text-sky-400 tabular-nums">{progress.percent}%</span>
              </div>
              <div className="h-2 rounded-full bg-[#192132] overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-150"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="text-[11px] font-mono text-slate-400 tabular-nums">
                {formatTimecode(progress.currentSec)} / {formatTimecode(progress.totalSec)}
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg bg-rose-950/50 border border-rose-500/40 px-4 py-3 text-xs text-rose-200"
            >
              {errorMsg}
            </div>
          )}

          {result && resultUrl && (
            <div className="space-y-3 bg-[#0B0E14] border border-emerald-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between text-xs text-emerald-300">
                <span>Video MP4 selesai dirender ({(result.blob.size / (1024 * 1024)).toFixed(2)} MB)</span>
                <span className="font-mono uppercase">{result.extension}</span>
              </div>
              <video
                controls
                src={resultUrl}
                className="w-full max-h-56 rounded-md bg-black"
              />
              <a
                href={resultUrl}
                download={fileName}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition-colors"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Unduh Video (.mp4)</span>
              </a>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-[#222A3A] flex items-center justify-end gap-3 bg-[#0F141D]">
          <button
            type="button"
            onClick={handleCancelOrClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white"
          >
            {isExporting ? 'Batalkan' : 'Tutup'}
          </button>
          <button
            type="button"
            onClick={handleStartExport}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold text-sm hover:bg-sky-400 disabled:opacity-50"
          >
            {isExporting && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
            <span>{isExporting ? 'Merender MP4...' : 'Mulai Render MP4'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
