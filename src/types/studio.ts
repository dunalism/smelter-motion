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

export type SubtitleStyle =
  // Legacy / Core 3 styles (preserved for 100% backward compatibility)
  | 'clean'
  | 'boxed'
  | 'ivory-capsule'
  // A. Minimal & Editorial
  | 'clean-minimal'
  | 'editorial-serif'
  | 'cinematic-caption'
  | 'minimal-underline'
  | 'split-editorial'
  // B. Modern & Social Media
  | 'modern-bold'
  | 'dynamic-capsule'
  | 'gradient-typography'
  | 'stacked-words'
  | 'floating-caption'
  // C. Kinetic Typography
  | 'kinetic-pop'
  | 'bounce-typography'
  | 'staggered-text'
  | 'scale-emphasis'
  | 'vertical-reveal'
  | 'directional-slide'
  | 'letter-spacing-reveal'
  // D. Creative & Artistic
  | 'handwritten'
  | 'marker-highlight'
  | 'sketch-caption'
  | 'text-stamp'
  | 'chalk-typography'
  | 'cutout-typography'
  | 'scribble-underline'
  // E. Cinematic & Dramatic
  | 'cinematic-fade'
  | 'dramatic-reveal'
  | 'blur-reveal'
  | 'glitch-typography'
  | 'shadow-depth'
  | 'focus-word';

export type SubtitleAnimation =
  // Legacy / Core 3 animations
  | 'static'
  | 'typewriter'
  | 'word-highlight'
  // New 20 motion animations
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'scale'
  | 'pop'
  | 'bounce'
  | 'blur'
  | 'letter-reveal'
  | 'word-stagger'
  | 'line-reveal'
  | 'mask-reveal'
  | 'elastic'
  | 'rotate'
  | 'spring'
  | 'flip'
  | 'glitch'
  | 'tracking-reveal'
  | 'highlight-sweep'
  | 'underline-draw'
  | 'marker-draw';

export type SubtitleExitAnimation =
  | 'none'
  | 'fade'
  | 'slide-down'
  | 'slide-up'
  | 'scale'
  | 'blur';

export type SubtitleEasing =
  | 'linear'
  | 'easeOut'
  | 'easeInOut'
  | 'spring'
  | 'back'
  | 'bounce';

export type SubtitleDirection = 'up' | 'down' | 'left' | 'right';

export type SubtitleEmphasisStyle =
  | 'underline'
  | 'color'
  | 'bold'
  | 'scale'
  | 'bg-highlight'
  | 'marker'
  | 'glow'
  | 'accent'
  | 'font'
  | 'pop';

export type SubtitlePresetId =
  | 'cinematic'
  | 'documentary'
  | 'explainer'
  | 'storytelling'
  | 'hand-drawn'
  | 'kinetic'
  | 'minimalist'
  | 'dramatic'
  | 'social-media';

export interface SubtitleTypographySettings {
  fontFamily?: string;
  fontWeight?: number;
  textColor?: string;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: 'left' | 'center' | 'right';
  textTransform?: 'none' | 'uppercase' | 'lowercase';
}

export interface SubtitleAppearanceSettings {
  bgColor?: string;
  bgOpacity?: number;
  borderRadius?: number;
  paddingX?: number;
  paddingY?: number;
  textShadow?: number;
  outlineWidth?: number;
  outlineColor?: string;
  highlightColor?: string;
}

export interface SubtitleAnimationSettings {
  exit?: SubtitleExitAnimation;
  duration?: number;
  delay?: number;
  easing?: SubtitleEasing;
  direction?: SubtitleDirection;
  intensity?: number;
}

export interface SubtitlePositionSettings {
  verticalPercent?: number; // 10..92
  horizontalAlign?: 'left' | 'center' | 'right';
  maxWidthPercent?: number; // 45..94
  safeAreaMargin?: number; // px
}

export interface SubtitleEmphasisSettings {
  style?: SubtitleEmphasisStyle;
  color?: string;
  scale?: number;
  autoHighlight?: boolean;
}

export interface SubtitleSettings {
  enabled: boolean;
  fontSize: number;
  position: 'bottom' | 'lower-third';
  style: SubtitleStyle;
  animation?: SubtitleAnimation;
  presetId?: SubtitlePresetId;
  typography?: SubtitleTypographySettings;
  appearance?: SubtitleAppearanceSettings;
  animationConfig?: SubtitleAnimationSettings;
  positionConfig?: SubtitlePositionSettings;
  emphasisConfig?: SubtitleEmphasisSettings;
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
