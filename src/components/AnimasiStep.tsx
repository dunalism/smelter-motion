import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectState, SceneItem } from '../types/studio';
import {
  buildMasterPrompt,
  buildPromptForScene,
  formatTimecode,
  getCanvasDimensions,
  getStylePreset,
  getTotalDuration,
  inferSceneDurationFromCode,
  PALETTE_PRESETS,
  resolveSceneAtTime,
  splitMultiSceneCode,
} from '../engine/motionMath';
import { compileSceneCode, extractSfxCalls, renderSceneFrame } from '../engine/canvasRenderer';
import { triggerSfxAt } from '../engine/sfxSynthesizer';
import { preloadProjectAudioTimings } from '../engine/wordTiming';
import { ApiRequestError, postJson } from '../utils/api';
import { SubtitleStudioModal } from './SubtitleStudioModal';
import { WatermarkModal } from './WatermarkModal';
import {
  Check,
  Code2,
  Copy,
  FileCode2,
  KeyRound,
  Loader2,
  Maximize2,
  Minimize2,
  Palette,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Volume2,
  VolumeX,
  Captions,
} from 'lucide-react';

interface AnimasiStepProps {
  project: ProjectState;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

export function AnimasiStep({
  project,
  onUpdateProject,
  hasApiKey,
  onOpenApiKeyModal,
}: AnimasiStepProps) {
  const [selectedSceneIdx, setSelectedSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [muteSfx, setMuteSfx] = useState(false);
  const [muteVoice, setMuteVoice] = useState(false);
  const [copiedMode, setCopiedMode] = useState<'single' | 'all' | null>(null);
  const [showMultiPaste, setShowMultiPaste] = useState(false);
  const [multiPasteText, setMultiPasteText] = useState('');
  const [showPromptPreview, setShowPromptPreview] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [needsApiKeyAction, setNeedsApiKeyAction] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSubtitleStudioOpen, setIsSubtitleStudioOpen] = useState(false);
  const [isWatermarkModalOpen, setIsWatermarkModalOpen] = useState(false);

  const previewContainerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsEl =
        document.fullscreenElement ||
        (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;
      setIsFullscreen(Boolean(fsEl && fsEl === previewContainerRef.current));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleToggleFullscreen = async () => {
    const el = previewContainerRef.current as
      | (HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void })
      | null;
    if (!el) return;

    const fsEl =
      document.fullscreenElement ||
      (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;

    if (fsEl) {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else {
          const doc = document as Document & { webkitExitFullscreen?: () => Promise<void> | void };
          await doc.webkitExitFullscreen?.();
        }
      } catch {
        setIsFullscreen(false);
      }
      return;
    }

    if (isFullscreen) {
      setIsFullscreen(false);
      return;
    }

    try {
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else {
        setIsFullscreen(true);
      }
    } catch {
      // Fallback to theater/fullscreen overlay if native fullscreen is blocked
      setIsFullscreen(true);
    }
  };

  useEffect(() => {
    if (hasApiKey && needsApiKeyAction) {
      setAiError(null);
      setNeedsApiKeyAction(false);
    }
  }, [hasApiKey, needsApiKeyAction]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const currentTimeRef = useRef(0);
  const isPlayingRef = useRef(false);
  const selectedSceneIdxRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const triggeredSfxRef = useRef<Set<string>>(new Set());
  const voiceAudioElRef = useRef<HTMLAudioElement | null>(null);
  const activeAudioKeyRef = useRef<string | null>(null);

  const safeIdx = Math.min(selectedSceneIdx, Math.max(0, project.scenes.length - 1));
  selectedSceneIdxRef.current = safeIdx;
  const activeScene = project.scenes[safeIdx];
  const stylePreset = getStylePreset(project.paletteId);
  const palette = PALETTE_PRESETS[project.paletteId] || PALETTE_PRESETS['cyber-hologram'];
  const dims = getCanvasDimensions(project.aspectRatio);
  const totalSec = getTotalDuration(project.scenes);

  // Pre-compile all scenes
  const compiledAll = useMemo(() => {
    return project.scenes.map((sc) => ({
      id: sc.id,
      compiled: compileSceneCode(sc.code),
      sfxCalls: extractSfxCalls(sc.code, dims.width, dims.height),
    }));
  }, [project.scenes, dims.width, dims.height]);

  const activeCompiled = compiledAll[safeIdx];
  const activeSfxCount = activeCompiled?.sfxCalls.length ?? 0;

  // Multi-scene paste preview count
  const parsedPastePreview = useMemo(() => {
    return splitMultiSceneCode(multiPasteText);
  }, [multiPasteText]);

  const singlePrompt = useMemo(() => {
    if (!activeScene) return '';
    return buildPromptForScene(activeScene, palette, project.aspectRatio);
  }, [activeScene, palette, project.aspectRatio]);

  const masterPrompt = useMemo(() => {
    return buildMasterPrompt(project.title, project.scenes, palette, project.aspectRatio);
  }, [project.title, project.scenes, palette, project.aspectRatio]);

  const sceneStartOffsets = useMemo(() => {
    const offsets: number[] = [];
    let acc = 0;
    for (const sc of project.scenes) {
      offsets.push(acc);
      acc += Math.max(0.5, sc.durationSec);
    }
    return offsets;
  }, [project.scenes]);

  // Preload audio word-timing alignments for all scenes (non-WAV MP3/WebM/URL)
  useEffect(() => {
    preloadProjectAudioTimings(project.scenes).catch(() => {});
  }, [project.scenes]);

  // Draw frame whenever currentTime, scenes, palette, or subtitles change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resolved = resolveSceneAtTime(project.scenes, currentTime);
    const entry = resolved.sceneIndex >= 0 ? compiledAll[resolved.sceneIndex] : null;

    const err = renderSceneFrame({
      ctx,
      width: dims.width,
      height: dims.height,
      localTime: resolved.localTime,
      sceneDuration: resolved.scene?.durationSec,
      compiledFn: entry?.compiled.fn ?? null,
      palette,
      narration: resolved.scene?.narration,
      emphasis: resolved.scene?.emphasis,
      subtitles: project.subtitles,
      watermark: project.watermark,
      audioDataUrl: resolved.scene?.audio.dataUrl,
      audioDurationSec: resolved.scene?.audio.durationSec,
    });
    setRuntimeError(err);
  }, [currentTime, project.scenes, project.subtitles, project.watermark, palette, dims.width, dims.height, compiledAll]);

  // AudioContext helper for live SFX playback
  const ensureAudioCtx = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  const stopVoicePlayback = () => {
    if (voiceAudioElRef.current) {
      voiceAudioElRef.current.pause();
      voiceAudioElRef.current = null;
    }
    activeAudioKeyRef.current = null;
  };

  // Sync voiceover playback during live play
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (!isPlaying) {
      stopVoicePlayback();
      return;
    }

    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      if (!isPlayingRef.current) return;
      const dt = Math.min(0.1, (now - lastTs) / 1000);
      lastTs = now;

      const prevT = currentTimeRef.current;
      let nextT = prevT + dt;

      if (nextT >= totalSec) {
        nextT = 0;
        triggeredSfxRef.current.clear();
        stopVoicePlayback();
      }

      currentTimeRef.current = nextT;
      setCurrentTime(nextT);

      const resolved = resolveSceneAtTime(project.scenes, nextT);
      if (resolved.sceneIndex !== selectedSceneIdxRef.current && resolved.sceneIndex >= 0) {
        selectedSceneIdxRef.current = resolved.sceneIndex;
        setSelectedSceneIdx(resolved.sceneIndex);
      }

      // Trigger SFX when playhead crosses event time
      if (!muteSfx && resolved.sceneIndex >= 0) {
        const sfxList = compiledAll[resolved.sceneIndex]?.sfxCalls ?? [];
        for (let i = 0; i < sfxList.length; i++) {
          const sfx = sfxList[i];
          const key = `${resolved.sceneIndex}-${i}-${sfx.name}-${sfx.time}`;
          if (
            !triggeredSfxRef.current.has(key) &&
            resolved.localTime >= sfx.time &&
            resolved.localTime <= sfx.time + 0.15
          ) {
            triggeredSfxRef.current.add(key);
            const ctx = ensureAudioCtx();
            triggerSfxAt(ctx, ctx.destination, sfx.name, ctx.currentTime, sfx.volume, sfx.pitch);
          }
        }
      }

      // Sync voiceover audio element
      if (!muteVoice && resolved.scene) {
        if (project.masterAudioUrl) {
          const masterKey = `master:${project.masterAudioUrl}`;
          if (activeAudioKeyRef.current !== masterKey) {
            stopVoicePlayback();
            const el = new Audio(project.masterAudioUrl);
            el.currentTime = nextT;
            el.play().catch(() => {});
            voiceAudioElRef.current = el;
            activeAudioKeyRef.current = masterKey;
          }
        } else if (resolved.scene.audio.dataUrl) {
          const scKey = `${resolved.scene.id}:${resolved.scene.audio.dataUrl.slice(0, 32)}`;
          if (activeAudioKeyRef.current !== scKey) {
            stopVoicePlayback();
            const el = new Audio(resolved.scene.audio.dataUrl);
            el.currentTime = resolved.localTime;
            el.play().catch(() => {});
            voiceAudioElRef.current = el;
            activeAudioKeyRef.current = scKey;
          }
        } else {
          stopVoicePlayback();
        }
      } else {
        stopVoicePlayback();
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafId);
      stopVoicePlayback();
    };
  }, [isPlaying, totalSec, project.scenes, project.masterAudioUrl, compiledAll, muteSfx, muteVoice]);

  const seekToTime = (t: number) => {
    const clamped = Math.max(0, Math.min(totalSec, t));
    currentTimeRef.current = clamped;
    setCurrentTime(clamped);
    triggeredSfxRef.current.clear();
    stopVoicePlayback();
    const resolved = resolveSceneAtTime(project.scenes, clamped);
    if (resolved.sceneIndex >= 0) {
      setSelectedSceneIdx(resolved.sceneIndex);
    }
  };

  const selectScene = (idx: number) => {
    setSelectedSceneIdx(idx);
    const offset = sceneStartOffsets[idx] ?? 0;
    seekToTime(offset);
  };

  const handleTogglePlay = () => {
    if (!isPlaying) {
      ensureAudioCtx();
      if (currentTimeRef.current >= totalSec - 0.05) {
        seekToTime(0);
      }
    }
    setIsPlaying((p) => !p);
  };

  const handleCopyPrompt = async (mode: 'single' | 'all') => {
    const text = mode === 'single' ? singlePrompt : masterPrompt;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMode(mode);
      setTimeout(() => setCopiedMode(null), 2000);
    } catch {
      setShowPromptPreview(true);
    }
  };

  const handleSceneCodeChange = (newCode: string) => {
    if (!activeScene) return;
    const inferred = inferSceneDurationFromCode(newCode, activeScene.durationSec);
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc, idx) =>
        idx === safeIdx
          ? {
              ...sc,
              code: newCode,
              durationSec: inferred,
            }
          : sc
      ),
    }));
  };

  const handleApplyMultiPaste = () => {
    const blocks = splitMultiSceneCode(multiPasteText);
    if (blocks.length === 0) return;

    onUpdateProject((prev) => {
      const updatedScenes: SceneItem[] = blocks.map((blk, i) => {
        const existing = prev.scenes[i];
        const dur = inferSceneDurationFromCode(blk.code, existing?.durationSec ?? 4.5);
        if (existing) {
          return {
            ...existing,
            code: blk.code,
            durationSec: dur,
          };
        }
        return {
          id: `scene-${Date.now()}-${i}`,
          index: i,
          title: blk.label || `Scene ${i + 1}`,
          narration: '',
          visualBrief: 'Ditempel dari hasil AI multi-scene.',
          cameraHint: '',
          durationSec: dur,
          code: blk.code,
          audio: { sourceType: 'none' },
        };
      });

      // Keep extra existing scenes if user pasted fewer blocks? No, if pasting >=1 blocks into existing >= blocks, merge cleanly:
      const merged =
        blocks.length < prev.scenes.length
          ? prev.scenes.map((sc, idx) =>
              idx < blocks.length
                ? {
                    ...sc,
                    code: blocks[idx].code,
                    durationSec: inferSceneDurationFromCode(blocks[idx].code, sc.durationSec),
                  }
                : sc
            )
          : updatedScenes;

      return {
        ...prev,
        scenes: merged,
      };
    });

    setShowMultiPaste(false);
    setMultiPasteText('');
    seekToTime(0);
  };

  const handleGenerateSceneWithAI = async () => {
    if (!activeScene) return;
    setAiError(null);
    setNeedsApiKeyAction(false);
    setIsGeneratingCode(true);
    try {
      const data = await postJson<{ code?: string }>('/api/generate-scene-code', {
        prompt: singlePrompt,
      });
      if (data.code) {
        handleSceneCodeChange(data.code);
      }
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        (err.status === 401 || err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY')
      ) {
        setNeedsApiKeyAction(true);
      }
      setAiError(err instanceof Error ? err.message : 'Gagal menghubungi server AI.');
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleLoadStyleSample = () => {
    if (!activeScene) return;
    const header = `// ===== SCENE ${safeIdx + 1} =====`;
    const sample = stylePreset.sampleCode.replace(/^\/\/\s*=+\s*SCENE\s+\d+\s*=+/i, header);
    handleSceneCodeChange(sample);
    seekToTime(sceneStartOffsets[safeIdx] ?? 0);
  };

  const activeCompileError = activeCompiled?.compiled.error ?? null;
  const displayError = activeCompileError || runtimeError;

  return (
    <main className="flex-1 overflow-y-auto lg:overflow-hidden px-4 sm:px-6 py-4">
      <div className="h-full max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Pane: Prompt Copy + Multi-Scene Paste + Code Editor */}
        <section className="lg:col-span-7 flex flex-col bg-[#121722] border border-[#222A3A] rounded-xl overflow-hidden min-h-[520px]">
          {/* Scene Selector Strip */}
          <div className="px-4 py-3 border-b border-[#222A3A] flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {project.scenes.map((sc, idx) => {
                const isSelected = idx === safeIdx;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => selectScene(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-sky-500 text-slate-950 font-semibold'
                        : 'bg-[#182030] text-slate-300 hover:text-white hover:bg-[#1F293D]'
                    }`}
                  >
                    Scene {idx + 1}
                  </button>
                );
              })}
            </div>

            {activeScene && (
              <span className="font-mono text-xs text-slate-400 tabular-nums shrink-0">
                {stylePreset.name} · {activeScene.durationSec.toFixed(2)}s · {activeSfxCount} SFX
              </span>
            )}
          </div>

          {/* Prompt & AI Paste Action Bar */}
          <div className="px-4 py-2.5 bg-[#0F141D] border-b border-[#222A3A] flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleCopyPrompt('single')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-200 hover:bg-[#202B40] whitespace-nowrap shrink-0"
            >
              {copiedMode === 'single' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{copiedMode === 'single' ? 'Tersalin' : 'Salin Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleCopyPrompt('all')}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-200 hover:bg-[#202B40] whitespace-nowrap shrink-0"
            >
              {copiedMode === 'all' ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              ) : (
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{copiedMode === 'all' ? 'Semua Tersalin' : 'Salin Semua'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMultiPaste((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                showMultiPaste
                  ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                  : 'bg-[#182030] border-[#2B364B] text-slate-200 hover:bg-[#202B40]'
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tempel Multi-Scene</span>
            </button>

            <button
              type="button"
              onClick={handleLoadStyleSample}
              title={`Muat contoh visual gaya ${stylePreset.name} ke scene ini`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-300 hover:text-white hover:bg-[#202B40] whitespace-nowrap shrink-0"
            >
              <Palette className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Contoh Gaya</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPromptPreview((v) => !v)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-300 hover:text-white whitespace-nowrap shrink-0"
            >
              <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showPromptPreview ? 'Tutup Prompt' : 'Lihat Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateSceneWithAI}
              disabled={isGeneratingCode}
              className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-xs font-semibold text-sky-300 hover:bg-sky-500/25 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isGeneratingCode ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{isGeneratingCode ? 'Merakit...' : 'Buat Kode AI'}</span>
            </button>
          </div>

          {aiError && (
            <div
              role="alert"
              className="px-4 py-2.5 bg-rose-950/60 border-b border-rose-500/40 text-xs text-rose-200 flex flex-wrap items-center justify-between gap-2"
            >
              <span>{aiError}</span>
              {needsApiKeyAction && (
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/20 border border-rose-400/50 text-xs font-semibold text-white hover:bg-rose-500/35 shrink-0"
                >
                  <KeyRound className="w-3 h-3" aria-hidden="true" />
                  <span>Atur API Key</span>
                </button>
              )}
            </div>
          )}

          {!hasApiKey && !aiError && (
            <div className="px-4 py-2 bg-amber-950/25 border-b border-amber-500/25 text-[11px] text-amber-200/90 flex flex-wrap items-center justify-between gap-2">
              <span>Salin Prompt &amp; Tempel Multi-Scene siap dipakai; tombol &quot;Buat Kode AI&quot; memerlukan API Key Gemini Anda.</span>
              <button
                type="button"
                onClick={onOpenApiKeyModal}
                className="text-xs font-semibold text-amber-300 hover:underline shrink-0"
              >
                Atur API Key
              </button>
            </div>
          )}

          {/* Multi-Scene Paste Drawer */}
          {showMultiPaste && (
            <div className="p-4 bg-[#0B0E14] border-b border-[#222A3A] space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Tempel Hasil Kode AI Sekaligus (Multi-Scene)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tempel seluruh kode jawaban AI dengan pemisah <code className="text-sky-300">// ===== SCENE X =====</code> — sistem otomatis membaginya per scene.
                  </p>
                </div>
                <span className="font-mono text-xs text-sky-400 tabular-nums shrink-0">
                  {parsedPastePreview.length} scene terdeteksi
                </span>
              </div>
              <textarea
                rows={6}
                aria-label="Tempel kode multi-scene"
                value={multiPasteText}
                onChange={(e) => setMultiPasteText(e.target.value)}
                placeholder="// ===== SCENE 1 =====&#10;s.kamera([[0, 360, 620, 1], [4, 360, 445, 1.1]]);&#10;..."
                className="w-full font-mono text-xs bg-[#121722] border border-[#2A3447] rounded-lg p-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowMultiPaste(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApplyMultiPaste}
                  disabled={parsedPastePreview.length === 0}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-xs font-semibold hover:bg-sky-400 disabled:opacity-40"
                >
                  Terapkan ke {parsedPastePreview.length} Scene
                </button>
              </div>
            </div>
          )}

          {/* Prompt Preview Drawer */}
          {showPromptPreview && (
            <div className="p-4 bg-[#0B0E14] border-b border-[#222A3A] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">
                  Pratinjau Prompt untuk AI (Claude / Gemini)
                </span>
                <button
                  type="button"
                  onClick={() => handleCopyPrompt('single')}
                  className="text-xs text-sky-400 hover:underline"
                >
                  Salin Teks Ini
                </button>
              </div>
              <pre className="max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300 bg-[#121722] border border-[#232B3D] rounded-lg p-3 whitespace-pre-wrap">
                {singlePrompt}
              </pre>
            </div>
          )}

          {/* Active Scene Brief Bar */}
          {activeScene && (
            <div className="px-4 py-2 bg-[#141A26] border-b border-[#222A3A] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-medium text-slate-200 truncate">{activeScene.title}</span>
                <span className="text-slate-500 hidden sm:inline">·</span>
                <span className="text-slate-400 truncate max-w-xs hidden sm:inline">
                  {activeScene.narration}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <label
                  htmlFor="animasi-emphasis-input"
                  className="text-[11px] font-medium text-slate-400"
                >
                  Garis bawah:
                </label>
                <input
                  id="animasi-emphasis-input"
                  type="text"
                  value={activeScene.emphasis ?? ''}
                  onChange={(e) =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      scenes: prev.scenes.map((sc, idx) =>
                        idx === safeIdx ? { ...sc, emphasis: e.target.value } : sc
                      ),
                    }))
                  }
                  placeholder="kata emphasis"
                  className="w-32 bg-[#0B0E14] border border-[#263042] rounded px-2 py-1 text-[11px] text-amber-300 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* Scene JS Code Editor */}
          <div className="flex-1 flex flex-col min-h-[280px] relative">
            <textarea
              aria-label="Editor kode animasi JavaScript Canvas"
              spellCheck={false}
              value={activeScene?.code ?? ''}
              onChange={(e) => handleSceneCodeChange(e.target.value)}
              placeholder="// Tempel kode animasi JavaScript Canvas (s.kamera, s.rect, s.circle, s.text, ...) di sini"
              className="flex-1 w-full resize-none bg-[#0B0E14] p-4 font-mono text-xs sm:text-[13px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:outline-none"
            />

            {displayError && (
              <div
                role="alert"
                className="px-4 py-2.5 bg-rose-950/90 border-t border-rose-500/50 text-xs font-mono text-rose-200"
              >
                Kesalahan Kode: {displayError}
              </div>
            )}
          </div>
        </section>

        {/* Right Pane: Live Canvas Viewport + Controls + Timeline */}
        <section
          ref={previewContainerRef}
          className={
            isFullscreen
              ? 'fixed inset-0 z-50 flex flex-col bg-[#07090E] overflow-hidden'
              : 'lg:col-span-5 flex flex-col bg-[#121722] border border-[#222A3A] rounded-xl overflow-hidden'
          }
        >
          {/* Canvas Stage */}
          <div
            onDoubleClick={handleToggleFullscreen}
            title="Klik dua kali untuk layar penuh"
            className="relative flex-1 bg-[#07090E] p-4 flex items-center justify-center min-h-[340px] overflow-hidden"
          >
            <button
              type="button"
              onClick={handleToggleFullscreen}
              aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Layar penuh preview video'}
              title={isFullscreen ? 'Keluar Layar Penuh (Esc)' : 'Layar Penuh'}
              className="absolute top-3 right-3 z-10 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#121722]/85 hover:bg-[#1C2436] border border-[#2B364B] text-slate-200 hover:text-white text-xs backdrop-blur-sm transition-colors shadow-lg"
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
              )}
              <span>{isFullscreen ? 'Keluar' : 'Full Screen'}</span>
            </button>

            <div
              className="relative shadow-2xl border border-[#232B3D] rounded-lg overflow-hidden bg-black"
              style={{
                aspectRatio: `${dims.width} / ${dims.height}`,
                maxHeight: isFullscreen ? 'calc(100vh - 150px)' : 'calc(100vh - 290px)',
                maxWidth: isFullscreen
                  ? `calc((100vh - 150px) * ${dims.width} / ${dims.height})`
                  : '100%',
                height: project.aspectRatio === '9:16' ? '100%' : 'auto',
                width: project.aspectRatio === '9:16' ? 'auto' : '100%',
              }}
            >
              <canvas
                ref={canvasRef}
                data-testid="motion-canvas"
                width={dims.width}
                height={dims.height}
                className="w-full h-full block"
              />
            </div>
          </div>

          {/* Transport & Timeline */}
          <div className="p-4 border-t border-[#222A3A] space-y-3 bg-[#121722]">
            {/* Timeline Scrubber with Scene Segments */}
            <div className="space-y-1.5">
              <div className="flex h-6 rounded-md overflow-hidden border border-[#263042] bg-[#0B0E14]">
                {project.scenes.map((sc, idx) => {
                  const pct = (Math.max(0.5, sc.durationSec) / Math.max(0.5, totalSec)) * 100;
                  const isCurrent =
                    resolveSceneAtTime(project.scenes, currentTime).sceneIndex === idx;
                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => selectScene(idx)}
                      style={{ width: `${pct}%` }}
                      title={`${sc.title} (${sc.durationSec.toFixed(1)}s)`}
                      className={`h-full border-r border-[#1F2737] last:border-r-0 text-[11px] font-mono truncate px-1.5 transition-colors ${
                        isCurrent
                          ? 'bg-sky-500/20 text-sky-300'
                          : 'text-slate-400 hover:bg-[#192130]'
                      }`}
                    >
                      S{idx + 1}
                    </button>
                  );
                })}
              </div>

              <input
                type="range"
                aria-label="Timeline video"
                min={0}
                max={totalSec}
                step={0.02}
                value={currentTime}
                onChange={(e) => {
                  setIsPlaying(false);
                  seekToTime(Number(e.target.value));
                }}
                className="w-full accent-sky-400 cursor-pointer h-1.5"
              />
            </div>

            {/* Playback Buttons */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  aria-label={isPlaying ? 'Jeda animasi' : 'Putar animasi'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs hover:bg-sky-400 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Play className="w-4 h-4" aria-hidden="true" />
                  )}
                  <span>{isPlaying ? 'Jeda' : 'Putar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsPlaying(false);
                    seekToTime(0);
                  }}
                  aria-label="Ulang dari awal"
                  className="p-2 rounded-lg bg-[#182030] border border-[#2B364B] text-slate-300 hover:text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <span className="font-mono text-xs text-slate-300 tabular-nums ml-1">
                  {formatTimecode(currentTime)} / {formatTimecode(totalSec)}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMuteSfx((m) => !m)}
                  aria-label={muteSfx ? 'Aktifkan efek suara' : 'Bisukan efek suara'}
                  title={muteSfx ? 'SFX Dibisukan' : 'SFX Aktif'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs ${
                    muteSfx
                      ? 'bg-[#0B0E14] border-[#263042] text-slate-500'
                      : 'bg-[#182030] border-[#2B364B] text-slate-200'
                  }`}
                >
                  {muteSfx ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>SFX</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMuteVoice((m) => !m)}
                  aria-label={muteVoice ? 'Aktifkan suara narasi' : 'Bisukan suara narasi'}
                  title={muteVoice ? 'Narasi Dibisukan' : 'Narasi Aktif'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs ${
                    muteVoice
                      ? 'bg-[#0B0E14] border-[#263042] text-slate-500'
                      : 'bg-[#182030] border-[#2B364B] text-slate-200'
                  }`}
                >
                  {muteVoice ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  <span>Suara</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateProject((prev) => ({
                      ...prev,
                      subtitles: { ...prev.subtitles, enabled: !prev.subtitles.enabled },
                    }))
                  }
                  aria-label="Toggle subtitle di kanvas"
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs ${
                    project.subtitles.enabled
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                      : 'bg-[#0B0E14] border-[#263042] text-slate-500'
                  }`}
                >
                  <Captions className="w-3.5 h-3.5" />
                  <span>Sub</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSubtitleStudioOpen(true)}
                  aria-label="Desain Subtitle"
                  title="Desain & Preview Subtitle"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#2B364B] bg-[#182030] text-slate-200 hover:text-sky-300 hover:border-sky-500/40 text-xs"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Gaya Sub</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsWatermarkModalOpen(true)}
                  aria-label="Pengaturan Watermark"
                  title="Watermark Logo Sosial Media"
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs ${
                    project.watermark?.enabled && (project.watermark.platforms?.length ?? 0) > 0
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'border-[#2B364B] bg-[#182030] text-slate-200 hover:text-sky-300 hover:border-sky-500/40'
                  }`}
                >
                  <Stamp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Watermark</span>
                  {project.watermark?.enabled && (project.watermark.platforms?.length ?? 0) > 0 && (
                    <span className="font-mono text-[10px] px-1 rounded bg-emerald-500/20">
                      {project.watermark.platforms.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Mode layar penuh'}
                  title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs ${
                    isFullscreen
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                      : 'bg-[#182030] border-[#2B364B] text-slate-200 hover:text-white'
                  }`}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      <SubtitleStudioModal
        isOpen={isSubtitleStudioOpen}
        onClose={() => setIsSubtitleStudioOpen(false)}
        project={project}
        palette={palette}
        onUpdateProject={onUpdateProject}
      />

      <WatermarkModal
        isOpen={isWatermarkModalOpen}
        onClose={() => setIsWatermarkModalOpen(false)}
        project={project}
        palette={palette}
        onUpdateProject={onUpdateProject}
      />
    </main>
  );
}
