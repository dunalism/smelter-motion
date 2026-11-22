import { useState } from 'react';
import type { ProjectState, SceneItem } from '../types/studio';
import { estimateNarrationDurationSec, formatTimecode, getTotalDuration, PALETTE_PRESETS } from '../engine/motionMath';
import {
  extractAutoEmphasisKeywords,
  resolveSubtitleConfig,
} from '../engine/subtitleConfig';
import { SeoPanel } from './SeoPanel';
import { SubtitleStudioModal } from './SubtitleStudioModal';
import { ArrowDown, ArrowRight, ArrowUp, Plus, SlidersHorizontal, Trash2, Wand2 } from 'lucide-react';

interface NarasiStepProps {
  project: ProjectState;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
  onNextStep: () => void;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

export function NarasiStep({
  project,
  onUpdateProject,
  onNextStep,
  hasApiKey,
  onOpenApiKeyModal,
}: NarasiStepProps) {
  const [isSubtitleStudioOpen, setIsSubtitleStudioOpen] = useState(false);
  const totalSec = getTotalDuration(project.scenes);
  const palette = PALETTE_PRESETS[project.paletteId] || PALETTE_PRESETS['cyber-hologram'];
  const resolvedSub = resolveSubtitleConfig(project.subtitles, palette);

  const updateScene = (id: string, patch: Partial<SceneItem>) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc) => (sc.id === id ? { ...sc, ...patch } : sc)),
    }));
  };

  const addScene = () => {
    onUpdateProject((prev) => {
      const idx = prev.scenes.length;
      const next: SceneItem = {
        id: `scene-${Date.now()}`,
        index: idx,
        title: `Scene ${idx + 1}`,
        narration: 'Tuliskan kalimat narasi untuk scene ini.',
        visualBrief: 'Jelaskan elemen visual dan teks kunci yang tampil di layar.',
        cameraHint: 'Zoom perlahan ke pusat komposisi.',
        durationSec: 4.0,
        code: `// ===== SCENE ${idx + 1} =====\ns.kamera([[0, 360, 640, 1], [4, 360, 580, 1.08]]);\ns.text("SCENE ${idx + 1}", 360, 540, { size: 48, color: "#29e7ff", align: "center", alpha: s.spring(0.2, "smooth") });`,
        audio: { sourceType: 'none' },
      };
      return { ...prev, scenes: [...prev.scenes, next] };
    });
  };

  const moveScene = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= project.scenes.length) return;
    onUpdateProject((prev) => {
      const copy = [...prev.scenes];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return {
        ...prev,
        scenes: copy.map((s, idx) => ({ ...s, index: idx })),
      };
    });
  };

  const removeScene = (id: string) => {
    if (project.scenes.length <= 1) return;
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes
        .filter((s) => s.id !== id)
        .map((s, idx) => ({ ...s, index: idx })),
    }));
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#222A3A] pb-5">
          <div className="flex-1 min-w-0">
            <label htmlFor="project-title-input" className="block text-xs font-medium text-slate-400 mb-1.5">
              Judul Proyek Video
            </label>
            <input
              id="project-title-input"
              type="text"
              value={project.title}
              onChange={(e) =>
                onUpdateProject((prev) => ({ ...prev, title: e.target.value }))
              }
              className="w-full max-w-xl bg-transparent font-display text-2xl font-bold text-white border-b border-transparent hover:border-[#2C374C] focus:border-sky-500 focus:outline-none pb-1"
            />
            <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400 tabular-nums">
              <span>{project.scenes.length} Scene</span>
              <span aria-hidden="true">·</span>
              <span>Total Durasi {formatTimecode(totalSec)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={addScene}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#182030] border border-[#2B364B] text-sm font-medium text-slate-200 hover:bg-[#1E283C] transition-colors"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Tambah Scene</span>
            </button>
            <button
              type="button"
              onClick={onNextStep}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold text-sm hover:bg-sky-400 transition-colors"
            >
              <span>Lanjut ke Suara</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Subtitle Preferences Strip */}
        <section className="bg-[#121722] border border-[#222A3A] rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2.5 text-sm font-medium text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={project.subtitles.enabled}
                onChange={(e) =>
                  onUpdateProject((prev) => ({
                    ...prev,
                    subtitles: { ...prev.subtitles, enabled: e.target.checked },
                  }))
                }
                className="w-4 h-4 rounded border-slate-600 bg-[#0B0E14] text-sky-500 focus:ring-sky-500"
              />
              <span>Tampilkan Subtitle Otomatis di Video</span>
            </label>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-[#0B0E14] border border-[#242E42] rounded-lg px-2.5 py-1">
              <span className="text-sky-300 font-medium">{resolvedSub.styleDef.name}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{resolvedSub.fontSize}px</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSubtitleStudioOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-sky-500/15 border border-sky-400/40 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Desain &amp; Preview Subtitle</span>
          </button>
        </section>

        {/* Scene Cards */}
        <div className="space-y-4">
          {project.scenes.map((scene, idx) => {
            const wordCount = scene.narration.trim()
              ? scene.narration.trim().split(/\s+/).length
              : 0;

            return (
              <article
                key={scene.id}
                className="bg-[#121722] border border-[#222A3A] rounded-xl p-5 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-[220px]">
                    <span className="font-mono text-xs font-semibold text-sky-400 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <input
                      type="text"
                      aria-label={`Judul Scene ${idx + 1}`}
                      value={scene.title}
                      onChange={(e) => updateScene(scene.id, { title: e.target.value })}
                      className="flex-1 bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`dur-${scene.id}`}
                      className="text-xs text-slate-400"
                    >
                      Durasi (dtk)
                    </label>
                    <input
                      id={`dur-${scene.id}`}
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="60"
                      value={scene.durationSec}
                      onChange={(e) =>
                        updateScene(scene.id, {
                          durationSec: Math.max(0.5, Number(e.target.value) || 1),
                        })
                      }
                      className="w-20 bg-[#0B0E14] border border-[#263042] rounded-lg px-2.5 py-1.5 text-xs font-mono text-white text-right tabular-nums focus:outline-none focus:border-sky-500"
                    />

                    <button
                      type="button"
                      onClick={() => moveScene(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Pindahkan Scene ${idx + 1} ke atas`}
                      className="p-1.5 rounded-lg border border-[#263042] text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveScene(idx, 1)}
                      disabled={idx === project.scenes.length - 1}
                      aria-label={`Pindahkan Scene ${idx + 1} ke bawah`}
                      className="p-1.5 rounded-lg border border-[#263042] text-slate-400 hover:text-white disabled:opacity-30"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeScene(scene.id)}
                      disabled={project.scenes.length <= 1}
                      aria-label={`Hapus Scene ${idx + 1}`}
                      className="p-1.5 rounded-lg border border-[#263042] text-slate-400 hover:text-rose-400 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor={`narration-${scene.id}`}
                        className="text-xs font-medium text-slate-300"
                      >
                        Teks Narasi &amp; Subtitle
                      </label>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {wordCount} kata
                      </span>
                    </div>
                    <textarea
                      id={`narration-${scene.id}`}
                      rows={3}
                      value={scene.narration}
                      onChange={(e) => {
                        const nextNarration = e.target.value;
                        updateScene(scene.id, {
                          narration: nextNarration,
                          ...(scene.audio.sourceType === 'none'
                            ? {
                                durationSec: estimateNarrationDurationSec(
                                  nextNarration,
                                  scene.durationSec
                                ),
                              }
                            : {}),
                        });
                      }}
                      className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label
                          htmlFor={`emphasis-${scene.id}`}
                          className="text-xs font-medium text-amber-300/90"
                        >
                          Kata Penekanan (Emphasis di Subtitle)
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateScene(scene.id, {
                                emphasis: extractAutoEmphasisKeywords(scene.narration, 2).join(', '),
                              })
                            }
                            className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200"
                          >
                            <Wand2 className="w-3 h-3" />
                            <span>Auto</span>
                          </button>
                          {scene.emphasis && (
                            <button
                              type="button"
                              onClick={() => updateScene(scene.id, { emphasis: '' })}
                              className="text-[11px] text-slate-400 hover:text-slate-200"
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                      </div>
                      <input
                        id={`emphasis-${scene.id}`}
                        type="text"
                        value={scene.emphasis ?? ''}
                        onChange={(e) => updateScene(scene.id, { emphasis: e.target.value })}
                        placeholder="Pilih kata di bawah atau ketik (pisahkan koma)..."
                        className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-1.5 text-xs text-amber-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                      />
                      {scene.narration.trim().length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {scene.narration
                            .trim()
                            .split(/\s+/)
                            .map((rawWord, wi) => {
                              const cleanWord = rawWord.replace(/^[.,!?;:"'()]+|[.,!?;:"'()]+$/g, '');
                              if (!cleanWord) return null;
                              const existingList = (scene.emphasis || '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);
                              const isSelected = existingList.some(
                                (item) => item.toLowerCase() === cleanWord.toLowerCase()
                              );
                              return (
                                <button
                                  key={`${scene.id}-w-${wi}`}
                                  type="button"
                                  onClick={() => {
                                    const nextList = isSelected
                                      ? existingList.filter(
                                          (item) => item.toLowerCase() !== cleanWord.toLowerCase()
                                        )
                                      : [...existingList, cleanWord];
                                    updateScene(scene.id, {
                                      emphasis: nextList.join(', '),
                                    });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
                                    isSelected
                                      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200 underline decoration-amber-400'
                                      : 'bg-[#0B0E14] border-[#263042] text-slate-400 hover:text-slate-200 hover:border-slate-500'
                                  }`}
                                >
                                  {cleanWord}
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor={`visual-${scene.id}`}
                        className="block text-xs font-medium text-slate-300 mb-1.5"
                      >
                        Rincian Visual Scene
                      </label>
                      <textarea
                        id={`visual-${scene.id}`}
                        rows={2}
                        value={scene.visualBrief}
                        onChange={(e) =>
                          updateScene(scene.id, { visualBrief: e.target.value })
                        }
                        className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`cam-${scene.id}`}
                        className="block text-xs font-medium text-slate-300 mb-1"
                      >
                        Arahan Kamera
                      </label>
                      <input
                        id={`cam-${scene.id}`}
                        type="text"
                        value={scene.cameraHint}
                        onChange={(e) =>
                          updateScene(scene.id, { cameraHint: e.target.value })
                        }
                        className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* SEO & Caption Generator Section */}
        <SeoPanel
          project={project}
          onUpdateProject={onUpdateProject}
          hasApiKey={hasApiKey}
          onOpenApiKeyModal={onOpenApiKeyModal}
        />
      </div>

      <SubtitleStudioModal
        isOpen={isSubtitleStudioOpen}
        onClose={() => setIsSubtitleStudioOpen(false)}
        project={project}
        palette={palette}
        onUpdateProject={onUpdateProject}
      />
    </main>
  );
}
