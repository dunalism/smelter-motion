import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Pause, Play, RotateCcw, Volume2, X } from 'lucide-react';
import type {
  PalettePreset,
  ProjectState,
  SubtitleSettings,
} from '../types/studio';
import {
  getSubtitleStyleDef,
  resolveSubtitleConfig,
  SUBTITLE_STYLES,
  type SubtitleStyleDefinition,
} from '../engine/subtitleConfig';
import { renderSubtitlePreviewFrame } from '../engine/subtitleRenderer';

interface SubtitleStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectState;
  palette: PalettePreset;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
}

function StyleCard({
  styleDef,
  isActive,
  onSelect,
}: {
  styleDef: SubtitleStyleDefinition;
  isActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative text-left rounded-xl border p-2.5 transition-all ${
        isActive
          ? 'border-sky-400 bg-sky-500/10 ring-1 ring-sky-400/50'
          : 'border-[#242D3F] bg-[#0D121C] hover:border-slate-500/70 hover:bg-[#131A28]'
      }`}
    >
      {isActive && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-sky-500 text-slate-950 flex items-center justify-center">
          <Check className="w-2.5 h-2.5 stroke-3" />
        </span>
      )}

      <div
        style={{ backgroundColor: styleDef.previewBg }}
        className="h-11 rounded-lg border border-[#1E293B] flex items-center justify-center px-2 overflow-hidden mb-2"
      >
        <span
          style={{
            fontFamily: styleDef.fontFamily,
            fontWeight: styleDef.fontWeight,
            fontStyle: styleDef.fontStyle || 'normal',
            color: styleDef.textColor,
            backgroundColor: styleDef.previewTextBg,
            borderRadius: styleDef.previewTextBg ? 5 : undefined,
            padding: styleDef.previewTextBg ? '2px 8px' : undefined,
            textTransform: styleDef.textTransform,
            textDecoration:
              styleDef.id === 'garis_bawah' || styleDef.id === 'tulisan_tangan'
                ? `underline ${styleDef.accentColor}`
                : undefined,
            border:
              styleDef.id === 'neon'
                ? `1px solid ${styleDef.accentColor}`
                : undefined,
          }}
          className="text-[12px] leading-tight truncate max-w-full"
        >
          Kata <span style={{ color: styleDef.accentColor }}>Kunci</span>
        </span>
      </div>

      <div className="text-xs font-semibold text-slate-100 truncate pr-4">
        {styleDef.name}
      </div>
      <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
        {styleDef.description}
      </div>
    </button>
  );
}

export function SubtitleStudioModal({
  isOpen,
  onClose,
  project,
  palette,
  onUpdateProject,
}: SubtitleStudioModalProps) {
  const sampleScene = project.scenes[0];
  const previewText =
    sampleScene?.narration ||
    'Kita bantu kamu bedah isi kepala, supaya langkah kamu ke depan jadi lebih jelas.';
  const previewEmphasis = sampleScene?.emphasis || '';
  const previewDuration = Math.max(
    1.5,
    sampleScene?.audio?.durationSec || sampleScene?.durationSec || 4.0
  );

  const [isPlaying, setIsPlaying] = useState(true);
  const [previewTime, setPreviewTime] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const resolved = useMemo(
    () => resolveSubtitleConfig(project.subtitles, palette),
    [project.subtitles, palette]
  );

  const activeStyleDef = getSubtitleStyleDef(project.subtitles.style);

  const updateSubtitles = (updater: (prev: SubtitleSettings) => SubtitleSettings) => {
    onUpdateProject((prev) => ({
      ...prev,
      subtitles: updater(prev.subtitles),
    }));
  };

  useEffect(() => {
    if (!isOpen || !isPlaying) return;
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;
      setPreviewTime((prev) => {
        const next = prev + dt;
        return next >= previewDuration ? 0 : next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, isPlaying, previewDuration]);

  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderSubtitlePreviewFrame(
      ctx,
      canvas.width,
      canvas.height,
      previewText,
      project.subtitles,
      previewTime,
      previewDuration,
      previewEmphasis,
      palette,
      sampleScene?.audio?.dataUrl,
      sampleScene?.audio?.durationSec
    );
  }, [
    isOpen,
    previewTime,
    previewDuration,
    previewText,
    previewEmphasis,
    project.subtitles,
    palette,
    sampleScene?.audio?.dataUrl,
    sampleScene?.audio?.durationSec,
  ]);

  if (!isOpen) return null;

  const accentSwatches = [
    activeStyleDef.accentColor,
    palette.accent,
    palette.primary,
    '#FACC15',
    '#F97316',
    '#38BDF8',
    '#22D3EE',
    '#12A37F',
  ].filter((v, idx, arr) => v && arr.indexOf(v) === idx);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Pilih Gaya Subtitle"
    >
      <div className="w-full max-w-5xl max-h-[92vh] bg-[#0F141F] border border-[#242E42] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <header className="px-5 py-3.5 border-b border-[#1E2636] flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-display font-semibold text-white">
              Gaya Subtitle
            </h2>
            <p className="text-xs text-slate-400">
              Pilih gaya subtitle — tempo kata otomatis mengikuti suara narasi.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal subtitle"
            className="p-1.5 rounded-lg border border-[#263042] text-slate-400 hover:text-white hover:bg-[#182030]"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-[#090C14] border border-[#1E2636] rounded-xl p-3 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-medium text-slate-200">
                  Preview: {activeStyleDef.name}
                </span>
                {sampleScene?.audio?.dataUrl && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                    <Volume2 className="w-3 h-3" />
                    Sinkron Audio
                  </span>
                )}
              </div>

              <div className="relative rounded-lg overflow-hidden border border-[#1D2535] bg-[#070A10] flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  width={540}
                  height={420}
                  className="w-full h-auto block"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="p-1.5 rounded-lg border border-[#263042] bg-[#131926] text-slate-200 hover:text-sky-300"
                  aria-label={isPlaying ? 'Jeda preview' : 'Putar preview'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={previewDuration}
                  step={0.02}
                  value={previewTime}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setPreviewTime(Number(e.target.value));
                  }}
                  aria-label="Waktu preview subtitle"
                  className="flex-1 accent-sky-400"
                />
                <span className="text-[11px] font-mono text-slate-400 tabular-nums w-11 text-right">
                  {previewTime.toFixed(1)}s
                </span>
              </div>
            </div>

            <div className="bg-[#0B0F18] border border-[#1E2636] rounded-xl p-3.5 space-y-3.5">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Ukuran Teks</span>
                  <span className="font-mono text-sky-300">{resolved.fontSize}px</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={44}
                  step={1}
                  value={resolved.fontSize}
                  onChange={(e) =>
                    updateSubtitles((prev) => ({
                      ...prev,
                      fontSize: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Posisi</span>
                  {activeStyleDef.hasFixedPosition && (
                    <span className="text-[10px] text-amber-300/90">
                      Otomatis sesuai gaya
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: 'bottom', label: 'Bawah' },
                      { id: 'lower-third', label: 'Agak Atas' },
                    ] as const
                  ).map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      disabled={activeStyleDef.hasFixedPosition}
                      onClick={() =>
                        updateSubtitles((prev) => ({ ...prev, position: pos.id }))
                      }
                      className={`py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-40 ${
                        project.subtitles.position === pos.id
                          ? 'bg-sky-500/15 border-sky-400 text-sky-300'
                          : 'bg-[#111723] border-[#242E42] text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-300 font-medium">Warna Aksen</span>
                  {project.subtitles.accentColor && (
                    <button
                      type="button"
                      onClick={() =>
                        updateSubtitles((prev) => ({
                          ...prev,
                          accentColor: undefined,
                        }))
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-white"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {accentSwatches.map((hex) => {
                    const active =
                      resolved.accentColor.toLowerCase() === hex.toLowerCase();
                    return (
                      <button
                        key={hex}
                        type="button"
                        onClick={() =>
                          updateSubtitles((prev) => ({ ...prev, accentColor: hex }))
                        }
                        aria-label={`Pilih warna aksen ${hex}`}
                        style={{ backgroundColor: hex }}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          active
                            ? 'border-white scale-110'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                      />
                    );
                  })}
                  <input
                    type="color"
                    value={
                      resolved.accentColor.startsWith('#')
                        ? resolved.accentColor
                        : '#38BDF8'
                    }
                    onChange={(e) =>
                      updateSubtitles((prev) => ({
                        ...prev,
                        accentColor: e.target.value,
                      }))
                    }
                    aria-label="Warna aksen kustom"
                    className="w-7 h-6 rounded cursor-pointer bg-transparent border border-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SUBTITLE_STYLES.map((styleDef) => (
                <StyleCard
                  key={styleDef.id}
                  styleDef={styleDef}
                  isActive={activeStyleDef.id === styleDef.id}
                  onSelect={() =>
                    updateSubtitles((prev) => ({
                      ...prev,
                      style: styleDef.id,
                      accentColor: undefined,
                    }))
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <footer className="px-5 py-3 border-t border-[#1E2636] flex items-center justify-end gap-2 bg-[#0B0F18]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors"
          >
            Selesai
          </button>
        </footer>
      </div>
    </div>
  );
}


