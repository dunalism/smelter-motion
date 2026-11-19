import type {
  PaletteId,
  PalettePreset,
  SubtitleAnimation,
  SubtitleDirection,
  SubtitleEasing,
  SubtitleEmphasisStyle,
  SubtitleExitAnimation,
  SubtitlePresetId,
  SubtitleSettings,
  SubtitleStyle,
} from '../types/studio';
import {
  SUBTITLE_STYLES_MAP,
  type SubtitleStyleDefinition,
} from './subtitleStylesData';

export {
  FONT_FAMILY_OPTIONS,
  SUBTITLE_CATEGORY_LABELS,
  SUBTITLE_STYLES,
  SUBTITLE_STYLES_MAP,
  type SubtitleDecorMode,
  type SubtitleLayoutMode,
  type SubtitleStyleCategory,
  type SubtitleStyleDefinition,
} from './subtitleStylesData';

export function getSubtitleStyleDef(id?: SubtitleStyle): SubtitleStyleDefinition {
  if (id && SUBTITLE_STYLES_MAP[id]) return SUBTITLE_STYLES_MAP[id];
  return SUBTITLE_STYLES_MAP.boxed;
}

export interface SubtitleAnimationDefinition {
  id: SubtitleAnimation;
  name: string;
  description: string;
  supportsDirection: boolean;
  supportsIntensity: boolean;
  defaultDuration: number;
  defaultEasing: SubtitleEasing;
}

export const SUBTITLE_ANIMATIONS: SubtitleAnimationDefinition[] = [
  { id: 'static', name: 'Statis', description: 'Muncul langsung tanpa animasi.', supportsDirection: false, supportsIntensity: false, defaultDuration: 0.1, defaultEasing: 'linear' },
  { id: 'typewriter', name: 'Mesin Ketik', description: 'Karakter muncul bertahap mengikuti narasi.', supportsDirection: false, supportsIntensity: false, defaultDuration: 0.6, defaultEasing: 'linear' },
  { id: 'word-highlight', name: 'Sorot Kata', description: 'Menyorot kata aktif seiring voiceover.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.45, defaultEasing: 'easeOut' },
  { id: 'fade', name: 'Fade In', description: 'Transisi opacity halus dan bersih.', supportsDirection: false, supportsIntensity: false, defaultDuration: 0.45, defaultEasing: 'easeOut' },
  { id: 'slide-up', name: 'Slide Up', description: 'Meluncur naik dari bawah dengan lembut.', supportsDirection: true, supportsIntensity: true, defaultDuration: 0.45, defaultEasing: 'easeOut' },
  { id: 'slide-down', name: 'Slide Down', description: 'Meluncur turun dari atas.', supportsDirection: true, supportsIntensity: true, defaultDuration: 0.45, defaultEasing: 'easeOut' },
  { id: 'slide-left', name: 'Slide Left', description: 'Masuk dari sisi kanan ke tengah.', supportsDirection: true, supportsIntensity: true, defaultDuration: 0.45, defaultEasing: 'easeOut' },
  { id: 'slide-right', name: 'Slide Right', description: 'Masuk dari sisi kiri ke tengah.', supportsDirection: true, supportsIntensity: true, defaultDuration: 0.45, defaultEasing: 'easeOut' },
  { id: 'scale', name: 'Scale In', description: 'Membesar halus ke ukuran normal.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.4, defaultEasing: 'easeOut' },
  { id: 'pop', name: 'Pop In', description: 'Muncul cepat dengan efek overshoot.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.42, defaultEasing: 'back' },
  { id: 'bounce', name: 'Bounce In', description: 'Pantulan elastis yang hidup.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.6, defaultEasing: 'bounce' },
  { id: 'blur', name: 'Blur In', description: 'Dari buram menjadi tajam sinematik.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.5, defaultEasing: 'easeOut' },
  { id: 'letter-reveal', name: 'Letter Reveal', description: 'Huruf terbuka berurutan dengan halus.', supportsDirection: false, supportsIntensity: false, defaultDuration: 0.55, defaultEasing: 'easeOut' },
  { id: 'word-stagger', name: 'Word Stagger', description: 'Setiap kata muncul bergiliran berirama.', supportsDirection: true, supportsIntensity: true, defaultDuration: 0.5, defaultEasing: 'spring' },
  { id: 'line-reveal', name: 'Line Reveal', description: 'Setiap baris tersingkap bertahap.', supportsDirection: true, supportsIntensity: true, defaultDuration: 0.5, defaultEasing: 'easeOut' },
  { id: 'mask-reveal', name: 'Mask Reveal', description: 'Tersingkap dari balik masking bersih.', supportsDirection: true, supportsIntensity: false, defaultDuration: 0.5, defaultEasing: 'easeInOut' },
  { id: 'elastic', name: 'Elastic In', description: 'Menghentak elastis seperti pegas.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.65, defaultEasing: 'bounce' },
  { id: 'rotate', name: 'Rotate In', description: 'Masuk dengan rotasi sudut halus.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.48, defaultEasing: 'back' },
  { id: 'spring', name: 'Spring Motion', description: 'Gerak fisika pegas natural.', supportsDirection: true, supportsIntensity: true, defaultDuration: 0.55, defaultEasing: 'spring' },
  { id: 'flip', name: 'Flip In', description: 'Efek lipat vertikal 3D semu.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.48, defaultEasing: 'easeOut' },
  { id: 'glitch', name: 'Glitch In', description: 'Gangguan sinyal RGB terkontrol saat masuk.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.45, defaultEasing: 'linear' },
  { id: 'tracking-reveal', name: 'Tracking Reveal', description: 'Jarak antar huruf menyempit ke posisi ideal.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.55, defaultEasing: 'easeOut' },
  { id: 'highlight-sweep', name: 'Highlight Sweep', description: 'Sapuan cahaya menyorot kata demi kata.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.5, defaultEasing: 'easeInOut' },
  { id: 'underline-draw', name: 'Underline Draw', description: 'Garis bawah tergambar progresif di bawah kata.', supportsDirection: false, supportsIntensity: false, defaultDuration: 0.55, defaultEasing: 'easeOut' },
  { id: 'marker-draw', name: 'Marker Draw', description: 'Coretan marker menyapu di belakang kata kunci.', supportsDirection: false, supportsIntensity: true, defaultDuration: 0.55, defaultEasing: 'easeOut' },
];

export const SUBTITLE_EXIT_ANIMATIONS: Array<{ id: SubtitleExitAnimation; name: string }> = [
  { id: 'none', name: 'Tanpa Exit' },
  { id: 'fade', name: 'Fade Out' },
  { id: 'slide-down', name: 'Slide Down' },
  { id: 'slide-up', name: 'Slide Up' },
  { id: 'scale', name: 'Scale Out' },
  { id: 'blur', name: 'Blur Out' },
];

export const SUBTITLE_EASINGS: Array<{ id: SubtitleEasing; name: string }> = [
  { id: 'easeOut', name: 'Ease Out (Halus)' },
  { id: 'easeInOut', name: 'Ease In-Out' },
  { id: 'spring', name: 'Spring (Pegas)' },
  { id: 'back', name: 'Back (Overshoot)' },
  { id: 'bounce', name: 'Bounce (Memantul)' },
  { id: 'linear', name: 'Linear' },
];

export const SUBTITLE_EMPHASIS_STYLES: Array<{ id: SubtitleEmphasisStyle; name: string; desc: string }> = [
  { id: 'underline', name: 'Underline', desc: 'Garis bawah tegas' },
  { id: 'color', name: 'Different Color', desc: 'Warna khusus kata kunci' },
  { id: 'bold', name: 'Bold Weight', desc: 'Bobot huruf lebih tebal' },
  { id: 'scale', name: 'Scale Up', desc: 'Membesar lebih menonjol' },
  { id: 'bg-highlight', name: 'Background Highlight', desc: 'Pil latar belakang di kata' },
  { id: 'marker', name: 'Marker Highlight', desc: 'Coretan stabilo miring' },
  { id: 'glow', name: 'Glow', desc: 'Pendar cahaya lembut' },
  { id: 'accent', name: 'Accent Color', desc: 'Mengikuti warna aksen video' },
  { id: 'font', name: 'Different Font', desc: 'Font kontras (Serif/Display)' },
  { id: 'pop', name: 'Pop Animation', desc: 'Animasi pop khusus kata kunci' },
];

export interface SubtitlePresetDefinition {
  id: SubtitlePresetId;
  name: string;
  tagline: string;
  character: string;
  settings: Partial<SubtitleSettings>;
}

export const SUBTITLE_PRESETS: SubtitlePresetDefinition[] = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    tagline: 'Elegan, minimalis, fade & reveal',
    character: 'Cocok untuk narasi filmis, dokumenter emosional, dan visual atmosferik.',
    settings: {
      style: 'cinematic-caption',
      animation: 'fade',
      fontSize: 26,
      position: 'bottom',
      animationConfig: { exit: 'fade', duration: 0.55, delay: 0.05, easing: 'easeOut', intensity: 0.9 },
      emphasisConfig: { style: 'glow', color: '#FDE047', scale: 1.06 },
    },
  },
  {
    id: 'documentary',
    name: 'Documentary',
    tagline: 'Editorial, bersih, informatif',
    character: 'Tipografi serif/sans proporsional untuk edukasi sejarah & arsip.',
    settings: {
      style: 'editorial-serif',
      animation: 'line-reveal',
      fontSize: 28,
      position: 'bottom',
      animationConfig: { exit: 'fade', duration: 0.45, delay: 0, easing: 'easeOut', intensity: 1 },
      emphasisConfig: { style: 'underline', color: '#E9C46A', scale: 1.05 },
    },
  },
  {
    id: 'explainer',
    name: 'Explainer',
    tagline: 'Modern, bold, word emphasis jelas',
    character: 'Keterbacaan tinggi dengan penekanan kata kunci untuk video tutorial/edukasi.',
    settings: {
      style: 'minimal-underline',
      animation: 'word-stagger',
      fontSize: 28,
      position: 'bottom',
      animationConfig: { exit: 'fade', duration: 0.42, delay: 0, easing: 'spring', intensity: 1 },
      emphasisConfig: { style: 'bg-highlight', color: '#38BDF8', scale: 1.08 },
    },
  },
  {
    id: 'storytelling',
    name: 'Storytelling',
    tagline: 'Dramatis, stagger, smooth reveal',
    character: 'Mengalir bersama ritme suara, memadukan fokus kata dan transisi lembut.',
    settings: {
      style: 'split-editorial',
      animation: 'mask-reveal',
      fontSize: 28,
      position: 'lower-third',
      animationConfig: { exit: 'fade', duration: 0.5, delay: 0.05, easing: 'easeInOut', intensity: 1 },
      emphasisConfig: { style: 'color', color: '#F59E0B', scale: 1.08 },
    },
  },
  {
    id: 'hand-drawn',
    name: 'Hand Drawn',
    tagline: 'Sketch, handwritten, marker',
    character: 'Nuansa organik tulisan tangan & coretan stabilo untuk ilustrasi krayon/sketsa.',
    settings: {
      style: 'marker-highlight',
      animation: 'marker-draw',
      fontSize: 30,
      position: 'bottom',
      animationConfig: { exit: 'fade', duration: 0.48, delay: 0, easing: 'easeOut', intensity: 1 },
      emphasisConfig: { style: 'marker', color: '#FACC15', scale: 1.08 },
    },
  },
  {
    id: 'kinetic',
    name: 'Kinetic',
    tagline: 'Bold, bounce, pop, scale',
    character: 'Energi tinggi, punchy, dan penuh gerak untuk ritme cepat.',
    settings: {
      style: 'kinetic-pop',
      animation: 'pop',
      fontSize: 32,
      position: 'lower-third',
      animationConfig: { exit: 'scale', duration: 0.38, delay: 0, easing: 'back', intensity: 1.25 },
      emphasisConfig: { style: 'pop', color: '#FACC15', scale: 1.18 },
    },
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    tagline: 'Clean, subtle, understated',
    character: 'Tidak mengganggu ilustrasi, rapi, dan ringan dipandang.',
    settings: {
      style: 'clean-minimal',
      animation: 'fade',
      fontSize: 26,
      position: 'bottom',
      animationConfig: { exit: 'fade', duration: 0.4, delay: 0, easing: 'easeOut', intensity: 0.8 },
      emphasisConfig: { style: 'bold', color: '#38BDF8', scale: 1.04 },
    },
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    tagline: 'Kontras, focus word, blur reveal',
    character: 'Atmosfer intens dengan sorotan fokus kata dan kedalaman bayangan.',
    settings: {
      style: 'focus-word',
      animation: 'blur',
      fontSize: 30,
      position: 'lower-third',
      animationConfig: { exit: 'blur', duration: 0.5, delay: 0, easing: 'easeOut', intensity: 1.15 },
      emphasisConfig: { style: 'glow', color: '#FDE047', scale: 1.14 },
    },
  },
  {
    id: 'social-media',
    name: 'Social Media',
    tagline: 'Dinamis, highlight, bold typography',
    character: 'Dioptimalkan untuk Reels/TikTok/Shorts agar langsung mengikat perhatian.',
    settings: {
      style: 'dynamic-capsule',
      animation: 'word-highlight',
      fontSize: 30,
      position: 'lower-third',
      animationConfig: { exit: 'scale', duration: 0.35, delay: 0, easing: 'spring', intensity: 1.15 },
      emphasisConfig: { style: 'bg-highlight', color: '#F59E0B', scale: 1.14 },
    },
  },
];

export const VIDEO_STYLE_TO_SUBTITLE_PRESET: Record<PaletteId, SubtitlePresetId> = {
  'cyber-hologram': 'dramatic',
  'arsip-kuno': 'documentary',
  'scribble-3d': 'kinetic',
  'krayon-2d': 'hand-drawn',
  'modern-flat': 'explainer',
  'paper-cutout': 'storytelling',
  'kinetik-hud': 'kinetic',
  'reel-tegas': 'social-media',
  'belah-warna': 'social-media',
  'peta-gurun': 'documentary',
  'garis-tinta': 'minimalist',
};

export function getRecommendedPresetForVideoStyle(paletteId?: PaletteId): SubtitlePresetId {
  if (paletteId && VIDEO_STYLE_TO_SUBTITLE_PRESET[paletteId]) {
    return VIDEO_STYLE_TO_SUBTITLE_PRESET[paletteId];
  }
  return 'explainer';
}

export function applySubtitlePreset(
  prev: SubtitleSettings,
  presetId: SubtitlePresetId
): SubtitleSettings {
  const preset = SUBTITLE_PRESETS.find((p) => p.id === presetId);
  if (!preset) return prev;
  const styleDef = getSubtitleStyleDef(preset.settings.style || prev.style);
  return {
    ...prev,
    ...preset.settings,
    presetId,
    typography: {
      fontFamily: styleDef.fontFamily,
      fontWeight: styleDef.fontWeight,
      textColor: styleDef.textColor,
      letterSpacing: styleDef.letterSpacing,
      lineHeight: styleDef.lineHeight,
      textAlign: 'center',
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
    animationConfig: {
      exit: 'fade',
      duration: 0.45,
      delay: 0,
      easing: 'easeOut',
      direction: 'up',
      intensity: 1,
      ...preset.settings.animationConfig,
    },
    emphasisConfig: {
      style: styleDef.emphasisStyle,
      color: styleDef.emphasisColor,
      scale: 1.12,
      autoHighlight: prev.emphasisConfig?.autoHighlight ?? false,
      ...preset.settings.emphasisConfig,
    },
  };
}

export interface ResolvedSubtitleConfig {
  styleDef: SubtitleStyleDefinition;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  textTransform: 'none' | 'uppercase' | 'lowercase';
  bgColor: string;
  bgOpacity: number;
  borderRadius: number;
  paddingX: number;
  paddingY: number;
  textShadow: number;
  outlineWidth: number;
  outlineColor: string;
  highlightColor: string;
  entrance: SubtitleAnimation;
  exit: SubtitleExitAnimation;
  duration: number;
  delay: number;
  easing: SubtitleEasing;
  direction: SubtitleDirection;
  intensity: number;
  verticalPercent: number;
  horizontalAlign: 'left' | 'center' | 'right';
  maxWidthPercent: number;
  safeAreaMargin: number;
  emphasisStyle: SubtitleEmphasisStyle;
  emphasisColor: string;
  emphasisScale: number;
  autoHighlight: boolean;
}

export function resolveSubtitleConfig(
  subtitles: SubtitleSettings,
  palette?: PalettePreset
): ResolvedSubtitleConfig {
  const styleDef = getSubtitleStyleDef(subtitles.style);
  const anim = subtitles.animation ?? styleDef.defaultAnimation;
  const animDef =
    SUBTITLE_ANIMATIONS.find((a) => a.id === anim) ?? SUBTITLE_ANIMATIONS[0];

  const typo = subtitles.typography ?? {};
  const app = subtitles.appearance ?? {};
  const animCfg = subtitles.animationConfig ?? {};
  const posCfg = subtitles.positionConfig ?? {};
  const empCfg = subtitles.emphasisConfig ?? {};

  const defaultVertical = subtitles.position === 'lower-third' ? 78 : 86;

  return {
    styleDef,
    fontFamily: typo.fontFamily ?? styleDef.fontFamily,
    fontSize: subtitles.fontSize || 28,
    fontWeight: typo.fontWeight ?? styleDef.fontWeight,
    textColor: typo.textColor ?? styleDef.textColor,
    letterSpacing: typo.letterSpacing ?? styleDef.letterSpacing,
    lineHeight: typo.lineHeight ?? styleDef.lineHeight,
    textAlign: typo.textAlign ?? posCfg.horizontalAlign ?? 'center',
    textTransform: typo.textTransform ?? styleDef.textTransform,
    bgColor: app.bgColor ?? styleDef.bgColor,
    bgOpacity: app.bgOpacity ?? styleDef.bgOpacity,
    borderRadius: app.borderRadius ?? styleDef.borderRadius,
    paddingX: app.paddingX ?? styleDef.paddingX,
    paddingY: app.paddingY ?? styleDef.paddingY,
    textShadow: app.textShadow ?? styleDef.textShadow,
    outlineWidth: app.outlineWidth ?? styleDef.outlineWidth,
    outlineColor: app.outlineColor ?? styleDef.outlineColor,
    highlightColor: app.highlightColor ?? styleDef.highlightColor,
    entrance: anim,
    exit: animCfg.exit ?? 'fade',
    duration: animCfg.duration ?? animDef.defaultDuration,
    delay: animCfg.delay ?? 0,
    easing: animCfg.easing ?? animDef.defaultEasing,
    direction: animCfg.direction ?? 'up',
    intensity: animCfg.intensity ?? 1,
    verticalPercent: posCfg.verticalPercent ?? defaultVertical,
    horizontalAlign: posCfg.horizontalAlign ?? 'center',
    maxWidthPercent: posCfg.maxWidthPercent ?? 84,
    safeAreaMargin: posCfg.safeAreaMargin ?? 28,
    emphasisStyle: empCfg.style ?? styleDef.emphasisStyle,
    emphasisColor:
      empCfg.color ??
      (empCfg.style === 'accent' && palette?.accent
        ? palette.accent
        : styleDef.emphasisColor),
    emphasisScale: empCfg.scale ?? 1.12,
    autoHighlight: empCfg.autoHighlight ?? false,
  };
}

const STOPWORDS_ID_EN = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'ini', 'itu', 'untuk', 'dengan', 'pada',
  'adalah', 'akan', 'atau', 'juga', 'bisa', 'dapat', 'dalam', 'tidak', 'ada',
  'jadi', 'kamu', 'kita', 'saya', 'aku', 'mereka', 'dia', 'nya', 'saat', 'kalau',
  'jika', 'karena', 'supaya', 'agar', 'lebih', 'sangat', 'hanya', 'sudah', 'belum',
  'masih', 'bukan', 'semua', 'setiap', 'antara', 'seperti', 'lalu', 'kemudian',
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'your', 'you',
  'are', 'was', 'were', 'will', 'can', 'just', 'not', 'but', 'have', 'has',
]);

export function extractAutoEmphasisKeywords(narration: string, maxKeywords: number = 2): string[] {
  const words = narration
    .split(/\s+/)
    .map((w) => w.replace(/^[.,!?;:"'()[\]]+|[.,!?;:"'()[\]]+$/g, ''))
    .filter((w) => w.length >= 4);

  const scored: Array<{ word: string; score: number; idx: number }> = [];
  const seen = new Set<string>();

  words.forEach((word, idx) => {
    const lower = word.toLowerCase();
    if (seen.has(lower) || STOPWORDS_ID_EN.has(lower)) return;
    seen.add(lower);

    let score = word.length;
    if (/^[A-Z]/.test(word) && idx > 0) score += 4;
    if (/\d/.test(word)) score += 5;
    if (word.length >= 7) score += 2;
    scored.push({ word, score, idx });
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  return scored.slice(0, maxKeywords).map((s) => s.word);
}


