import type {
  AspectRatio,
  CameraKeyframe,
  PaletteId,
  PalettePreset,
  ParsedSceneBlock,
  SceneItem,
  VideoStylePreset,
} from '../types/studio';
import { VIDEO_STYLES_MAP } from '../data/videoStyles';

export const PALETTE_PRESETS: Record<PaletteId, PalettePreset> = Object.keys(
  VIDEO_STYLES_MAP
).reduce((acc, key) => {
  const id = key as PaletteId;
  acc[id] = VIDEO_STYLES_MAP[id].palette;
  return acc;
}, {} as Record<PaletteId, PalettePreset>);

export function getStylePreset(id: PaletteId): VideoStylePreset {
  return VIDEO_STYLES_MAP[id] || VIDEO_STYLES_MAP['cyber-hologram'];
}

export function getCanvasDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1280, height: 720 };
    case '1:1':
      return { width: 960, height: 960 };
    case '9:16':
    default:
      return { width: 720, height: 1280 };
  }
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const ease = {
  linear: (t: number): number => clamp(t, 0, 1),
  in: (t: number): number => {
    const u = clamp(t, 0, 1);
    return u * u * u;
  },
  out: (t: number): number => {
    const u = clamp(t, 0, 1);
    return 1 - Math.pow(1 - u, 3);
  },
  inOut: (t: number): number => {
    const u = clamp(t, 0, 1);
    return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  },
  smooth: (t: number): number => {
    const u = clamp(t, 0, 1);
    return u * u * (3 - 2 * u);
  },
  sharp: (t: number): number => {
    const u = clamp(t, 0, 1);
    return 1 - Math.pow(1 - u, 5);
  },
  back: (t: number): number => {
    const u = clamp(t, 0, 1);
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  },
  outBack: (t: number): number => {
    const u = clamp(t, 0, 1);
    if (u <= 0) return 0;
    if (u >= 1) return 1;
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
  },
};

export type SpringPreset = 'smooth' | 'heavy' | 'snappy' | 'bouncy' | 'fast';

/**
 * Deterministic spring progression returning ~0 before startTime and settling at 1.
 */
export function spring(t: number, startTime: number = 0, preset: SpringPreset = 'smooth'): number {
  const dt = t - startTime;
  if (dt <= 0) return 0;

  switch (preset) {
    case 'fast': {
      const dur = 0.3;
      if (dt >= dur) return 1;
      const u = dt / dur;
      return 1 - Math.pow(1 - u, 3);
    }
    case 'heavy': {
      const dur = 0.72;
      if (dt >= dur) return 1;
      const u = dt / dur;
      return 1 - Math.pow(1 - u, 4);
    }
    case 'snappy': {
      const dur = 0.44;
      if (dt >= dur) return 1;
      const u = dt / dur;
      const base = 1 - Math.exp(-9.5 * u) * Math.cos(4.2 * u);
      const norm = 1 - Math.exp(-9.5) * Math.cos(4.2);
      return clamp(base / norm, 0, 1.035);
    }
    case 'bouncy': {
      const dur = 0.65;
      if (dt >= dur) return 1;
      const u = dt / dur;
      const base = 1 - Math.exp(-6.5 * u) * Math.cos(9.5 * u);
      const norm = 1 - Math.exp(-6.5) * Math.cos(9.5);
      return base / norm;
    }
    case 'smooth':
    default: {
      const dur = 0.52;
      if (dt >= dur) return 1;
      const u = dt / dur;
      return 1 - Math.pow(1 - u, 3);
    }
  }
}

export function stagger(
  t: number,
  index: number,
  startTime: number = 0,
  step: number = 0.1,
  preset: SpringPreset = 'smooth'
): number {
  return spring(t, startTime + index * step, preset);
}

export function at(t: number, startTime: number, fadeDuration: number = 0.25): number {
  if (t < startTime) return 0;
  if (fadeDuration <= 0) return 1;
  return clamp((t - startTime) / fadeDuration, 0, 1);
}

export function wave(t: number, freq: number = 1, amp: number = 1, phase: number = 0): number {
  return Math.sin(t * freq * Math.PI * 2 + phase) * amp;
}

/**
 * Deterministic seeded pseudo-random generator returning [0, 1).
 */
export function rand(seed: number): number {
  const s = Math.sin(seed * 12.9898 + 78.233) * 43758.5453123;
  return s - Math.floor(s);
}

export type KeyEasing = 'linear' | 'in' | 'out' | 'inOut';

export function applyEasing(u: number, easing: KeyEasing = 'linear'): number {
  const x = clamp(u, 0, 1);
  switch (easing) {
    case 'in':
      return x * x;
    case 'out':
      return 1 - (1 - x) * (1 - x);
    case 'inOut':
      return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    case 'linear':
    default:
      return x;
  }
}

export function keys(
  t: number,
  keyframes: Array<[number, number]>,
  easing: KeyEasing = 'linear'
): number {
  if (!Array.isArray(keyframes) || keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0][1];
  if (t <= keyframes[0][0]) return keyframes[0][1];
  const last = keyframes[keyframes.length - 1];
  if (t >= last[0]) return last[1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    const [t0, v0] = keyframes[i];
    const [t1, v1] = keyframes[i + 1];
    if (t >= t0 && t <= t1) {
      if (t1 === t0) return v1;
      const u = (t - t0) / (t1 - t0);
      return lerp(v0, v1, applyEasing(u, easing));
    }
  }
  return last[1];
}

export function evaluateCamera(
  t: number,
  rawKeyframes: Array<[number, number, number, number]>,
  canvasWidth: number = 720,
  canvasHeight: number = 1280
): { x: number; y: number; zoom: number } {
  const fallback = { x: canvasWidth / 2, y: canvasHeight / 2, zoom: 1 };
  if (!Array.isArray(rawKeyframes) || rawKeyframes.length === 0) return fallback;

  const sorted: CameraKeyframe[] = rawKeyframes
    .filter((k) => Array.isArray(k) && k.length >= 4)
    .map((k) => ({
      time: Number(k[0]) || 0,
      x: Number(k[1]) || fallback.x,
      y: Number(k[2]) || fallback.y,
      zoom: Number(k[3]) || 1,
    }))
    .sort((a, b) => a.time - b.time);

  if (sorted.length === 0) return fallback;
  if (sorted.length === 1 || t <= sorted[0].time) {
    return { x: sorted[0].x, y: sorted[0].y, zoom: sorted[0].zoom };
  }
  const last = sorted[sorted.length - 1];
  if (t >= last.time) {
    return { x: last.x, y: last.y, zoom: last.zoom };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const k0 = sorted[i];
    const k1 = sorted[i + 1];
    if (t >= k0.time && t <= k1.time) {
      if (k1.time === k0.time) return { x: k1.x, y: k1.y, zoom: k1.zoom };
      const u = applyEasing((t - k0.time) / (k1.time - k0.time), 'inOut');
      return {
        x: lerp(k0.x, k1.x, u),
        y: lerp(k0.y, k1.y, u),
        zoom: lerp(k0.zoom, k1.zoom, u),
      };
    }
  }

  return { x: last.x, y: last.y, zoom: last.zoom };
}

/**
 * Splits a multi-scene paste like:
 * // ===== SCENE 4 =====
 */
export function splitMultiSceneCode(rawCode: string): ParsedSceneBlock[] {
  const trimmed = rawCode.trim();
  if (!trimmed) return [];

  const headerRegex = /^\s*\/\/\s*=*\s*(?:SCENE|ADEGAN)\s*(\d+)?\s*=*\s*$/gim;
  const matches: Array<{ index: number; fullMatch: string; num: number | null; label: string }> = [];

  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(trimmed)) !== null) {
    const num = m[1] ? parseInt(m[1], 10) : null;
    const label = num !== null ? `Scene ${num}` : m[0].replace(/[/=]/g, '').trim();
    matches.push({
      index: m.index,
      fullMatch: m[0],
      num,
      label,
    });
  }

  if (matches.length === 0) {
    return [{ label: 'Scene 1', sceneNumber: null, code: trimmed }];
  }

  const blocks: ParsedSceneBlock[] = [];

  const preamble = trimmed.slice(0, matches[0].index).trim();
  if (preamble.length > 0 && !preamble.startsWith('//')) {
    blocks.push({ label: 'Intro', sceneNumber: 0, code: preamble });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : trimmed.length;
    const slice = trimmed.slice(start, end).trim();
    blocks.push({
      label: matches[i].label,
      sceneNumber: matches[i].num,
      code: slice,
    });
  }

  return blocks;
}

export function inferSceneDurationFromCode(code: string, fallbackSec: number = 4.5): number {
  const camMatch = code.match(/s\.kamera\s*\(\s*\[([\s\S]*?)\]\s*\)/);
  if (!camMatch) return fallbackSec;

  const pairRegex = /\[\s*([0-9]+(?:\.[0-9]+)?)\s*,/g;
  let maxTime = 0;
  let pm: RegExpExecArray | null;
  while ((pm = pairRegex.exec(camMatch[1])) !== null) {
    const val = parseFloat(pm[1]);
    if (!Number.isNaN(val) && val > maxTime) {
      maxTime = val;
    }
  }

  if (maxTime > 0.5) {
    return Number(maxTime.toFixed(2));
  }
  return fallbackSec;
}

export function formatTimecode(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function getTotalDuration(scenes: SceneItem[]): number {
  return scenes.reduce((acc, sc) => acc + Math.max(0.5, sc.durationSec), 0);
}

export function resolveSceneAtTime(
  scenes: SceneItem[],
  globalTime: number
): { scene: SceneItem | null; sceneIndex: number; localTime: number; sceneStartTime: number } {
  if (scenes.length === 0) {
    return { scene: null, sceneIndex: -1, localTime: 0, sceneStartTime: 0 };
  }
  let cursor = 0;
  for (let i = 0; i < scenes.length; i++) {
    const dur = Math.max(0.5, scenes[i].durationSec);
    if (globalTime < cursor + dur || i === scenes.length - 1) {
      return {
        scene: scenes[i],
        sceneIndex: i,
        localTime: clamp(globalTime - cursor, 0, dur),
        sceneStartTime: cursor,
      };
    }
    cursor += dur;
  }
  return { scene: scenes[0], sceneIndex: 0, localTime: 0, sceneStartTime: 0 };
}

export function buildDSLSpecification(palette: PalettePreset, dims: { width: number; height: number }): string {
  const stylePreset = getStylePreset(palette.id);
  return `KARTU GAYA & NUANSA AKTIF (${stylePreset.name}):
${stylePreset.animationCardPrompt}

SPESIFIKASI CANVAS MOTION DSL (objek global: s, dan konteks mentah: ctx / s.ctx):
- Ukuran Canvas Referensi: ${dims.width} x ${dims.height} (pusat X=${dims.width / 2}, Y=${dims.height / 2}).
- Area Aman Anti-Terpotong (WAJIB SEMUA GAYA): Tempatkan seluruh objek & teks di x=${Math.round(dims.width * 0.08)}..${Math.round(dims.width * 0.92)}, y=${Math.round(dims.height * 0.1)}..${Math.round(dims.height * 0.76)} agar tidak ada kata atau objek yang terpotong di tepi kanvas.
- Area Subtitle Otomatis (LARANGAN SUBTITLE GANDA): Area y=${Math.round(dims.height * 0.78)}..${dims.height} WAJIB KOSONG dari teks/subtitle buatan kode! Sistem sudah merender subtitle otomatis dari narasi. JANGAN PERNAH menggambar subtitle, teks narasi lengkap, atau kotak subtitle sendiri di dalam kode pada gaya animasi apa pun!
- Palet Warna Aktif (${palette.name}):
  Latar Kanvas: "${palette.bg}"
  Primary: "${palette.primary}", Secondary: "${palette.secondary}", Accent: "${palette.accent}", Text: "${palette.text}"
- Properti Waktu & Easing:
  s.t -> waktu berjalan dalam detik (0 .. durasi scene).
  s.ease.back(u), s.ease.sharp(u), s.ease.smooth(u), s.ease.in(u), s.ease.out(u), s.ease.inOut(u)
- Kamera & Audio SFX:
  s.kamera([[t, x, y, zoom], ...]) -> animasi posisi fokus kamera & zoom secara halus. Jaga zoom aman di rentang 0.94..1.05 dan fokus (x, y) dekat pusat kanvas agar tidak ada objek/kata yang terpotong.
  s.sfx(nama, waktuDetik, volume?, pitch?) -> efek suara ("glitch", "ding", "laser", "tick", "beep", "sparkle", "whoosh", "pop", "thud", "stamp", "impact").
- Fungsi Animasi & Utilitas:
  s.spring(startTime, "smooth" | "heavy" | "snappy" | "bouncy" | "fast") -> 0..1
  s.stagger(index, startTime, step, preset) -> spring bertahap
  s.keys([[t0, v0], [t1, v1], ...], "linear" | "in" | "out" | "inOut")
  s.at(startTime, fadeDur?) -> 0..1 fade in
  s.wave(freq, amp, phase?) -> osilasi sinusoidal
  s.lerp(a, b, t) -> interpolasi linear
  s.rand(seed) -> angka acak deterministik 0..1
- Primitif Gambar & Gaya:
  s.group({ x?, y?, scale?, rotate?, alpha? }, () => { ... })  // CATATAN: rotate dalam RADIAN (mis. 0.03 = ~1.7°; JANGAN masukkan derajat seperti 3 atau 45 agar teks tidak terbalik!)
  s.rect(x, y, w, h, { fill?, stroke?, width?, alpha?, draw?, radius?, wobble?, hatch? })
  s.circle(x, y, r, { fill?, stroke?, width?, alpha?, draw?, wobble?, hatch? })
  s.ellipse(x, y, rx, ry, { fill?, stroke?, width?, alpha?, draw?, rotate?, wobble?, hatch? })
  s.arc(x, y, r, startAngle, endAngle, { stroke?, width?, alpha?, draw? })
  s.line(x1, y1, x2, y2, { stroke?, width?, alpha?, draw?, dash?, wobble? })
  s.polyline([[x, y], ...], { stroke?, width?, alpha?, fill?, draw?, close?, wobble?, hatch? })
  s.box3d(x, y, w, h, depth, { fill?, shade?, top?, edges?: "none"|string, width?, wobble?, hatch?, alpha? })
  s.text(str, x, y, { size?, color?, align?: "left"|"center"|"right", alpha?, weight?, font? })
  s.text3d(str, x, y, { size?, color?, side?, depth?, serif?, condensed?, align?, alpha? })
  s.sparkle(x, y, size, { stroke?, fill?, alpha? })
  s.burst(x, y, radius, { draw?, count?, stroke?, alpha? })
  Helper Belah Warna (jika gaya Belah Warna): s.field(a, b), s.side(x, y, a, b), s.both(a, b, (main, shade, back) => ...), s.slab(x, y, w, h, d, r, main, shade), s.disc(x, y, r, main, back), s.word(str, x, y, size, progress)`;
}

export function buildPromptForScene(
  scene: SceneItem,
  palette: PalettePreset,
  aspectRatio: AspectRatio
): string {
  const dims = getCanvasDimensions(aspectRatio);
  return `Buatkan kode animasi motion graphics JavaScript Canvas untuk SCENE ${scene.index + 1} dengan aturan berikut:

Judul Scene: ${scene.title}
Durasi Scene: ${scene.durationSec.toFixed(2)} detik
Narasi Voiceover: "${scene.narration}"
Arahan Visual: ${scene.visualBrief}
Arahan Kamera: ${scene.cameraHint}

${buildDSLSpecification(palette, dims)}

ATURAN OUTPUT:
1. Awali kode dengan komentar persis: // ===== SCENE ${scene.index + 1} =====
2. Gunakan hanya JavaScript murni dan API \`s.*\` / \`ctx\` di atas (tanpa import/export atau wrapper function).
3. Pastikan timestamp terakhir pada \`s.kamera([...])\` mendekati ${scene.durationSec.toFixed(2)} detik.
4. Ikuti dengan ketat KARTU GAYA & NUANSA AKTIF di atas (termasuk aturan warna, tipografi, gerak, dan wajib faceless bila ada tokoh/orang).`;
}

export function buildMasterPrompt(
  projectTitle: string,
  scenes: SceneItem[],
  palette: PalettePreset,
  aspectRatio: AspectRatio
): string {
  const dims = getCanvasDimensions(aspectRatio);
  const sceneSpecs = scenes
    .map(
      (sc, idx) =>
        `SCENE ${idx + 1} (${sc.durationSec.toFixed(2)} detik) — ${sc.title}
- Narasi: "${sc.narration}"
- Visual: ${sc.visualBrief}
- Kamera: ${sc.cameraHint}`
    )
    .join('\n\n');

  return `Buatkan kode animasi motion graphics JavaScript Canvas lengkap untuk semua scene pada proyek "${projectTitle}".

${buildDSLSpecification(palette, dims)}

DAFTAR SCENE:
${sceneSpecs}

ATURAN OUTPUT WAJIB:
1. Pisahkan setiap scene dengan header komentar persis:
   // ===== SCENE 1 =====
   (kode scene 1)
   // ===== SCENE 2 =====
   (kode scene 2)
   dst.
2. Jangan gunakan import/export atau pembungkus fungsi; tulis langsung pernyataan \`s.kamera(...)\`, \`s.sfx(...)\`, dan perintah gambar \`s.*\`.
3. Jaga koordinat sesuai kanvas ${dims.width}x${dims.height} dan ikuti KARTU GAYA & NUANSA AKTIF secara konsisten di setiap scene.`;
}
