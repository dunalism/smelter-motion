import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProjectState, SceneAudio } from '../types/studio';
import { formatTimecode, getTotalDuration } from '../engine/motionMath';
import { ApiRequestError, postJson } from '../utils/api';
import {
  filterVoicesByGender,
  getVoicePreset,
  TTS_MODELS,
  TTS_VOICES,
  type TtsModelId,
  type TtsVoicePreset,
  type VoiceGender,
} from '../data/ttsVoices';
import {
  ArrowRight,
  Check,
  Clock,
  KeyRound,
  Link2,
  Loader2,
  Mic,
  Play,
  Square,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';

interface SuaraStepProps {
  project: ProjectState;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
  onNextStep: () => void;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

async function measureAudioDuration(dataUrl: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const dur = Number.isFinite(audio.duration) ? Number(audio.duration.toFixed(2)) : undefined;
      resolve(dur);
    };
    audio.onerror = () => resolve(undefined);
    audio.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Gagal membaca file audio.'));
    reader.readAsDataURL(file);
  });
}

export function SuaraStep({
  project,
  onUpdateProject,
  onNextStep,
  hasApiKey,
  onOpenApiKeyModal,
}: SuaraStepProps) {
  const [ttsModel, setTtsModel] = useState<TtsModelId>('gemini-3.8-flash-tts');
  const [genderFilter, setGenderFilter] = useState<'all' | VoiceGender>('all');
  const [voiceName, setVoiceName] = useState<string>('Kore');
  const [voiceStyle, setVoiceStyle] = useState<string>(
    getVoicePreset('Kore').defaultStylePrompt
  );
  const [hasCustomStyle, setHasCustomStyle] = useState(false);

  const [loadingSceneId, setLoadingSceneId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [previewLoadingVoiceId, setPreviewLoadingVoiceId] = useState<string | null>(null);
  const [playingSampleVoiceId, setPlayingSampleVoiceId] = useState<string | null>(null);
  const [recordingSceneId, setRecordingSceneId] = useState<string | null>(null);
  const [masterUrlInput, setMasterUrlInput] = useState(project.masterAudioUrl ?? '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsApiKeyAction, setNeedsApiKeyAction] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const sampleCacheRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (hasApiKey && needsApiKeyAction) {
      setErrorMsg(null);
      setNeedsApiKeyAction(false);
    }
  }, [hasApiKey, needsApiKeyAction]);

  useEffect(() => {
    return () => {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
        sampleAudioRef.current = null;
      }
    };
  }, []);

  const totalSec = getTotalDuration(project.scenes);
  const activeVoice = useMemo(() => getVoicePreset(voiceName), [voiceName]);
  const visibleVoices = useMemo(() => filterVoicesByGender(genderFilter), [genderFilter]);
  const femaleCount = useMemo(() => filterVoicesByGender('female').length, []);
  const maleCount = useMemo(() => filterVoicesByGender('male').length, []);

  const handleSelectVoice = (voice: TtsVoicePreset) => {
    setVoiceName(voice.id);
    if (!hasCustomStyle) {
      setVoiceStyle(voice.defaultStylePrompt);
    }
  };

  const stopSampleAudio = () => {
    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
      sampleAudioRef.current = null;
    }
    setPlayingSampleVoiceId(null);
  };

  const handleToggleSampleVoice = async (voice: TtsVoicePreset) => {
    if (playingSampleVoiceId === voice.id) {
      stopSampleAudio();
      return;
    }

    stopSampleAudio();
    setErrorMsg(null);
    setNeedsApiKeyAction(false);

    const cacheKey = `${ttsModel}:${voice.id}`;
    let dataUrl = sampleCacheRef.current.get(cacheKey);

    if (!dataUrl) {
      setPreviewLoadingVoiceId(voice.id);
      try {
        const res = await postJson<{ audioDataUrl: string }>('/api/generate-tts', {
          text: voice.sampleText,
          voiceName: voice.id,
          style: voice.defaultStylePrompt,
          model: ttsModel,
        });
        dataUrl = res.audioDataUrl;
        sampleCacheRef.current.set(cacheKey, dataUrl);
      } catch (err) {
        if (
          err instanceof ApiRequestError &&
          (err.status === 401 || err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY')
        ) {
          setNeedsApiKeyAction(true);
        }
        setErrorMsg(
          err instanceof Error
            ? err.message
            : `Gagal memutar contoh suara ${voice.name}.`
        );
        setPreviewLoadingVoiceId(null);
        return;
      } finally {
        setPreviewLoadingVoiceId(null);
      }
    }

    const audio = new Audio(dataUrl);
    sampleAudioRef.current = audio;
    setPlayingSampleVoiceId(voice.id);
    audio.onended = () => {
      if (sampleAudioRef.current === audio) {
        sampleAudioRef.current = null;
        setPlayingSampleVoiceId(null);
      }
    };
    audio.onerror = () => {
      if (sampleAudioRef.current === audio) {
        sampleAudioRef.current = null;
        setPlayingSampleVoiceId(null);
      }
      setErrorMsg(`Audio contoh ${voice.name} gagal diputar oleh browser.`);
    };
    try {
      await audio.play();
    } catch {
      setPlayingSampleVoiceId(null);
    }
  };

  const updateSceneAudio = (sceneId: string, audio: SceneAudio, syncDuration?: number) => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc) =>
        sc.id === sceneId
          ? {
              ...sc,
              audio,
              durationSec:
                syncDuration && syncDuration > 0.5
                  ? Math.max(syncDuration, sc.durationSec)
                  : sc.durationSec,
            }
          : sc
      ),
    }));
  };

  const generateTtsForScene = async (sceneId: string, text: string) => {
    if (!text.trim()) {
      setNeedsApiKeyAction(false);
      setErrorMsg('Teks narasi scene ini masih kosong.');
      return;
    }
    setErrorMsg(null);
    setNeedsApiKeyAction(false);
    setLoadingSceneId(sceneId);
    try {
      const data = await postJson<{
        audioDataUrl: string;
        durationSec?: number;
        model?: string;
      }>('/api/generate-tts', {
        text,
        voiceName,
        style: voiceStyle,
        model: ttsModel,
      });
      const dur = Number(data.durationSec) || (await measureAudioDuration(data.audioDataUrl));
      const usedModel = data.model || ttsModel;
      const shortModel =
        usedModel === 'gemini-3.8-flash-lite-tts' ? 'flash-lite-tts' : 'flash-tts';
      updateSceneAudio(sceneId, {
        sourceType: 'tts',
        dataUrl: data.audioDataUrl,
        fileName: `AI-${voiceName}-${shortModel}.wav`,
        durationSec: dur,
        voiceName,
        voiceStyle,
        ttsModel: shortModel,
      });
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        (err.status === 401 || err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY')
      ) {
        setNeedsApiKeyAction(true);
      }
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat suara AI.');
    } finally {
      setLoadingSceneId(null);
    }
  };

  const handleGenerateAllTts = async () => {
    setErrorMsg(null);
    setNeedsApiKeyAction(false);
    setBatchLoading(true);
    try {
      for (const sc of project.scenes) {
        if (!sc.narration.trim()) continue;
        setLoadingSceneId(sc.id);
        const data = await postJson<{
          audioDataUrl: string;
          durationSec?: number;
          model?: string;
        }>('/api/generate-tts', {
          text: sc.narration,
          voiceName,
          style: voiceStyle,
          model: ttsModel,
        });
        const dur = Number(data.durationSec) || (await measureAudioDuration(data.audioDataUrl));
        const usedModel = data.model || ttsModel;
        const shortModel =
          usedModel === 'gemini-3.8-flash-lite-tts' ? 'flash-lite-tts' : 'flash-tts';
        updateSceneAudio(sc.id, {
          sourceType: 'tts',
          dataUrl: data.audioDataUrl,
          fileName: `AI-${voiceName}-${shortModel}.wav`,
          durationSec: dur,
          voiceName,
          voiceStyle,
          ttsModel: shortModel,
        });
      }
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        (err.status === 401 || err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY')
      ) {
        setNeedsApiKeyAction(true);
      }
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat suara batch.');
    } finally {
      setLoadingSceneId(null);
      setBatchLoading(false);
    }
  };

  const handleUploadSceneAudio = async (sceneId: string, file: File) => {
    setErrorMsg(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const dur = await measureAudioDuration(dataUrl);
      updateSceneAudio(sceneId, {
        sourceType: 'upload',
        dataUrl,
        fileName: file.name,
        durationSec: dur,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat file audio.');
    }
  };

  const handleUploadMasterAudio = async (file: File) => {
    setErrorMsg(null);
    try {
      const dataUrl = await fileToDataUrl(file);
      const dur = await measureAudioDuration(dataUrl);
      onUpdateProject((prev) => ({
        ...prev,
        masterAudioUrl: dataUrl,
        masterAudioName: file.name,
        masterAudioDurationSec: dur,
      }));
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memuat master audio.');
    }
  };

  const handleApplyMasterUrl = async () => {
    const url = masterUrlInput.trim();
    if (!url) return;
    const dur = await measureAudioDuration(url);
    onUpdateProject((prev) => ({
      ...prev,
      masterAudioUrl: url,
      masterAudioName: 'Audio Eksternal',
      masterAudioDurationSec: dur,
    }));
  };

  const toggleRecording = async (sceneId: string) => {
    if (recordingSceneId === sceneId && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingSceneId(null);
      return;
    }

    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = String(reader.result);
          const dur = await measureAudioDuration(dataUrl);
          updateSceneAudio(sceneId, {
            sourceType: 'recording',
            dataUrl,
            fileName: 'Rekaman-Mikrofon.webm',
            durationSec: dur,
          });
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingSceneId(sceneId);
    } catch {
      setErrorMsg('Izin mikrofon tidak tersedia atau ditolak oleh browser.');
    }
  };

  const syncAllDurationsToAudio = () => {
    onUpdateProject((prev) => ({
      ...prev,
      scenes: prev.scenes.map((sc) =>
        sc.audio.durationSec && sc.audio.durationSec > 0.5
          ? { ...sc, durationSec: Number((sc.audio.durationSec + 0.35).toFixed(2)) }
          : sc
      ),
    }));
  };

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#222A3A] pb-5">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">Suara Narasi &amp; Audio</h1>
            <p className="mt-1 text-sm text-slate-400">
              Pilih model TTS dan karakter suara wanita atau pria lengkap dengan contohnya, atau unggah audio Anda sendiri.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-xs text-slate-400 tabular-nums">
              Total {formatTimecode(totalSec)}
            </span>
            <button
              type="button"
              onClick={onNextStep}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-slate-950 font-semibold text-sm hover:bg-sky-400 transition-colors"
            >
              <span>Lanjut ke Animasi</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {!hasApiKey && (
          <div className="rounded-lg bg-amber-950/30 border border-amber-500/35 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-amber-200 leading-relaxed">
              Pembuatan suara TTS AI &amp; tombol Dengar Contoh menggunakan API Key Gemini Anda sendiri. Upload audio atau rekam mikrofon tetap bisa dipakai tanpa API key.
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

        {/* AI Voice Settings + Model Selector + 20-Voice Catalog */}
        <section className="bg-[#121722] border border-[#222A3A] rounded-xl p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Generator Suara Narasi AI
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Suara terpilih:{' '}
                <span className="text-slate-100 font-semibold">{activeVoice.name}</span> (
                {activeVoice.gender === 'female' ? 'Wanita' : 'Pria'}) ·{' '}
                <span className="font-mono text-sky-300">
                  {ttsModel === 'gemini-3.8-flash-lite-tts' ? 'flash-lite-tts' : 'flash-tts'}
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={syncAllDurationsToAudio}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-200 hover:bg-[#1E283C]"
              >
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sinkronkan Durasi Scene ke Audio</span>
              </button>
              <button
                type="button"
                onClick={handleGenerateAllTts}
                disabled={batchLoading || loadingSceneId !== null}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-xs font-semibold hover:bg-sky-400 disabled:opacity-50"
              >
                {batchLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                ) : (
                  <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{batchLoading ? 'Membuat Semua Suara...' : 'Buat Suara AI Semua Scene'}</span>
              </button>
            </div>
          </div>

          {/* Model Selector: flash-tts vs flash-lite-tts */}
          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-300">
              Pilih Model Suara TTS
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Pilih Model Suara TTS">
              {TTS_MODELS.map((m) => {
                const selected = ttsModel === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setTtsModel(m.id)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selected
                        ? 'bg-[#172133] border-sky-500 text-white'
                        : 'bg-[#0B0E14] border-[#252E40] text-slate-300 hover:border-slate-500 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">{m.label}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          selected
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                            : 'bg-[#161D2B] text-slate-400 border border-[#263042]'
                        }`}
                      >
                        {m.shortLabel}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400 leading-snug">{m.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gender Filter & Voice Catalog */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-300">
                Karakter Suara ({TTS_VOICES.length} Pilihan — Wanita &amp; Pria)
              </span>
              <div className="flex items-center gap-1.5" role="tablist" aria-label="Filter gender suara">
                <button
                  type="button"
                  role="tab"
                  aria-selected={genderFilter === 'all'}
                  onClick={() => setGenderFilter('all')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    genderFilter === 'all'
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'bg-[#0B0E14] border border-[#263042] text-slate-300 hover:text-white'
                  }`}
                >
                  Semua ({TTS_VOICES.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={genderFilter === 'female'}
                  onClick={() => setGenderFilter('female')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    genderFilter === 'female'
                      ? 'bg-fuchsia-500/25 border border-fuchsia-400/60 text-fuchsia-100 font-semibold'
                      : 'bg-[#0B0E14] border border-[#263042] text-slate-300 hover:text-white'
                  }`}
                >
                  Wanita ({femaleCount})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={genderFilter === 'male'}
                  onClick={() => setGenderFilter('male')}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    genderFilter === 'male'
                      ? 'bg-cyan-500/25 border border-cyan-400/60 text-cyan-100 font-semibold'
                      : 'bg-[#0B0E14] border border-[#263042] text-slate-300 hover:text-white'
                  }`}
                >
                  Pria ({maleCount})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[430px] overflow-y-auto pr-1">
              {visibleVoices.map((voice) => {
                const isSelected = voiceName === voice.id;
                const isSampleLoading = previewLoadingVoiceId === voice.id;
                const isSamplePlaying = playingSampleVoiceId === voice.id;
                const isFemale = voice.gender === 'female';

                return (
                  <div
                    key={voice.id}
                    className={`rounded-lg border p-3.5 transition-colors flex flex-col justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-[#172133] border-sky-500'
                        : 'bg-[#0B0E14] border-[#242E42] hover:border-slate-500'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectVoice(voice)}
                          aria-pressed={isSelected}
                          className="flex items-center gap-2 text-left min-w-0 flex-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
                        >
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-sky-500 border-sky-400 text-slate-950'
                                : 'border-slate-600'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-3" />}
                          </span>
                          <span className="text-sm font-semibold text-white truncate">
                            {voice.name}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${
                              isFemale
                                ? 'bg-fuchsia-500/15 border-fuchsia-400/40 text-fuchsia-200'
                                : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                            }`}
                          >
                            {isFemale ? 'Wanita' : 'Pria'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleSampleVoice(voice)}
                          disabled={isSampleLoading}
                          aria-label={`Dengar contoh suara ${voice.name}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium shrink-0 transition-colors ${
                            isSamplePlaying
                              ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                              : 'bg-[#151D2C] border-[#2B364B] text-slate-200 hover:bg-[#1E293E]'
                          } disabled:opacity-50`}
                        >
                          {isSampleLoading ? (
                            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                          ) : isSamplePlaying ? (
                            <Square className="w-3 h-3 fill-current" aria-hidden="true" />
                          ) : (
                            <Play className="w-3 h-3 fill-current" aria-hidden="true" />
                          )}
                          <span>
                            {isSampleLoading
                              ? 'Memuat...'
                              : isSamplePlaying
                                ? 'Stop'
                                : 'Dengar Contoh'}
                          </span>
                        </button>
                      </div>

                      <div className="text-xs text-slate-300 space-y-1">
                        <div>
                          <span className="text-slate-400 font-medium">Gaya bicara: </span>
                          <span className="text-slate-100">{voice.speakingStyle}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-medium">Cocok untuk: </span>
                          <span className="text-slate-300">{voice.bestFor}</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] italic text-slate-400 bg-[#121722] border border-[#1E2638] rounded px-2.5 py-1.5 leading-relaxed">
                      &ldquo;{voice.sampleText}&rdquo;
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Speaking Style Direction Override */}
          <div className="pt-1 border-t border-[#1D2536]">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <label htmlFor="tts-style" className="block text-xs font-medium text-slate-300">
                Arahan Gaya Bicara (dapat disesuaikan)
              </label>
              {hasCustomStyle && (
                <button
                  type="button"
                  onClick={() => {
                    setHasCustomStyle(false);
                    setVoiceStyle(activeVoice.defaultStylePrompt);
                  }}
                  className="text-[11px] text-sky-400 hover:underline"
                >
                  Reset ke gaya bawaan {activeVoice.name}
                </button>
              )}
            </div>
            <input
              id="tts-style"
              type="text"
              value={voiceStyle}
              onChange={(e) => {
                setHasCustomStyle(true);
                setVoiceStyle(e.target.value);
              }}
              className="w-full rounded-lg bg-[#0B0E14] border border-[#2A3346] px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </section>

        {/* Master Audio Track (Upload / Paste URL) */}
        <section className="bg-[#121722] border border-[#222A3A] rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-semibold text-white">
                Tempelkan Trek Audio Utama (Opsional)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Gunakan jika Anda sudah memiliki satu file rekaman suara lengkap atau musik latar untuk seluruh video.
              </p>
            </div>

            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-200 hover:bg-[#1E283C] cursor-pointer">
              <Upload className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Upload File Audio</span>
              <input
                type="file"
                accept="audio/*"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadMasterAudio(file);
                }}
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="url"
              aria-label="Tempel tautan audio utama"
              value={masterUrlInput}
              onChange={(e) => setMasterUrlInput(e.target.value)}
              placeholder="Atau tempel URL file audio (.mp3 / .wav)..."
              className="flex-1 bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleApplyMasterUrl}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-200 hover:bg-[#1E283C]"
            >
              <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Pasang URL</span>
            </button>
          </div>

          {project.masterAudioUrl && (
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <audio controls src={project.masterAudioUrl} className="h-9 flex-1 min-w-[240px]" />
              <span className="text-xs text-slate-400 tabular-nums">
                {project.masterAudioName}
                {project.masterAudioDurationSec
                  ? ` · ${project.masterAudioDurationSec.toFixed(2)}s`
                  : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  setMasterUrlInput('');
                  onUpdateProject((prev) => ({
                    ...prev,
                    masterAudioUrl: undefined,
                    masterAudioName: undefined,
                    masterAudioDurationSec: undefined,
                  }));
                }}
                aria-label="Hapus trek audio utama"
                className="p-2 rounded-lg border border-[#263042] text-slate-400 hover:text-rose-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </section>

        {/* Per-Scene Audio List */}
        <section className="space-y-3">
          <h2 className="font-display text-base font-semibold text-white">
            Suara per Scene
          </h2>
          {project.scenes.map((scene, idx) => {
            const isLoading = loadingSceneId === scene.id;
            const isRecording = recordingSceneId === scene.id;
            const hasAudio = Boolean(scene.audio.dataUrl);

            return (
              <div
                key={scene.id}
                className="bg-[#121722] border border-[#222A3A] rounded-xl p-4 sm:p-5 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-xs text-slate-400 tabular-nums">
                      <span className="font-mono font-semibold text-sky-400">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-200">{scene.title}</span>
                      <span aria-hidden="true">·</span>
                      <span>Target {scene.durationSec.toFixed(1)}s</span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">
                      {scene.narration || 'Belum ada teks narasi.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => generateTtsForScene(scene.id, scene.narration)}
                      disabled={isLoading || batchLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/40 text-xs font-medium text-sky-300 hover:bg-sky-500/25 disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{isLoading ? 'Membuat...' : 'Buat Suara AI'}</span>
                    </button>

                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-200 hover:bg-[#1E283C] cursor-pointer">
                      <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="audio/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleUploadSceneAudio(scene.id, file);
                        }}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => toggleRecording(scene.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                        isRecording
                          ? 'bg-rose-500/20 border-rose-500 text-rose-200'
                          : 'bg-[#182030] border-[#2B364B] text-slate-200 hover:bg-[#1E283C]'
                      }`}
                    >
                      {isRecording ? (
                        <Square className="w-3.5 h-3.5" aria-hidden="true" />
                      ) : (
                        <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>{isRecording ? 'Berhenti' : 'Rekam'}</span>
                    </button>
                  </div>
                </div>

                {hasAudio && (
                  <div className="pt-2 border-t border-[#1D2433] flex flex-wrap items-center gap-3">
                    <audio controls src={scene.audio.dataUrl} className="h-9 flex-1 min-w-[220px]" />
                    <span className="font-mono text-xs text-slate-400 tabular-nums">
                      {scene.audio.fileName || 'Audio'}
                      {scene.audio.durationSec ? ` · ${scene.audio.durationSec.toFixed(2)}s` : ''}
                    </span>
                    {scene.audio.durationSec && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateProject((prev) => ({
                            ...prev,
                            scenes: prev.scenes.map((s) =>
                              s.id === scene.id
                                ? {
                                    ...s,
                                    durationSec: Number(
                                      (scene.audio.durationSec! + 0.35).toFixed(2)
                                    ),
                                  }
                                : s
                            ),
                          }))
                        }
                        className="text-xs px-2.5 py-1 rounded bg-[#182030] border border-[#2B364B] text-slate-300 hover:text-white"
                      >
                        Cocokkan Durasi
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => updateSceneAudio(scene.id, { sourceType: 'none' })}
                      aria-label={`Hapus audio ${scene.title}`}
                      className="p-1.5 rounded-lg border border-[#263042] text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
