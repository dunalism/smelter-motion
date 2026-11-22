import { useEffect, useMemo, useRef } from 'react';
import { Check, RotateCcw, ShieldCheck, Stamp, X } from 'lucide-react';
import type {
  PalettePreset,
  ProjectState,
  WatermarkPlatform,
  WatermarkSettings,
} from '../types/studio';
import {
  DEFAULT_WATERMARK_SETTINGS,
  normalizeWatermarkSettings,
  renderWatermarkPreviewFrame,
  WATERMARK_PLATFORMS,
  WATERMARK_PLATFORM_META,
  WATERMARK_POSITION_OPTIONS,
} from '../engine/watermarkRenderer';

interface WatermarkModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  palette: PalettePreset;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
}

function PlatformIconSvg({ platform }: { platform: WatermarkPlatform }) {
  if (platform === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <defs>
          <linearGradient id="wm-ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F58529" />
            <stop offset="50%" stopColor="#DD2A7B" />
            <stop offset="100%" stopColor="#515BD4" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#wm-ig-grad)" />
        <rect
          x="6.2"
          y="6.2"
          width="11.6"
          height="11.6"
          rx="3.2"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="2.8" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
        <circle cx="15.8" cy="8.2" r="1" fill="#FFFFFF" />
      </svg>
    );
  }
  if (platform === 'youtube') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="4" fill="#FF0000" />
        <polygon points="10,8.8 16,12 10,15.2" fill="#FFFFFF" />
      </svg>
    );
  }
  if (platform === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
        <rect x="2" y="2" width="20" height="20" rx="5" fill="#0B0E14" stroke="#263042" />
        <path
          d="M13.5 6.5v7.6a2.6 2.6 0 1 1-2-2.53"
          fill="none"
          stroke="#25F4EE"
          strokeWidth="2"
          strokeLinecap="round"
          transform="translate(-0.7, -0.5)"
        />
        <path
          d="M13.5 6.5v7.6a2.6 2.6 0 1 1-2-2.53"
          fill="none"
          stroke="#FE2C55"
          strokeWidth="2"
          strokeLinecap="round"
          transform="translate(0.7, 0.5)"
        />
        <path
          d="M13.5 6.5v7.6a2.6 2.6 0 1 1-2-2.53M13.5 6.5c.6 1.7 1.9 2.7 3.6 2.9"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" fill="#1877F2" />
      <path
        d="M13.2 19v-6.2h2.1l.3-2.4h-2.4V8.9c0-.7.2-1.2 1.2-1.2h1.3V5.5c-.3 0-1.1-.1-2-.1-2 0-3.3 1.2-3.3 3.4v1.6H8.3v2.4h2.1V19h2.8z"
        fill="#FFFFFF"
      />
    </svg>
  );
}

export function WatermarkModal({
  isOpen,
  onClose,
  project,
  palette,
  onUpdateProject,
}: WatermarkModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const wm = useMemo(
    () => normalizeWatermarkSettings(project.watermark),
    [project.watermark]
  );

  const previewDims = useMemo(() => {
    if (project.aspectRatio === '16:9') return { w: 360, h: 202 };
    if (project.aspectRatio === '1:1') return { w: 280, h: 280 };
    return { w: 230, h: 408 };
  }, [project.aspectRatio]);

  const updateWatermark = (updater: (prev: WatermarkSettings) => WatermarkSettings) => {
    onUpdateProject((prev) => {
      const base = normalizeWatermarkSettings(prev.watermark);
      return {
        ...prev,
        watermark: updater(base),
      };
    });
  };

  const togglePlatform = (platform: WatermarkPlatform) => {
    updateWatermark((prev) => {
      const exists = prev.platforms.includes(platform);
      const nextPlatforms = exists
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform];
      return {
        ...prev,
        enabled: nextPlatforms.length > 0 ? true : prev.enabled,
        platforms: nextPlatforms,
      };
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    canvas.width = previewDims.w * dpr;
    canvas.height = previewDims.h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    renderWatermarkPreviewFrame(ctx, previewDims.w, previewDims.h, wm, palette);
  }, [isOpen, previewDims.w, previewDims.h, wm, palette]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Pengaturan Watermark"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-[#0F141F] border border-[#242E42] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E2738] bg-[#121826]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/35 flex items-center justify-center text-sky-300">
              <Stamp className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Watermark &amp; Logo Sosial Media
              </h2>
              <p className="text-[11px] text-slate-400">
                Pilih satu atau beberapa logo sekaligus di area aman tepi kanvas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan watermark"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1E2738] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-5 p-5">
          {/* Left: Live Safe-Zone Preview */}
          <div className="md:col-span-5 flex flex-col items-center justify-center bg-[#090C12] border border-[#1E2738] rounded-xl p-4">
            <div className="w-full flex items-center justify-between text-[11px] text-slate-400 mb-3">
              <span>Preview Posisi ({project.aspectRatio})</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  wm.enabled && wm.platforms.length > 0
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {wm.enabled && wm.platforms.length > 0 ? 'Aktif' : 'Nonaktif'}
              </span>
            </div>

            <div className="relative rounded-lg overflow-hidden border border-[#242E42] shadow-xl">
              <canvas
                ref={canvasRef}
                style={{ width: previewDims.w, height: previewDims.h }}
                className="block max-w-full h-auto"
              />
            </div>

            <div className="mt-3 flex items-start gap-2 text-[11px] text-slate-400 bg-[#111723] border border-[#1E2738] rounded-lg px-3 py-2 w-full">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Watermark ditempatkan di area aman pojok kanvas dengan transparansi lembut agar tidak menghalangi animasi utama maupun subtitle.
              </span>
            </div>
          </div>

          {/* Right: Controls */}
          <div className="md:col-span-7 flex flex-col gap-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between bg-[#121826] border border-[#222C40] rounded-xl px-4 py-3">
              <div>
                <div className="text-xs font-semibold text-white">Tampilkan Watermark</div>
                <div className="text-[11px] text-slate-400">
                  Ikut dirender di preview &amp; hasil export MP4
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={wm.enabled}
                onClick={() =>
                  updateWatermark((prev) => ({
                    ...prev,
                    enabled: !prev.enabled,
                    platforms:
                      !prev.enabled && prev.platforms.length === 0
                        ? ['instagram']
                        : prev.platforms,
                  }))
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  wm.enabled ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    wm.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {/* Multi-select Platform Logos */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-200">
                  Logo Platform ({wm.platforms.length} dipilih)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateWatermark((prev) => ({
                        ...prev,
                        enabled: true,
                        platforms: [...WATERMARK_PLATFORMS],
                      }))
                    }
                    className="text-[11px] text-sky-400 hover:text-sky-300"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() =>
                      updateWatermark(() => ({
                        ...DEFAULT_WATERMARK_SETTINGS,
                        enabled: true,
                      }))
                    }
                    className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {WATERMARK_PLATFORMS.map((platform) => {
                  const meta = WATERMARK_PLATFORM_META[platform];
                  const selected = wm.platforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      aria-pressed={selected}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-all ${
                        selected
                          ? 'border-sky-400 bg-sky-500/10 text-white'
                          : 'border-[#222C40] bg-[#0B0E14] text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <PlatformIconSvg platform={platform} />
                        <span className="text-xs font-semibold">{meta.label}</span>
                      </span>
                      <span
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          selected
                            ? 'bg-sky-500 border-sky-400 text-slate-950'
                            : 'border-slate-600 bg-transparent'
                        }`}
                      >
                        {selected && <Check className="w-3 h-3 stroke-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Handle / Brand Text */}
            <div>
              <label
                htmlFor="watermark-text-input"
                className="block text-xs font-semibold text-slate-200 mb-1.5"
              >
                Nama Akun / Handle (Opsional)
              </label>
              <input
                id="watermark-text-input"
                type="text"
                maxLength={28}
                value={wm.text ?? ''}
                onChange={(e) =>
                  updateWatermark((prev) => ({
                    ...prev,
                    text: e.target.value,
                  }))
                }
                placeholder="Contoh: @gerakcanvas"
                className="w-full bg-[#0B0E14] border border-[#242E42] rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Position Selector (Corner Safe Zones) */}
            <div>
              <span className="block text-xs font-semibold text-slate-200 mb-2">
                Posisi Area Aman
              </span>
              <div className="grid grid-cols-2 gap-2">
                {WATERMARK_POSITION_OPTIONS.map((opt) => {
                  const active = wm.position === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        updateWatermark((prev) => ({
                          ...prev,
                          position: opt.id,
                        }))
                      }
                      className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-all ${
                        active
                          ? 'border-sky-400 bg-sky-500/15 text-sky-200'
                          : 'border-[#222C40] bg-[#0B0E14] text-slate-400 hover:text-slate-200 hover:border-slate-500/60'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opacity & Size Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#121826] border border-[#222C40] rounded-xl p-3.5">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-300 font-medium">Transparansi</span>
                  <span className="font-mono text-sky-300">{Math.round(wm.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  aria-label="Transparansi watermark"
                  min={20}
                  max={95}
                  step={5}
                  value={Math.round(wm.opacity * 100)}
                  onChange={(e) =>
                    updateWatermark((prev) => ({
                      ...prev,
                      opacity: Number(e.target.value) / 100,
                    }))
                  }
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-slate-300 font-medium">Ukuran Logo</span>
                  <span className="font-mono text-sky-300">{wm.scale.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  aria-label="Ukuran watermark"
                  min={70}
                  max={135}
                  step={5}
                  value={Math.round(wm.scale * 100)}
                  onChange={(e) =>
                    updateWatermark((prev) => ({
                      ...prev,
                      scale: Number(e.target.value) / 100,
                    }))
                  }
                  className="w-full accent-sky-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#1E2738] bg-[#121826]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs transition-colors"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}


