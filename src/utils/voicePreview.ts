import type { TtsVoicePreset, VoiceGender } from '../data/ttsVoices';

export interface VoicePreviewTuning {
  pitch: number;
  rate: number;
}

const VOICE_TUNING_MAP: Record<string, VoicePreviewTuning> = {
  // Female voices
  Kore: { pitch: 1.08, rate: 1.05 },
  Zephyr: { pitch: 1.18, rate: 1.08 },
  Aoede: { pitch: 1.06, rate: 1.0 },
  Leda: { pitch: 1.2, rate: 1.14 },
  Sulafat: { pitch: 1.02, rate: 0.94 },
  Despina: { pitch: 1.08, rate: 0.92 },
  Callirrhoe: { pitch: 1.12, rate: 1.02 },
  Autonoe: { pitch: 1.04, rate: 0.98 },
  Vindemiatrix: { pitch: 1.0, rate: 0.95 },
  Pulcherrima: { pitch: 1.15, rate: 1.06 },
  // Male voices
  Puck: { pitch: 0.98, rate: 1.12 },
  Charon: { pitch: 0.78, rate: 0.92 },
  Fenrir: { pitch: 0.88, rate: 1.06 },
  Orus: { pitch: 0.84, rate: 1.02 },
  Iapetus: { pitch: 0.92, rate: 0.98 },
  Algieba: { pitch: 0.82, rate: 0.94 },
  Umbriel: { pitch: 0.95, rate: 1.0 },
  Enceladus: { pitch: 0.86, rate: 0.88 },
  Alnilam: { pitch: 0.75, rate: 0.9 },
  Rasalgethi: { pitch: 0.9, rate: 1.0 },
};

const FEMALE_HINTS = ['gadis', 'damayanti', 'female', 'wanita', 'woman', 'siti', 'putri', 'ayu'];
const MALE_HINTS = ['ardi', 'andika', 'male', 'pria', 'man', 'budi', 'joko'];

export function getVoicePreviewTuning(
  voice: Pick<TtsVoicePreset, 'id' | 'gender'>
): VoicePreviewTuning {
  const preset = VOICE_TUNING_MAP[voice.id];
  if (preset) return preset;
  return voice.gender === 'female' ? { pitch: 1.1, rate: 1.0 } : { pitch: 0.88, rate: 1.0 };
}

export function pickBrowserSpeechVoice(
  voices: readonly SpeechSynthesisVoice[],
  gender: VoiceGender
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const isIndonesian = (v: SpeechSynthesisVoice) =>
    v.lang.toLowerCase().replace('_', '-').startsWith('id');

  const idVoices = voices.filter(isIndonesian);
  const pool = idVoices.length > 0 ? idVoices : voices;

  const hints = gender === 'female' ? FEMALE_HINTS : MALE_HINTS;
  const genderMatch = pool.find((v) => {
    const lower = v.name.toLowerCase();
    return hints.some((hint) => lower.includes(hint));
  });

  return genderMatch ?? pool[0] ?? null;
}

export interface SpeakVoiceSampleCallbacks {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
}

export function stopVoiceSample(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore browser speechSynthesis cancel errors
  }
}

export function speakVoiceSample(
  voice: TtsVoicePreset,
  callbacks: SpeakVoiceSampleCallbacks = {}
): boolean {
  if (
    typeof window === 'undefined' ||
    !('speechSynthesis' in window) ||
    typeof SpeechSynthesisUtterance === 'undefined'
  ) {
    callbacks.onError?.(
      'Browser Anda tidak mendukung pemutaran suara lokal (Web Speech API).'
    );
    return false;
  }

  const synth = window.speechSynthesis;
  try {
    synth.cancel();
  } catch {
    // Ignore cancel errors before speaking
  }

  const utterance = new SpeechSynthesisUtterance(voice.sampleText);
  const tuning = getVoicePreviewTuning(voice);
  utterance.lang = 'id-ID';
  utterance.pitch = tuning.pitch;
  utterance.rate = tuning.rate;

  const availableVoices = synth.getVoices();
  const matchedVoice = pickBrowserSpeechVoice(availableVoices, voice.gender);
  if (matchedVoice) {
    utterance.voice = matchedVoice;
  }

  utterance.onstart = () => {
    callbacks.onStart?.();
  };
  utterance.onend = () => {
    callbacks.onEnd?.();
  };
  utterance.onerror = (event) => {
    // 'interrupted' and 'canceled' happen normally when user switches/stops samples
    if (event.error === 'interrupted' || event.error === 'canceled') {
      callbacks.onEnd?.();
      return;
    }
    callbacks.onError?.(`Gagal memutar contoh suara ${voice.name} di browser.`);
  };

  synth.speak(utterance);
  return true;
}
