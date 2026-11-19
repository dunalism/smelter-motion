import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Columns2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Type,
  Wand2,
  X,
} from 'lucide-react';
import type {
  PaletteId,
  PalettePreset,
  ProjectState,
  SubtitleAnimation,
  SubtitleDirection,
  SubtitleEasing,
  SubtitleEmphasisStyle,
  SubtitleExitAnimation,
  SubtitlePresetId,
  SubtitleSettings,
} from '../types/studio';
import {
  applySubtitlePreset,
  extractAutoEmphasisKeywords,
  FONT_FAMILY_OPTIONS,
  getRecommendedPresetForVideoStyle,
  getSubtitleStyleDef,
  resolveSubtitleConfig,
  SUBTITLE_ANIMATIONS,
  SUBTITLE_CATEGORY_LABELS,
  SUBTITLE_EASINGS,
  SUBTITLE_EMPHASIS_STYLES,
  SUBTITLE_EXIT_ANIMATIONS,
  SUBTITLE_PRESETS,
  SUBTITLE_STYLES,
  type SubtitleStyleCategory,
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

type StudioTab = 'style' | 'animation' | 'typography' | 'position';

const CATEGORY_ORDER: SubtitleStyleCategory[] = [
  'minimal-editorial',
  'modern-social',
  'kinetic',
  'creative-artistic',
  'cinematic-dramatic',
  'legacy',
];

function StyleMiniThumbnail({
  styleDef,
  isActive,
  onSelect,
}: {
  styleDef: SubtitleStyleDefinition;
  isActive: boolean;
  onSelect: () => void;
}) {
  const hasBg = styleDef.bgOpacity > 0.05;
  const bgRgba = hasBg ? styleDef.bgColor : 'transparent';

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

      {/* Visual mini preview */}
      <div className="h-12 rounded-lg bg-linear-to-br from-[#070A12] via-[#111827] to-[#1E293B] border border-[#1E293B] flex items-center justify-center px-2 overflow-hidden mb-2">
        <span
          style={{
            fontFamily: styleDef.fontFamily,
            fontWeight: styleDef.fontWeight,
            color:
              styleDef.decorMode === 'gradient' && styleDef.gradientColors
                ? styleDef.gradientColors[0]
                : styleDef.textColor,
            backgroundColor: hasBg ? bgRgba : undefined,
            borderRadius: hasBg ? Math.min(8, styleDef.borderRadius) : undefined,
            padding: hasBg ? '2px 8px' : undefined,
            border: styleDef.borderColor ? `1px solid ${styleDef.borderColor}` : undefined,
            letterSpacing: `${Math.min(1.5, styleDef.letterSpacing * 0.5)}px`,
            textTransform: styleDef.textTransform,
            textShadow:
              styleDef.outlineWidth > 0
                ? `0 1px 3px ${styleDef.outlineColor}`
                : styleDef.textShadow > 0
                  ? '0 2px 6px rgba(0,0,0,0.8)'
                  : undefined,
            textDecoration:
              styleDef.decorMode === 'minimal-underline' ||
              styleDef.decorMode === 'scribble-underline'
                ? `underline ${styleDef.emphasisColor}`
                : undefined,
          }}
          className="text-[12px] leading-tight truncate max-w-full"
        >
          Motion <span style={{ color: styleDef.emphasisColor }}>Text</span>
        </span>
      </div>

      <div className="text-xs font-semibold text-slate-100 truncate pr-4">
        {styleDef.name}
      </div>
      <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
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
  const [activeTab, setActiveTab] = useState<StudioTab>('style');
  const [activeCategory, setActiveCategory] = useState<SubtitleStyleCategory | 'all'>('all');
  const [previewText, setPreviewText] = useState(
    () =>
      project.scenes[0]?.narration ||
      'Kita bantu kamu bedah isi kepala, supaya langkah kamu ke depan jadi lebih jelas.'
  );
  const [previewEmphasis, setPreviewEmphasis] = useState(
    () => project.scenes[0]?.emphasis || 'bedah, isi kepala, lebih jelas'
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [previewTime, setPreviewTime] = useState(0);
  const [comparePresetId, setComparePresetId] = useState<SubtitlePresetId | null>(null);
  const previewDuration = 3.6;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const recommendedPresetId = useMemo(
    () => getRecommendedPresetForVideoStyle(project.paletteId as PaletteId),
    [project.paletteId]
  );

  const resolved = useMemo(
    () => resolveSubtitleConfig(project.subtitles, palette),
    [project.subtitles, palette]
  );

  const effectiveSubtitles = useMemo(() => {
    if (!comparePresetId) return project.subtitles;
    return applySubtitlePreset(project.subtitles, comparePresetId);
  }, [project.subtitles, comparePresetId]);

  const updateSubtitles = (updater: (prev: SubtitleSettings) => SubtitleSettings) => {
    setComparePresetId(null);
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
      const dt = (now - lastTs) / 1000;
      lastTs = now;
      setPreviewTime((prev) => {
        const next = prev + dt;
        return next >= previewDuration ? 0 : next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isOpen, isPlaying]);

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
      effectiveSubtitles,
      previewTime,
      previewDuration,
      previewEmphasis,
      palette
    );
  }, [isOpen, previewText, previewEmphasis, effectiveSubtitles, previewTime, palette]);

  if (!isOpen) return null;

  const handleReplay = () => {
    setPreviewTime(0);
    setIsPlaying(true);
  };

  const handleSelectStyle = (styleDef: SubtitleStyleDefinition) => {
    updateSubtitles((prev) => ({
      ...prev,
      style: styleDef.id,
      animation: styleDef.defaultAnimation,
      presetId: undefined,
      typography: {
        fontFamily: styleDef.fontFamily,
        fontWeight: styleDef.fontWeight,
        textColor: styleDef.textColor,
        letterSpacing: styleDef.letterSpacing,
        lineHeight: styleDef.lineHeight,
        textAlign: prev.typography?.textAlign ?? 'center',
        textTransform: styleDef.textTransform,
      },
      appearance: {
        bgColor: styleDef.bgColor,
        bgOpacity: styleDef.bgOpacity,
        borderRadius: styleDef.borderRadius,
        paddingX: styleDef.paddingX,
        paddingY: styleDef.paddingY,
        textShadow: styleDef.textShadow,
        outlineWidth: styleDef.outlineWidth,
        outlineColor: styleDef.outlineColor,
        highlightColor: styleDef.highlightColor,
      },
      emphasisConfig: {
        ...prev.emphasisConfig,
        style: styleDef.emphasisStyle,
        color: styleDef.emphasisColor,
      },
    }));
    handleReplay();
  };

  const handleApplyAutoKeywordsAllScenes = () => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc) => ({
        ...sc,
        emphasis: sc.emphasis?.trim()
          ? sc.emphasis
          : extractAutoEmphasisKeywords(sc.narration, 2).join(', '),
      })),
    }));
  };

  const filteredStyles =
    activeCategory === 'all'
      ? SUBTITLE_STYLES
      : SUBTITLE_STYLES.filter((s) => s.category === activeCategory);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="Motion Subtitle Design Studio"
    >
      <div className="w-full max-w-6xl max-h-[92vh] bg-[#0F141E] border border-[#242E42] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#1E2738] bg-[#121824]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Motion Subtitle Design Studio
              </h2>
              <p className="text-[11px] text-slate-400">
                Gaya aktif: <span className="text-sky-300 font-medium">{resolved.styleDef.name}</span> · Animasi:{' '}
                <span className="text-amber-300 font-medium">{resolved.entrance}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="inline-flex items-center gap-2 text-xs text-slate-300 bg-[#0B0E14] border border-[#242E42] rounded-lg px-2.5 py-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={project.subtitles.enabled}
                onChange={(e) =>
                  updateSubtitles((prev) => ({ ...prev, enabled: e.target.checked }))
                }
                className="rounded border-slate-600 bg-[#0B0E14] text-sky-500"
              />
              <span>Aktifkan Subtitle</span>
            </label>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Subtitle Studio"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-[#1B2333]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main 2-column Studio Body */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">

          {/* LEFT: Live Canvas Preview */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#1E2738] bg-[#0B0E14] p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Live Preview (Engine Export)
              </span>
              {comparePresetId && (
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-medium">
                  Membandingkan: {comparePresetId}
                </span>
              )}
            </div>

            <div className="rounded-xl overflow-hidden border border-[#242E42] bg-[#070A12] aspect-16/10 flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={640}
                height={400}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Playback & Scrubber Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying((p) => !p)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                type="button"
                onClick={handleReplay}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#161D2B] border border-[#263042] text-xs text-slate-200 hover:bg-[#1E2738]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>
              <input
                type="range"
                min={0}
                max={previewDuration}
                step={0.05}
                value={previewTime}
                onChange={(e) => {
                  setIsPlaying(false);
                  setPreviewTime(Number(e.target.value));
                }}
                aria-label="Timeline preview subtitle"
                className="flex-1 accent-sky-400"
              />
              <span className="text-[11px] font-mono text-slate-400 tabular-nums w-9 text-right">
                {previewTime.toFixed(1)}s
              </span>
            </div>

            {/* Compare Preset & Quick Position */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#121722] border border-[#20293A] rounded-lg p-2">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mb-1">
                  <Columns2 className="w-3 h-3" />
                  <span>Bandingkan Preset</span>
                </div>
                <select
                  value={comparePresetId || ''}
                  onChange={(e) =>
                    setComparePresetId((e.target.value || null) as SubtitlePresetId | null)
                  }
                  className="w-full bg-[#0B0E14] border border-[#263042] rounded px-2 py-1 text-[11px] text-slate-200"
                >
                  <option value="">-- Pengaturan Saat Ini --</option>
                  {SUBTITLE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-[#121722] border border-[#20293A] rounded-lg p-2">
                <div className="text-[10px] text-slate-400 mb-1">Posisi Cepat</div>
                <div className="grid grid-cols-3 gap-1">
                  {[
                    { label: 'Bawah', val: 86 },
                    { label: 'Lower 3rd', val: 76 },
                    { label: 'Tengah', val: 50 },
                  ].map((pos) => (
                    <button
                      key={pos.label}
                      type="button"
                      onClick={() =>
                        updateSubtitles((prev) => ({
                          ...prev,
                          position: pos.val <= 78 ? 'lower-third' : 'bottom',
                          positionConfig: { ...prev.positionConfig, verticalPercent: pos.val },
                        }))
                      }
                      className={`py-1 rounded text-[10px] border ${
                        Math.round(resolved.verticalPercent) === pos.val
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                          : 'bg-[#0B0E14] border-[#263042] text-slate-400'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preview Text & Emphasis Tester */}
            <div className="space-y-2 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Teks Uji Preview
                </label>
                <textarea
                  rows={2}
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  className="w-full bg-[#121722] border border-[#242E42] rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[11px] text-amber-300/90 mb-1">
                  Kata Emphasis Preview (pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  value={previewEmphasis}
                  onChange={(e) => setPreviewEmphasis(e.target.value)}
                  placeholder="mis. bedah, isi kepala, lebih jelas"
                  className="w-full bg-[#121722] border border-[#242E42] rounded-lg px-2.5 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* RIGHT: Progressive Disclosure Tabs */}
          <div className="lg:col-span-7 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center gap-1 px-4 pt-3 border-b border-[#1E2738] bg-[#101622] overflow-x-auto">
              {(
                [
                  { id: 'style', label: '1. Gaya & Preset' },
                  { id: 'animation', label: '2. Animasi' },
                  { id: 'typography', label: '3. Tipografi & Tampilan' },
                  { id: 'position', label: '4. Posisi & Emphasis' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-sky-400 text-sky-300'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">

              {activeTab === 'style' && (
                <>
                  {/* Presets Section */}
                  <section className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Preset Motion Subtitle
                      </h3>
                      <span className="text-[11px] text-sky-400">
                        Rekomendasi otomatis sesuai gaya video
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {SUBTITLE_PRESETS.map((preset) => {
                        const isRecommended = preset.id === recommendedPresetId;
                        const isActive = project.subtitles.presetId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              updateSubtitles((prev) => applySubtitlePreset(prev, preset.id));
                              handleReplay();
                            }}
                            className={`text-left rounded-xl border p-2.5 transition-all ${
                              isActive
                                ? 'border-sky-400 bg-sky-500/12'
                                : 'border-[#222B3D] bg-[#121722] hover:border-slate-500/60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-semibold text-white">
                                {preset.name}
                              </span>
                              {isRecommended && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-semibold">
                                  <Sparkles className="w-2.5 h-2.5" />
                                  Cocok
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                              {preset.tagline}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  {/* Style Categories & Visual Thumbnails */}
                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Galeri Gaya Visual ({filteredStyles.length})
                      </h3>
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveCategory('all')}
                          className={`px-2 py-1 rounded-md text-[11px] border ${
                            activeCategory === 'all'
                              ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                              : 'bg-[#121722] border-[#222B3D] text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Semua
                        </button>
                        {CATEGORY_ORDER.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveCategory(cat)}
                            className={`px-2 py-1 rounded-md text-[11px] border ${
                              activeCategory === cat
                                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                : 'bg-[#121722] border-[#222B3D] text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {SUBTITLE_CATEGORY_LABELS[cat]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {filteredStyles.map((styleDef) => (
                        <StyleMiniThumbnail
                          key={styleDef.id}
                          styleDef={styleDef}
                          isActive={project.subtitles.style === styleDef.id}
                          onSelect={() => handleSelectStyle(styleDef)}
                        />
                      ))}
                    </div>
                  </section>
                </>
              )}

              {activeTab === 'animation' && (
                <div className="space-y-5">
                  <section className="space-y-2.5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Animasi Masuk (Entrance — {SUBTITLE_ANIMATIONS.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SUBTITLE_ANIMATIONS.map((anim) => {
                        const isSelected = resolved.entrance === anim.id;
                        return (
                          <button
                            key={anim.id}
                            type="button"
                            onClick={() => {
                              updateSubtitles((prev) => ({
                                ...prev,
                                animation: anim.id as SubtitleAnimation,
                                animationConfig: {
                                  ...prev.animationConfig,
                                  duration: anim.defaultDuration,
                                  easing: anim.defaultEasing,
                                },
                              }));
                              handleReplay();
                            }}
                            className={`text-left rounded-xl border p-2.5 transition-all ${
                              isSelected
                                ? 'border-sky-400 bg-sky-500/12'
                                : 'border-[#222B3D] bg-[#121722] hover:border-slate-500/60'
                            }`}
                          >
                            <div className="text-xs font-semibold text-white">
                              {anim.name}
                            </div>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {anim.description}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </section>

                  <section className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#121722] border border-[#222B3D] rounded-xl p-4 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1.5">Animasi Keluar (Exit)</label>
                      <select
                        value={resolved.exit}
                        onChange={(e) => {
                          updateSubtitles((prev) => ({
                            ...prev,
                            animationConfig: {
                              ...prev.animationConfig,
                              exit: e.target.value as SubtitleExitAnimation,
                            },
                          }));
                          handleReplay();
                        }}
                        className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-2.5 py-1.5 text-slate-200"
                      >
                        {SUBTITLE_EXIT_ANIMATIONS.map((ex) => (
                          <option key={ex.id} value={ex.id}>
                            {ex.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1.5">Easing</label>
                      <select
                        value={resolved.easing}
                        onChange={(e) => {
                          updateSubtitles((prev) => ({
                            ...prev,
                            animationConfig: {
                              ...prev.animationConfig,
                              easing: e.target.value as SubtitleEasing,
                            },
                          }));
                          handleReplay();
                        }}
                        className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-2.5 py-1.5 text-slate-200"
                      >
                        {SUBTITLE_EASINGS.map((ea) => (
                          <option key={ea.id} value={ea.id}>
                            {ea.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Durasi Masuk</span>
                        <span className="font-mono text-sky-300">{resolved.duration.toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min={0.12}
                        max={1.5}
                        step={0.05}
                        value={resolved.duration}
                        onChange={(e) =>
                          updateSubtitles((prev) => ({
                            ...prev,
                            animationConfig: {
                              ...prev.animationConfig,
                              duration: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-sky-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Delay Awal</span>
                        <span className="font-mono text-sky-300">{resolved.delay.toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1.0}
                        step={0.05}
                        value={resolved.delay}
                        onChange={(e) =>
                          updateSubtitles((prev) => ({
                            ...prev,
                            animationConfig: {
                              ...prev.animationConfig,
                              delay: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-sky-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Intensitas Gerakan</span>
                        <span className="font-mono text-sky-300">{resolved.intensity.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min={0.2}
                        max={2.0}
                        step={0.1}
                        value={resolved.intensity}
                        onChange={(e) =>
                          updateSubtitles((prev) => ({
                            ...prev,
                            animationConfig: {
                              ...prev.animationConfig,
                              intensity: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1.5">Arah (jika relevan)</label>
                      <div className="grid grid-cols-4 gap-1">
                        {(['up', 'down', 'left', 'right'] as SubtitleDirection[]).map((dir) => (
                          <button
                            key={dir}
                            type="button"
                            onClick={() =>
                              updateSubtitles((prev) => ({
                                ...prev,
                                animationConfig: { ...prev.animationConfig, direction: dir },
                              }))
                            }
                            className={`py-1.5 rounded-lg border text-[11px] capitalize ${
                              resolved.direction === dir
                                ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                : 'bg-[#0B0E14] border-[#263042] text-slate-400'
                            }`}
                          >
                            {dir}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'typography' && (
                <div className="space-y-5 text-xs">
                  <section className="bg-[#121722] border border-[#222B3D] rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold uppercase tracking-wider text-slate-400">
                        Tipografi
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleSelectStyle(getSubtitleStyleDef(project.subtitles.style))}
                        className="text-[11px] text-sky-400 hover:text-sky-300"
                      >
                        Reset ke Default Gaya
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-slate-400 mb-1">Font Family</label>
                        <select
                          value={resolved.fontFamily}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              typography: { ...prev.typography, fontFamily: e.target.value },
                            }))
                          }
                          className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-2.5 py-1.5 text-slate-200"
                        >
                          {FONT_FAMILY_OPTIONS.map((f) => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Ukuran Font</span>
                          <span className="font-mono text-sky-300">{resolved.fontSize} px</span>
                        </div>
                        <input
                          type="range"
                          min={18}
                          max={52}
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
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Ketebalan (Weight)</span>
                          <span className="font-mono text-sky-300">{resolved.fontWeight}</span>
                        </div>
                        <input
                          type="range"
                          min={400}
                          max={900}
                          step={100}
                          value={resolved.fontWeight}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              typography: { ...prev.typography, fontWeight: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Warna Teks</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={resolved.textColor.startsWith('#') ? resolved.textColor : '#ffffff'}
                            onChange={(e) =>
                              updateSubtitles((prev) => ({
                                ...prev,
                                typography: { ...prev.typography, textColor: e.target.value },
                              }))
                            }
                            className="w-9 h-8 rounded border border-[#263042] bg-[#0B0E14]"
                          />
                          <span className="font-mono text-slate-300">{resolved.textColor}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Letter Spacing</span>
                          <span className="font-mono text-sky-300">{resolved.letterSpacing.toFixed(1)} px</span>
                        </div>
                        <input
                          type="range"
                          min={-1}
                          max={6}
                          step={0.2}
                          value={resolved.letterSpacing}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              typography: { ...prev.typography, letterSpacing: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Line Height</span>
                          <span className="font-mono text-sky-300">{resolved.lineHeight.toFixed(2)}</span>
                        </div>
                        <input
                          type="range"
                          min={1.0}
                          max={1.8}
                          step={0.05}
                          value={resolved.lineHeight}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              typography: { ...prev.typography, lineHeight: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-slate-400 mb-1">Perataan Teks</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['left', 'center', 'right'] as const).map((al) => (
                            <button
                              key={al}
                              type="button"
                              onClick={() =>
                                updateSubtitles((prev) => ({
                                  ...prev,
                                  typography: { ...prev.typography, textAlign: al },
                                }))
                              }
                              className={`py-1.5 rounded-lg border capitalize ${
                                resolved.textAlign === al
                                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                  : 'bg-[#0B0E14] border-[#263042] text-slate-400'
                              }`}
                            >
                              {al}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Kapitalisasi</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(
                            [
                              { id: 'none', label: 'Normal' },
                              { id: 'uppercase', label: 'UPPER' },
                              { id: 'lowercase', label: 'lower' },
                            ] as const
                          ).map((tc) => (
                            <button
                              key={tc.id}
                              type="button"
                              onClick={() =>
                                updateSubtitles((prev) => ({
                                  ...prev,
                                  typography: { ...prev.typography, textTransform: tc.id },
                                }))
                              }
                              className={`py-1.5 rounded-lg border ${
                                resolved.textTransform === tc.id
                                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                  : 'bg-[#0B0E14] border-[#263042] text-slate-400'
                              }`}
                            >
                              {tc.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="bg-[#121722] border border-[#222B3D] rounded-xl p-4 space-y-4">
                    <h3 className="font-semibold uppercase tracking-wider text-slate-400">
                      Tampilan &amp; Latar (Appearance)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label className="block text-slate-400 mb-1">Warna Latar</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={resolved.bgColor.startsWith('#') ? resolved.bgColor : '#070a12'}
                            onChange={(e) =>
                              updateSubtitles((prev) => ({
                                ...prev,
                                appearance: { ...prev.appearance, bgColor: e.target.value },
                              }))
                            }
                            className="w-9 h-8 rounded border border-[#263042] bg-[#0B0E14]"
                          />
                          <span className="font-mono text-slate-300">{resolved.bgColor}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Opasitas Latar</span>
                          <span className="font-mono text-sky-300">{Math.round(resolved.bgOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={resolved.bgOpacity}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              appearance: { ...prev.appearance, bgOpacity: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Border Radius</span>
                          <span className="font-mono text-sky-300">{resolved.borderRadius} px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={40}
                          step={2}
                          value={Math.min(40, resolved.borderRadius)}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              appearance: { ...prev.appearance, borderRadius: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Padding (X / Y)</span>
                          <span className="font-mono text-sky-300">{resolved.paddingX} / {resolved.paddingY}</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={40}
                          step={2}
                          value={resolved.paddingX}
                          onChange={(e) => {
                            const px = Number(e.target.value);
                            updateSubtitles((prev) => ({
                              ...prev,
                              appearance: {
                                ...prev.appearance,
                                paddingX: px,
                                paddingY: Math.round(px * 0.55),
                              },
                            }));
                          }}
                          className="w-full accent-sky-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Outline / Stroke</span>
                          <span className="font-mono text-sky-300">{resolved.outlineWidth} px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={12}
                          step={1}
                          value={resolved.outlineWidth}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              appearance: { ...prev.appearance, outlineWidth: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Text Shadow</span>
                          <span className="font-mono text-sky-300">{resolved.textShadow} px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={24}
                          step={1}
                          value={resolved.textShadow}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              appearance: { ...prev.appearance, textShadow: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Warna Highlight Aktif</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={resolved.highlightColor.startsWith('#') ? resolved.highlightColor : '#ffd166'}
                            onChange={(e) =>
                              updateSubtitles((prev) => ({
                                ...prev,
                                appearance: { ...prev.appearance, highlightColor: e.target.value },
                              }))
                            }
                            className="w-9 h-8 rounded border border-[#263042] bg-[#0B0E14]"
                          />
                          <span className="font-mono text-slate-300">{resolved.highlightColor}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'position' && (
                <div className="space-y-5 text-xs">
                  {/* Position */}
                  <section className="bg-[#121722] border border-[#222B3D] rounded-xl p-4 space-y-4">
                    <h3 className="font-semibold uppercase tracking-wider text-slate-400">
                      Posisi &amp; Area Aman
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Posisi Vertikal</span>
                          <span className="font-mono text-sky-300">{Math.round(resolved.verticalPercent)}%</span>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={92}
                          step={1}
                          value={resolved.verticalPercent}
                          onChange={(e) => {
                            const vp = Number(e.target.value);
                            updateSubtitles((prev) => ({
                              ...prev,
                              position: vp <= 80 ? 'lower-third' : 'bottom',
                              positionConfig: { ...prev.positionConfig, verticalPercent: vp },
                            }));
                          }}
                          className="w-full accent-sky-400"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1">Perataan Horizontal</label>
                        <div className="grid grid-cols-3 gap-1">
                          {(['left', 'center', 'right'] as const).map((al) => (
                            <button
                              key={al}
                              type="button"
                              onClick={() =>
                                updateSubtitles((prev) => ({
                                  ...prev,
                                  positionConfig: { ...prev.positionConfig, horizontalAlign: al },
                                }))
                              }
                              className={`py-1.5 rounded-lg border capitalize ${
                                resolved.horizontalAlign === al
                                  ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                  : 'bg-[#0B0E14] border-[#263042] text-slate-400'
                              }`}
                            >
                              {al}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Lebar Teks Maksimum</span>
                          <span className="font-mono text-sky-300">{resolved.maxWidthPercent}%</span>
                        </div>
                        <input
                          type="range"
                          min={45}
                          max={94}
                          step={2}
                          value={resolved.maxWidthPercent}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              positionConfig: {
                                ...prev.positionConfig,
                                maxWidthPercent: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Safe Area Margin</span>
                          <span className="font-mono text-sky-300">{resolved.safeAreaMargin} px</span>
                        </div>
                        <input
                          type="range"
                          min={12}
                          max={64}
                          step={4}
                          value={resolved.safeAreaMargin}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              positionConfig: {
                                ...prev.positionConfig,
                                safeAreaMargin: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-sky-400"
                        />
                      </div>
                    </div>
                  </section>

                  {/* Word Emphasis System */}
                  <section className="bg-[#121722] border border-[#222B3D] rounded-xl p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold uppercase tracking-wider text-amber-300/90">
                        Word Emphasis System
                      </h3>
                      <button
                        type="button"
                        onClick={handleApplyAutoKeywordsAllScenes}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-200 hover:bg-amber-500/25 text-[11px]"
                      >
                        <Wand2 className="w-3 h-3" />
                        <span>Auto Kata Kunci Semua Scene</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {SUBTITLE_EMPHASIS_STYLES.map((es) => {
                        const active = resolved.emphasisStyle === es.id;
                        return (
                          <button
                            key={es.id}
                            type="button"
                            onClick={() =>
                              updateSubtitles((prev) => ({
                                ...prev,
                                emphasisConfig: {
                                  ...prev.emphasisConfig,
                                  style: es.id as SubtitleEmphasisStyle,
                                },
                              }))
                            }
                            className={`text-left rounded-lg border p-2 transition-colors ${
                              active
                                ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                                : 'border-[#242E42] bg-[#0B0E14] text-slate-300 hover:border-slate-500'
                            }`}
                          >
                            <div className="font-semibold text-[11px] truncate">{es.name}</div>
                            <div className="text-[9px] text-slate-400 truncate mt-0.5">{es.desc}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center pt-1">
                      <div>
                        <label className="block text-slate-400 mb-1">Warna Emphasis</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={resolved.emphasisColor.startsWith('#') ? resolved.emphasisColor : '#ffd166'}
                            onChange={(e) =>
                              updateSubtitles((prev) => ({
                                ...prev,
                                emphasisConfig: {
                                  ...prev.emphasisConfig,
                                  color: e.target.value,
                                },
                              }))
                            }
                            className="w-9 h-8 rounded border border-[#263042] bg-[#0B0E14]"
                          />
                          <span className="font-mono text-slate-300">{resolved.emphasisColor}</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-slate-400 mb-1">
                          <span>Skala Emphasis</span>
                          <span className="font-mono text-amber-300">{resolved.emphasisScale.toFixed(2)}x</span>
                        </div>
                        <input
                          type="range"
                          min={1.0}
                          max={1.4}
                          step={0.02}
                          value={resolved.emphasisScale}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              emphasisConfig: {
                                ...prev.emphasisConfig,
                                scale: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-full accent-amber-400"
                        />
                      </div>

                      <label className="inline-flex items-center gap-2 text-slate-200 cursor-pointer pt-3 sm:pt-0">
                        <input
                          type="checkbox"
                          checked={resolved.autoHighlight}
                          onChange={(e) =>
                            updateSubtitles((prev) => ({
                              ...prev,
                              emphasisConfig: {
                                ...prev.emphasisConfig,
                                autoHighlight: e.target.checked,
                              },
                            }))
                          }
                          className="rounded border-slate-600 bg-[#0B0E14] text-amber-400"
                        />
                        <span>Auto Emphasis jika kosong</span>
                      </label>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#1E2738] bg-[#121824]">
          <p className="text-[11px] text-slate-400">
            Semua perubahan langsung sinkron dengan Live Preview dan Hasil Export Video.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
