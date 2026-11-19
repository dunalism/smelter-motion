export type StudioStep = 'ide' | 'narasi' | 'suara' | 'animasi';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export type PaletteId =
  | 'cyber-hologram'
  | 'arsip-kuno'
  | 'scribble-3d'
  | 'krayon-2d'
  | 'modern-flat'
  | 'paper-cutout'
  | 'kinetik-hud'
  | 'reel-tegas'
  | 'belah-warna'
  | 'peta-gurun'
  | 'garis-tinta';

export interface PalettePreset {
  id: PaletteId;
  name: string;
  bg: string;
  grid: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  isLight?: boolean;
}

export interface VideoStylePreset {
  id: PaletteId;
  name: string;
  tagline: string;
  nuance: string;
  recommendedDurationSec: number;
  palette: PalettePreset;
  subtitleDefaults: {
    style: SubtitleStyle;
    animation: SubtitleAnimation;
  };
  animationCardPrompt: string;
  sampleCode: string;
}

export interface SceneAudio {
  sourceType: 'none' | 'tts' | 'upload' | 'url' | 'recording';
  dataUrl?: string;
  fileName?: string;
  durationSec?: number;
  voiceName?: string;
  voiceStyle?: string;
  ttsModel?: string;
}

export interface SceneItem {
  id: string;
  index: number;
  title: string;
  narration: string;
  emphasis?: string;
  visualBrief: string;
  cameraHint: string;
  durationSec: number;
  code: string;
  audio: SceneAudio;
}

export interface SeoMetadata {
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  title: string;
  description: string;
  short: string;
  tags: string[];
  hashtags: string[];
}

export type SubtitleStyle = 'clean' | 'boxed' | 'ivory-capsule';
export type SubtitleAnimation = 'static' | 'typewriter' | 'word-highlight';

export interface SubtitleSettings {
  enabled: boolean;
  fontSize: number;
  position: 'bottom' | 'lower-third';
  style: SubtitleStyle;
  animation?: SubtitleAnimation;
}

export interface ProjectState {
  title: string;
  topic: string;
  styleTone: string;
  targetDurationSec: number;
  aspectRatio: AspectRatio;
  paletteId: PaletteId;
  subtitles: SubtitleSettings;
  masterAudioUrl?: string;
  masterAudioName?: string;
  masterAudioDurationSec?: number;
  scenes: SceneItem[];
  seo?: SeoMetadata;
}

export interface SfxCall {
  name: string;
  time: number;
  volume: number;
  pitch: number;
}

export interface CameraKeyframe {
  time: number;
  x: number;
  y: number;
  zoom: number;
}

export interface ParsedSceneBlock {
  label: string;
  sceneNumber: number | null;
  code: string;
}
