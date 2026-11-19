import { useEffect, useState } from 'react';
import type { AspectRatio, PaletteId, ProjectState, SceneItem } from '../types/studio';
import {
  formatTimecode,
  getStylePreset,
  getTotalDuration,
  inferSceneDurationFromCode,
} from '../engine/motionMath';
import { VIDEO_STYLES } from '../data/videoStyles';
import { ApiRequestError, postJson } from '../utils/api';
import { ArrowRight, KeyRound, Loader2, Palette, RotateCcw, Wand2 } from 'lucide-react';

interface IdeStepProps {
  project: ProjectState;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
  onLoadDemo: () => void;
  onNextStep: () => void;
  onJumpToAnimasi: () => void;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

const SAMPLE_TOPICS = [
  'Mengapa AI kadang terdengar sangat yakin padahal salah?',
  'Bagaimana algoritma media sosial memilih video viral?',
  'Kenapa otak manusia mudah tertipu oleh ilusi statistik?',
];

const STYLE_TONES = [
  'Edukasi Futuristik & Investigasi',
  'Dokumenter Singkat & Tegas',
  'Storytelling Santai & Mengalir',
  'Teknologi & Sains Visual',
];

export function IdeStep({
  project,
  onUpdateProject,
  onLoadDemo,
  onNextStep,
  onJumpToAnimasi,
  hasApiKey,
  onOpenApiKeyModal,
}: IdeStepProps) {
  const [topicInput, setTopicInput] = useState(project.topic);
  const [styleTone, setStyleTone] = useState(project.styleTone);
  const [targetDuration, setTargetDuration] = useState<number>(project.targetDurationSec || 25);
  const [sceneCount, setSceneCount] = useState<number>(Math.max(3, Math.min(7, project.scenes.length || 4)));
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(project.aspectRatio);
  const [paletteId, setPaletteId] = useState<PaletteId>(project.paletteId);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsApiKeyAction, setNeedsApiKeyAction] = useState(false);

  useEffect(() => {
    if (hasApiKey && needsApiKeyAction) {
      setErrorMsg(null);
      setNeedsApiKeyAction(false);
    }
  }, [hasApiKey, needsApiKeyAction]);

  const totalSec = getTotalDuration(project.scenes);
  const activeStyle = getStylePreset(paletteId);
  const activePalette = activeStyle.palette;

  const handleSelectStyle = (nextId: PaletteId) => {
    const preset = getStylePreset(nextId);
    setPaletteId(nextId);
    setTargetDuration(preset.recommendedDurationSec);
    onUpdateProject((prev) => ({
      ...prev,
      paletteId: nextId,
      targetDurationSec: preset.recommendedDurationSec,
      subtitles: {
        ...prev.subtitles,
        style: preset.subtitleDefaults.style,
        animation: preset.subtitleDefaults.animation,
      },
    }));
  };

  const handlePreviewActiveStyle = () => {
    const preset = getStylePreset(paletteId);
    const inferred = inferSceneDurationFromCode(preset.sampleCode, 3.6);
    onUpdateProject((prev) => ({
      ...prev,
      paletteId,
      subtitles: {
        ...prev.subtitles,
        style: preset.subtitleDefaults.style,
        animation: preset.subtitleDefaults.animation,
      },
      scenes: prev.scenes.map((sc, idx) =>
        idx === 0
          ? {
              ...sc,
              title: `${preset.name} — Contoh`,
              code: preset.sampleCode,
              durationSec: inferred,
            }
          : sc
      ),
    }));
    onJumpToAnimasi();
  };

  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) {
      setNeedsApiKeyAction(false);
      setErrorMsg('Tuliskan topik video terlebih dahulu.');
      return;
    }

    setErrorMsg(null);
    setNeedsApiKeyAction(false);
    setIsGenerating(true);
    try {
      const data = await postJson<{
        title?: string;
        scenes?: Array<Record<string, unknown>>;
      }>('/api/generate-script', {
        topic: topicInput.trim(),
        styleTone,
        styleId: activeStyle.id,
        styleName: activeStyle.name,
        styleNuance: activeStyle.nuance,
        styleCardPrompt: activeStyle.animationCardPrompt,
        targetDurationSec: targetDuration,
        sceneCount,
        aspectRatio,
        paletteColors: {
          bg: activePalette.bg,
          primary: activePalette.primary,
          secondary: activePalette.secondary,
          accent: activePalette.accent,
          text: activePalette.text,
        },
      });

      const generatedScenes: SceneItem[] = (Array.isArray(data.scenes) ? data.scenes : []).map(
        (sc: Record<string, unknown>, idx: number) => ({
          id: `scene-${Date.now()}-${idx}`,
          index: idx,
          title: String(sc.title || `Scene ${idx + 1}`),
          narration: String(sc.narration || ''),
          visualBrief: String(sc.visualBrief || ''),
          cameraHint: String(sc.cameraHint || ''),
          durationSec: Math.max(1.5, Number(sc.durationSec) || 4.5),
          code: String(sc.code || ''),
          audio: { sourceType: 'none' },
        })
      );

      if (generatedScenes.length === 0) {
        throw new Error('Skrip yang dihasilkan tidak memiliki scene.');
      }

      onUpdateProject((prev) => ({
        ...prev,
        title: String(data.title || topicInput.trim()),
        topic: topicInput.trim(),
        styleTone,
        targetDurationSec: targetDuration,
        aspectRatio,
        paletteId,
        scenes: generatedScenes,
      }));
      onNextStep();
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        (err.status === 401 || err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY')
      ) {
        setNeedsApiKeyAction(true);
      }
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat memanggil server.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Topic Input & Generator Form */}
        <section className="lg:col-span-7 bg-[#121722] border border-[#222A3A] rounded-xl p-6 sm:p-8">
          <div className="mb-6">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Mulai dari Satu Ide Topik
            </h1>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Masukkan topik video Anda, sistem akan menyusun skrip narasi, rincian tiap scene, dan kerangka animasi Canvas secara otomatis.
            </p>
          </div>

          <form onSubmit={handleGenerateScript} className="space-y-5">
            <div>
              <label htmlFor="topic-input" className="block text-sm font-medium text-slate-200 mb-2">
                Topik atau Pertanyaan Utama
              </label>
              <textarea
                id="topic-input"
                rows={3}
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Contoh: Mengapa sinyal data sering disalahartikan sebagai fakta?"
                className="w-full rounded-lg bg-[#0B0E14] border border-[#2A3346] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {SAMPLE_TOPICS.map((sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => setTopicInput(sample)}
                    className="text-xs px-2.5 py-1.5 rounded-md bg-[#182030] border border-[#283246] text-slate-300 hover:text-white hover:border-slate-500 transition-colors text-left"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="tone-select" className="block text-sm font-medium text-slate-200 mb-1.5">
                  Gaya Penyampaian
                </label>
                <select
                  id="tone-select"
                  value={styleTone}
                  onChange={(e) => setStyleTone(e.target.value)}
                  className="w-full rounded-lg bg-[#0B0E14] border border-[#2A3346] px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  {STYLE_TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="aspect-select" className="block text-sm font-medium text-slate-200 mb-1.5">
                  Rasio Kanvas
                </label>
                <select
                  id="aspect-select"
                  value={aspectRatio}
                  onChange={(e) => {
                    const next = e.target.value as AspectRatio;
                    setAspectRatio(next);
                    onUpdateProject((prev) => ({ ...prev, aspectRatio: next }));
                  }}
                  className="w-full rounded-lg bg-[#0B0E14] border border-[#2A3346] px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="9:16">9:16 Vertikal (720×1280)</option>
                  <option value="16:9">16:9 Lanskap (1280×720)</option>
                  <option value="1:1">1:1 Persegi (960×960)</option>
                </select>
              </div>

              <div>
                <label htmlFor="duration-select" className="block text-sm font-medium text-slate-200 mb-1.5">
                  Target Durasi
                </label>
                <select
                  id="duration-select"
                  value={targetDuration}
                  onChange={(e) => setTargetDuration(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0B0E14] border border-[#2A3346] px-3 py-2 text-sm text-white tabular-nums focus:outline-none focus:border-sky-500"
                >
                  <option value={15}>15 detik</option>
                  <option value={25}>25 detik</option>
                  <option value={35}>35 detik</option>
                  <option value={45}>45 detik</option>
                  <option value={60}>60 detik</option>
                </select>
              </div>

              <div>
                <label htmlFor="scene-count-select" className="block text-sm font-medium text-slate-200 mb-1.5">
                  Jumlah Scene
                </label>
                <select
                  id="scene-count-select"
                  value={sceneCount}
                  onChange={(e) => setSceneCount(Number(e.target.value))}
                  className="w-full rounded-lg bg-[#0B0E14] border border-[#2A3346] px-3 py-2 text-sm text-white tabular-nums focus:outline-none focus:border-sky-500"
                >
                  {[3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>
                      {n} Scene
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm font-medium text-slate-200">
                  Gaya Video &amp; Animasi ({VIDEO_STYLES.length} Gaya)
                </span>
                <button
                  type="button"
                  onClick={handlePreviewActiveStyle}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors whitespace-nowrap"
                >
                  <Palette className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Terapkan Contoh Visual {activeStyle.name}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {VIDEO_STYLES.map((style) => {
                  const pal = style.palette;
                  const selected = paletteId === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => handleSelectStyle(style.id)}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'bg-[#192234] border-sky-500 text-white'
                          : 'bg-[#0B0E14] border-[#252E40] text-slate-300 hover:text-white hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1">
                          <span
                            className="w-3 h-3 rounded-sm border border-white/15"
                            style={{ backgroundColor: pal.bg }}
                            title="Latar"
                          />
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: pal.primary }} />
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: pal.secondary }} />
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: pal.accent }} />
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          ~{style.recommendedDurationSec}s
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white">{style.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                        {style.tagline}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-xs text-slate-400 leading-relaxed">
                <span className="text-slate-200 font-medium">{activeStyle.name}:</span> {activeStyle.nuance}
              </p>
            </div>

            {!hasApiKey && (
              <div className="rounded-lg bg-amber-950/30 border border-amber-500/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-amber-200 leading-relaxed">
                  Fitur AI otomatis membutuhkan API Key Gemini Anda sendiri (tanpa API key bawaan server).
                </p>
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-xs font-semibold text-amber-100 hover:bg-amber-500/30 shrink-0"
                >
                  <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Masukkan API Key</span>
                </button>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="rounded-lg bg-rose-950/50 border border-rose-500/40 px-4 py-3 text-sm text-rose-200 flex flex-wrap items-center justify-between gap-3"
              >
                <span>{errorMsg}</span>
                {needsApiKeyAction && (
                  <button
                    type="button"
                    onClick={onOpenApiKeyModal}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-500/20 border border-rose-400/50 text-xs font-semibold text-white hover:bg-rose-500/35 shrink-0"
                  >
                    <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Atur API Key</span>
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 text-slate-950 font-semibold text-sm hover:bg-sky-400 disabled:opacity-50 transition-colors"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Wand2 className="w-4 h-4" aria-hidden="true" />
                )}
                <span>{isGenerating ? 'Menyusun Skrip & Scene...' : 'Buat Skrip & Scene Otomatis'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onLoadDemo();
                  setErrorMsg(null);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#182030] border border-[#2B364B] text-slate-200 text-sm font-medium hover:bg-[#1E283C] transition-colors"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
                <span>Muat Contoh Demo (Scene 4–6)</span>
              </button>
            </div>
          </form>
        </section>

        {/* Right: Active Project Summary & Quick Route */}
        <aside className="lg:col-span-5 bg-[#121722] border border-[#222A3A] rounded-xl p-6 space-y-5">
          <div>
            <div className="text-xs font-medium text-slate-400 mb-1">Proyek Aktif Saat Ini</div>
            <h2 className="font-display text-xl font-semibold text-white leading-snug">
              {project.title}
            </h2>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-400 tabular-nums">
              <span>{project.scenes.length} Scene</span>
              <span aria-hidden="true">·</span>
              <span>Durasi {formatTimecode(totalSec)}</span>
              <span aria-hidden="true">·</span>
              <span>{project.aspectRatio}</span>
            </div>
          </div>

          <div className="border-t border-[#222A3A] pt-4 space-y-3">
            <div className="text-xs font-medium text-slate-400">Ringkasan Alur Scene</div>
            <ol className="space-y-2.5">
              {project.scenes.map((sc, i) => (
                <li
                  key={sc.id}
                  className="flex items-start justify-between gap-3 py-2 border-b border-[#1D2433] last:border-b-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-100 truncate">
                      {String(i + 1).padStart(2, '0')}. {sc.title}
                    </div>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{sc.narration}</p>
                  </div>
                  <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                    {sc.durationSec.toFixed(1)}s
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={onNextStep}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1A2233] border border-[#2D384E] text-sm font-medium text-white hover:bg-[#222C42] transition-colors"
            >
              <span>Edit Narasi</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onJumpToAnimasi}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-sm font-medium text-sky-300 hover:bg-sky-500/25 transition-colors"
            >
              <span>Buka Kanvas Animasi</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
