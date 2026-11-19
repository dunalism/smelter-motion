import type { PaletteId, VideoStylePreset } from '../types/studio';

export const VIDEO_STYLES: VideoStylePreset[] = [
  {
    id: 'cyber-hologram',
    name: 'Hologram Cyan',
    tagline: 'Ruang kendali holografik, HUD wireframe cyan-violet, efek glitch & partikel',
    nuance: 'Futuristik, investigatif, ritme cepat, efek scan & bracket HUD.',
    recommendedDurationSec: 30,
    palette: {
      id: 'cyber-hologram',
      name: 'Hologram Cyan',
      bg: '#060913',
      grid: 'rgba(41, 231, 255, 0.06)',
      primary: '#29e7ff',
      secondary: '#b26bff',
      accent: '#ff3fd1',
      text: '#f0f7ff',
      isLight: false,
    },
    subtitleDefaults: { style: 'boxed', animation: 'static' },
    animationCardPrompt:
      'Gaya animasi "Hologram Cyan": Latar gelap ruang kendali holografik (#060913), set arsitektur tipis alpha rendah, garis wireframe cyan #29e7ff, violet #b26bff, aksen magenta #ff3fd1, bracket pengunci sudut, garis scan bergerak, teks HUD tajam. Semua tokoh/orang wajib faceless.',
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 620, 1], [3.5, 360, 480, 1.1]]);
s.sfx("ding", 0.6, 0.55);
const C = "#29e7ff", V = "#b26bff", M = "#ff3fd1";
const k = s.spring(0.15, "smooth");
s.circle(360, 460, 210, { stroke: V, width: 1.5, alpha: 0.35 * k, draw: k });
s.rect(180, 360, 360, 200, { fill: "rgba(41,231,255,0.04)", stroke: C, width: 2.5, draw: k });
s.text("HOLOGRAM / READY", 360, 460, { size: 32, color: C, align: "center", alpha: k });`,
  },
  {
    id: 'arsip-kuno',
    name: 'Arsip Kuno',
    tagline: 'Lembar cetakan tua berbingkai ganda, gravir arsir miring, nomor pelat romawi',
    nuance: 'Energik & membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan gravir & angka serif.',
    recommendedDurationSec: 35,
    palette: {
      id: 'arsip-kuno',
      name: 'Arsip Kuno',
      bg: '#e9e0c8',
      grid: 'rgba(43, 36, 24, 0.05)',
      primary: '#2b2418',
      secondary: '#2f5d46',
      accent: '#9a4a2a',
      text: '#2b2418',
      isLight: true,
    },
    subtitleDefaults: { style: 'ivory-capsule', animation: 'static' },
    animationCardPrompt: `Gaya video: Arsip Kuno (arsip kuno: lembar cetakan tua berbingkai garis ganda, gambar gravir garis dengan arsiran miring, tahun serif yang menghitung, nomor pelat romawi). Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.
Gaya animasi "Arsip Kuno": Lembar ARSIP / cetakan tua: latar sudah berupa kertas tua dengan bingkai garis ganda dan kotak kecil di sudutnya (isi berada di dalam bingkai, x 100-620, y 150-1100). Semua gambar bergaya GRAVIR: garis tinta coklat tua #2b2418 (krem #e9e0c8 di latar gelap) width 2-4 yang tergambar pelan (\`draw\`), tanpa isian warna, dengan bayangan berupa ARSIRAN garis-garis miring sejajar yang rapat (width 1-1.5) di sisi gelap benda. Aksen: hijau tua #2f5d46 untuk ombak, uap, dan label tempat; karat #9a4a2a untuk buah, bendera, stempel lilin, dan nomor pelat. Ciri halamannya: NOMOR PELAT romawi kecil di kiri atas ("No. I") dan judul kapital kecil di kanan atas (y 170). Isinya digambar gravir dari kalimat scene itu (benda, orang tanpa wajah, peta, mesin, bangunan, uang, dokumen, apa pun yang disebut), boleh satu benda besar, beberapa benda kecil berlabel seperti lembar katalog, atau potongan detail yang diperbesar; variasikan susunannya antar scene. TAHUN atau angka besar serif (\`s.text3d\` size 90-100) yang menghitung naik hanya kalau kalimatnya menyebut tahun atau angka. Gerakan tenang seperti halaman buku sejarah: garis tergambar, arsiran muncul, angka berputar, stempel lilin menghentak. Tanpa warna cerah, tanpa objek 3D, tanpa tokoh kartun. (Apa pun gayanya, setiap orang/tokoh WAJIB faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah.)`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 620, 1], [3.8, 360, 560, 1.06]]);
s.sfx("tick", 0.35, 0.5);
s.sfx("stamp", 2.45, 0.65);

const INK = "#2b2418", GRN = "#2f5d46", RUST = "#9a4a2a";
const frameIn = s.spring(0.05, "smooth");

// Bingkai garis ganda arsip (x 100-620, y 150-1100)
s.rect(100, 150, 520, 950, { stroke: INK, width: 2.5, draw: frameIn });
s.rect(112, 162, 496, 926, { stroke: INK, width: 1.2, draw: frameIn });
for (const [cx, cy] of [[100,150],[608,150],[100,1088],[608,1088]]) {
  s.rect(cx, cy, 12, 12, { stroke: INK, width: 1.5, alpha: frameIn });
}

s.text("No. I", 136, 186, { size: 18, color: RUST, font: "Playfair Display, Georgia, serif", align: "left", alpha: s.at(0.2, 0.25) });
s.text("TABULA HISTORICA", 584, 186, { size: 15, color: INK, font: "Playfair Display, Georgia, serif", align: "right", alpha: s.at(0.25, 0.25) });

// Tahun serif menghitung naik
const yr = Math.round(s.lerp(1820, 1945, s.spring(0.35, "heavy")));
s.text3d(String(yr), 360, 330, { size: 96, color: INK, serif: true, depth: 0, align: "center", alpha: s.at(0.25, 0.3) });

// Objek gravir jam pasir / kompas dengan arsiran miring
const drawG = s.spring(0.55, "smooth");
s.circle(360, 590, 145, { stroke: INK, width: 3, draw: drawG, hatch: { angle: -0.65, spacing: 7, color: INK, width: 1.1 } });
s.circle(360, 590, 118, { stroke: INK, width: 1.5, draw: drawG });
s.polyline([[360, 472], [382, 570], [360, 708], [338, 570], [360, 472]], { stroke: GRN, width: 2.2, draw: drawG });

// Stempel lilin karat menghentak
const stamp = s.spring(2.4, "snappy");
s.group({ x: 500, y: 740, scale: s.lerp(1.45, 1, stamp), alpha: s.at(2.38, 0.12) }, () => {
  s.circle(0, 0, 44, { stroke: RUST, width: 3, fill: "rgba(154,74,42,0.14)" });
  s.circle(0, 0, 34, { stroke: RUST, width: 1.4 });
  s.text("ARSIP", 0, 1, { size: 16, color: RUST, font: "Playfair Display, Georgia, serif", align: "center" });
});`,
  },
  {
    id: 'scribble-3d',
    name: 'Scribble 3D',
    tagline: 'Objek 3D low-poly cerah + garis tinta coretan tangan, teks tebal kata per kata',
    nuance: 'Energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan, 30-45 detik.',
    recommendedDurationSec: 36,
    palette: {
      id: 'scribble-3d',
      name: 'Scribble 3D',
      bg: '#131624',
      grid: 'rgba(255, 255, 255, 0.05)',
      primary: '#ffbe0b',
      secondary: '#3a86ff',
      accent: '#ff006e',
      text: '#ffffff',
      isLight: false,
    },
    subtitleDefaults: { style: 'boxed', animation: 'word-highlight' },
    animationCardPrompt: `Gaya video: ilustrasi scribble 3D: objek 3D low-poly berwarna cerah dengan garis tinta coretan tangan dan arsiran, teks besar tebal yang muncul kata per kata. Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan. Durasi 30-45 detik.
Gaya animasi "Scribble 3D": Gunakan \`s.box3d\` atau bentuk poligon isometrik berwarna cerah (#ffbe0b, #3a86ff, #ff006e, #06d6a0) yang dipadukan garis tinta coretan tangan (\`wobble: 2.2, hatch: true\`). Teks utama besar tebal (\`s.text3d\`) muncul kata per kata seirama narasi dengan hentakan skala cepat (\`s.spring(..., "snappy")\`). Gerakan lincah, potongan scene pendek (2.5-4 detik), banyak aksen percikan coretan. (Apa pun gayanya, setiap orang/tokoh WAJIB faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah.)`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 620, 1], [1.4, 360, 500, 1.1], [3.2, 360, 500, 1.05]]);
s.sfx("pop", 0.25, 0.6);
s.sfx("whoosh", 1.3, 0.5);

const frame = Math.floor(s.t * 10);
const k1 = s.spring(0.1, "snappy");
const k2 = s.spring(0.5, "snappy");

// Objek 3D low-poly cerah + coretan tinta
s.group({ x: 360, y: 480 + s.wave(0.9, 10), rotate: s.wave(0.4, 0.06) }, () => {
  s.box3d(-90, -80, 180, 150, 54, {
    fill: "#3a86ff",
    shade: "#1e4db7",
    top: "#6ea8ff",
    edges: "#ffffff",
    width: 3,
    wobble: 2.4,
    hatch: { angle: -0.7, spacing: 11, color: "rgba(255,255,255,0.35)", width: 1.2 },
    alpha: k1
  });
  s.circle(95, -95, 42, { fill: "#ffbe0b", stroke: "#ffffff", width: 3, wobble: 2.2, alpha: k2 });
});

// Teks tebal muncul kata per kata
const words = ["GERAK", "CEPAT", "3D!"];
words.forEach((w, i) => {
  const wk = s.stagger(i, 0.35, 0.35, "snappy");
  s.text3d(w, 360, 680 + i * 68, {
    size: 62,
    color: i === 2 ? "#ffbe0b" : "#ffffff",
    side: "#ff006e",
    depth: 5,
    align: "center",
    alpha: wk
  });
});`,
  },
  {
    id: 'krayon-2d',
    name: 'Krayon 2D',
    tagline: 'Ilustrasi gambar tangan ala krayon 2D, teks narasi muncul seperti mesin ketik',
    nuance: 'Energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.',
    recommendedDurationSec: 32,
    palette: {
      id: 'krayon-2d',
      name: 'Krayon 2D',
      bg: '#fbf5e6',
      grid: 'rgba(60, 48, 36, 0.04)',
      primary: '#e76f51',
      secondary: '#2a9d8f',
      accent: '#264653',
      text: '#264653',
      isLight: true,
    },
    subtitleDefaults: { style: 'ivory-capsule', animation: 'typewriter' },
    animationCardPrompt: `Gaya video: ilustrasi gambar tangan ala krayon 2D, teks narasi muncul seperti mesin ketik. Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.
Gaya animasi "Krayon 2D": Ilustrasi gambar tangan penuh ekspresi ala krayon/pastel minyak 2D di kertas krem hangat (#fbf5e6). Gunakan \`wobble: 2.5..3.5\` dan \`hatch: true\` untuk memberi tekstur goresan krayon warna hangat (#e76f51, #2a9d8f, #e9c46a, #264653). Tambahkan animasi frame-by-frame kecil tiap 3-4 frame (\`Math.floor(s.t * 8)\`), dan teks narasi bergaya mesin ketik. Ritme cepat, energik, banyak elemen bergerak. (Apa pun gayanya, setiap orang/tokoh WAJIB faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah.)`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 620, 1], [3.2, 360, 530, 1.08]]);
s.sfx("pop", 0.2, 0.55);
s.sfx("tick", 0.9, 0.45);

const step = Math.floor(s.t * 8);
const wig = (s.rand(step) - 0.5) * 3;
const k = s.spring(0.12, "snappy");

s.group({ x: 360 + wig, y: 460 }, () => {
  s.circle(0, 0, 155, {
    fill: "rgba(233,196,106,0.45)",
    stroke: "#e76f51",
    width: 6,
    wobble: 3.2,
    hatch: { angle: 0.5, spacing: 10, color: "rgba(231,111,81,0.32)", width: 2.2 },
    draw: k
  });
  s.polyline([[-80, 40], [-20, -45], [35, 10], [95, -75]], {
    stroke: "#2a9d8f",
    width: 7,
    wobble: 2.6,
    draw: s.spring(0.45, "smooth")
  });
  s.sparkle(115, -95, 22, { stroke: "#264653", width: 3, alpha: s.at(0.9, 0.2) });
});

const full = "IDE MENYALA!";
const count = Math.floor(s.at(0.5, 1.1) * full.length);
s.text(full.slice(0, count), 360, 740, {
  size: 46,
  color: "#264653",
  font: "Caveat, Outfit, sans-serif",
  align: "center"
});`,
  },
  {
    id: 'modern-flat',
    name: 'Modern Flat',
    tagline: 'Vektor flat design bersih, bentuk geometris rapi, sudut membulat 12-28px',
    nuance: 'Energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.',
    recommendedDurationSec: 32,
    palette: {
      id: 'modern-flat',
      name: 'Modern Flat',
      bg: '#e9edf5',
      grid: 'rgba(31, 42, 68, 0.04)',
      primary: '#4f6bff',
      secondary: '#ff8a5c',
      accent: '#5cd6a8',
      text: '#1f2a44',
      isLight: true,
    },
    subtitleDefaults: { style: 'boxed', animation: 'static' },
    animationCardPrompt: `Gaya video: Modern Flat (flat design bersih, warna solid, tanpa coretan). Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.
Gaya animasi "Modern Flat": KARTU GAYA (hanya cara menggambar; isi gambar SELALU dari narasi). TEKNIK: ilustrasi vektor flat design modern; setiap benda dirakit dari bentuk geometris bersih (persegi membulat, lingkaran, kapsul, segitiga). TEPI: tanpa outline, atau outline tipis rapi satu warna gelap; sudut membulat konsisten (radius 12-28px). Untuk bentuk 2D pakai \`wobble: 0, hatch: false\`; objek 3D pakai \`edges: "none"\`. BENTUK: disederhanakan, proporsi rapi, sedikit detail; benda rumit = beberapa bidang flat bertumpuk. WARNA: biru royal #4f6bff, coral #ff8a5c, kuning lembut #ffd166, hijau mint #5cd6a8, navy #1f2a44, abu muda #e9edf5, putih. Satu warna aksen dominan per scene. TEKSTUR & CAHAYA: warna rata tanpa tekstur; bayangan hanya bidang flat sedikit lebih gelap (bayangan panjang 45 derajat atau sisi gelap), tanpa gradasi mengilap. KEDALAMAN: lewat tumpukan bidang dan perbedaan terang-gelap warna yang sama, bukan blur. TIPOGRAFI: sans-serif tebal bersih, label kecil di kapsul/badge warna (aksen sesekali). GERAK: halus dan presisi: muncul dengan skala ease-out, geser rapi, berputar sedikit; tidak bergoyang. HINDARI: coretan, arsiran, tekstur kertas, garis tangan, glow, neon, warna kusam. (Apa pun gayanya, setiap orang/tokoh WAJIB faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah.)`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 620, 1], [3.2, 360, 520, 1.06]]);
s.sfx("pop", 0.25, 0.5);
s.sfx("whoosh", 0.7, 0.4);

const BLUE = "#4f6bff", CORAL = "#ff8a5c", MINT = "#5cd6a8", NAVY = "#1f2a44";
const k1 = s.spring(0.1, "smooth");
const k2 = s.spring(0.38, "smooth");

// Kartu geometris flat bertumpuk bersih (wobble: 0, hatch: false)
s.group({ x: 360, y: 490, scale: s.lerp(0.85, 1, k1), alpha: k1 }, () => {
  // Bayangan flat 45 derajat
  s.rect(-155, -105, 340, 230, { fill: "#d3dae8", stroke: "none", radius: 24, wobble: 0, hatch: false });
  s.rect(-170, -120, 340, 230, { fill: "#ffffff", stroke: "none", radius: 24, wobble: 0, hatch: false });
  s.rect(-140, -90, 280, 44, { fill: BLUE, stroke: "none", radius: 14, wobble: 0, hatch: false });
  s.text("SISTEM TERSTRUKTUR", 0, -68, { size: 18, color: "#ffffff", align: "center", weight: 700 });

  // Bar grafik flat
  const bars = [58, 92, 74, 110];
  bars.forEach((h, i) => {
    const bk = s.stagger(i, 0.45, 0.08, "smooth");
    s.rect(-115 + i * 64, 88 - h * bk, 42, h * bk, {
      fill: i === 3 ? CORAL : (i % 2 === 0 ? BLUE : MINT),
      stroke: "none",
      radius: 12,
      wobble: 0,
      hatch: false
    });
  });
});

// Kapsul badge bersih
s.group({ x: 360, y: 710 + s.lerp(30, 0, k2), alpha: k2 }, () => {
  s.rect(-110, -24, 220, 48, { fill: NAVY, stroke: "none", radius: 24 });
  s.text("EFISIEN & RAPI", 0, 0, { size: 17, color: "#ffd166", align: "center", weight: 700 });
});`,
  },
  {
    id: 'paper-cutout',
    name: 'Paper Cutout',
    tagline: 'Kolase gunting kertas scrapbook, tepi putih stiker 8-12px, tempo stop-motion',
    nuance: 'Energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.',
    recommendedDurationSec: 34,
    palette: {
      id: 'paper-cutout',
      name: 'Paper Cutout',
      bg: '#f7f1e3',
      grid: 'rgba(176, 122, 79, 0.06)',
      primary: '#8fc7e8',
      secondary: '#a8d98f',
      accent: '#f6a04d',
      text: '#2c4a78',
      isLight: true,
    },
    subtitleDefaults: { style: 'ivory-capsule', animation: 'static' },
    animationCardPrompt: `Paper Cutout (paper cutout: kolase scrapbook gunting kertas ala buku cerita anak, tepi putih seperti stiker, tekstur kertas berserat). Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.
Gaya animasi "Paper Cutout": KARTU GAYA (hanya cara menggambar; isi gambar SELALU dari narasi). TEKNIK: kolase gunting kertas ala buku kerajinan anak; setiap benda adalah lembar kertas datar yang digunting, ditempel berlapis. TEPI: garis tepi putih kertas #fffaf0 selebar 8-12px yang sedikit tidak rata seperti stiker yang digunting tangan; TANPA garis tinta. BENTUK: sederhana dan membulat, sedikit tidak simetris, dirakit dari beberapa lembar (benda rumit = beberapa potongan bertumpuk, bukan detail kecil). WARNA: palet lembut alami: biru muda #8fc7e8, hijau muda #a8d98f, tosca #6cc0a8, cokelat hangat #b07a4f, kuning #ffd35c, oranye #f6a04d, merah muda #f3a6c0, putih kertas #fffaf0; tinta biru tua #2c4a78 hanya untuk tulisan tangan. Satu-dua warna dominan per scene, sisanya aksen kecil. TEKSTUR & CAHAYA: setiap isian bertekstur kertas kerajinan (serat pendek sedikit lebih gelap alpha rendah, bintik halus, kesan felt); cahaya merata tanpa kilap; setiap lembar punya bayangan tipis terangkat di bawah-kanan. KEDALAMAN: lapisan belakang, tengah, depan seperti diorama kertas, tiap lapis dengan bayangannya sendiri. TIPOGRAFI: tulisan tangan biru tua di atas potongan kertas bergaris bertepi sobek, ditempel selotip kuning miring (aksen sesekali, bukan di tiap scene). GERAK: ala stop-motion kertas: lembar masuk dengan pop kecil atau geser dari samping, bergoyang 2-4 derajat, tepi bergetar sedikit tiap 3-4 frame; tempo lembut. HINDARI: garis tinta, arsiran coretan, gradasi mengilap, glow, neon, objek 3D bervolume, warna gelap pekat. (Apa pun gayanya, setiap orang/tokoh WAJIB faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah.)`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 620, 1], [3.4, 360, 520, 1.05]]);
s.sfx("pop", 0.25, 0.5);
s.sfx("pop", 0.85, 0.45);

const step = Math.floor(s.t * 7);
const rock = Math.sin(step * 0.9) * 0.045;
const k1 = s.spring(0.1, "snappy");
const k2 = s.spring(0.45, "snappy");

// Bukit kertas belakang
s.group({ x: 360, y: 690, scale: k1 }, () => {
  s.ellipse(8, 12, 300, 110, { fill: "rgba(44,74,120,0.12)", stroke: "none" });
  s.ellipse(0, 0, 300, 110, { fill: "#a8d98f", stroke: "#fffaf0", width: 10, wobble: 1.5 });
});

// Matahari & bentuk stiker tengah dengan tepi putih 10px
s.group({ x: 250, y: 390, rotate: rock, scale: k1 }, () => {
  s.circle(6, 10, 68, { fill: "rgba(44,74,120,0.14)", stroke: "none" });
  s.circle(0, 0, 68, { fill: "#ffd35c", stroke: "#fffaf0", width: 10, wobble: 1.6 });
});

// Potongan kertas bergaris + selotip kuning
s.group({ x: 410, y: 540, rotate: -0.04 + rock * 0.5, scale: k2 }, () => {
  s.rect(-152, -72, 320, 160, { fill: "rgba(44,74,120,0.14)", stroke: "none", radius: 14 });
  s.rect(-160, -80, 320, 160, { fill: "#fffaf0", stroke: "#fffaf0", width: 8, radius: 14 });
  for (let i = 0; i < 4; i++) {
    s.line(-130, -35 + i * 30, 130, -35 + i * 30, { stroke: "#8fc7e8", width: 2 });
  }
  s.text("Cerita Kertas", 0, -5, { size: 42, color: "#2c4a78", font: "Caveat, Outfit, sans-serif", align: "center" });
  // Selotip kuning miring
  s.group({ x: 0, y: -82, rotate: -0.14 }, () => {
    s.rect(-46, -14, 92, 28, { fill: "rgba(255,211,92,0.85)", stroke: "none" });
  });
});`,
  },
  {
    id: 'kinetik-hud',
    name: 'Kinetik HUD',
    tagline: 'Latar hijau-tinta gelap, condensed putih es, amber, angka odometer berputar',
    nuance: 'Energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.',
    recommendedDurationSec: 30,
    palette: {
      id: 'kinetik-hud',
      name: 'Kinetik HUD',
      bg: '#091b18',
      grid: 'rgba(230, 244, 241, 0.04)',
      primary: '#e6f4f1',
      secondary: '#4d6461',
      accent: '#ffb000',
      text: '#e6f4f1',
      isLight: false,
    },
    subtitleDefaults: { style: 'clean', animation: 'word-highlight' },
    animationCardPrompt: `Kinetik HUD (tipografi kinetik: latar hijau-tinta gelap, huruf condensed putih es, aksen kuning amber, kata bertumpuk & angka berputar). Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.
Gaya animasi "Kinetik HUD": Tipografi kinetik: TULISAN adalah visual utama, ilustrasi minimal. Palet: putih es #e6f4f1 untuk teks utama, aksen kuning amber #ffb000, abu kehijauan #4d6461 untuk yang tidak aktif. Teks besar pakai \`s.text3d\` (font condensed tebal otomatis) RATA KIRI di x 70 untuk kalimat yang BERTUMPUK: tiap kata/frasa satu baris (size 90-120), naik dari bawah sambil memudar masuk satu per satu mengikuti narasi, frasa terpenting warna aksen lalu diberi garis bawah aksen tebal yang memanjang. Angka dan jam dibuat seperti ODOMETER: tiap digit berputar vertikal sampai berhenti di nilainya. Elemen khas lain: coretan bar aksen yang mencoret kata satu per satu, huruf raksasa (size 150-200, \`depth: 10-12, side: "#b37a00"\`) yang jatuh masuk huruf demi huruf, stempel kotak bergaris aksen yang menghentak miring, deret blok kecil yang menyala satu per satu sebagai penghitung. Tanpa label pojok atau bingkai layar. Gerakan tegas & berirama: naik, berputar, coret, hentak; tanpa objek 3D, tanpa arsiran, tanpa gambar kartun. (Apa pun gayanya, setiap orang/tokoh WAJIB faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah.)`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 620, 1], [3.2, 360, 560, 1.05]]);
s.sfx("tick", 0.4, 0.5);
s.sfx("impact", 1.5, 0.6);

const ICE = "#e6f4f1", AMB = "#ffb000", DIM = "#4d6461";
const lines = ["WAKTU", "BERJALAN", "CEPAT"];

lines.forEach((word, i) => {
  const k = s.stagger(i, 0.12, 0.28, "snappy");
  const isAccent = i === 2;
  s.text3d(word, 70, 350 + i * 116 + s.lerp(48, 0, k), {
    size: 108,
    color: isAccent ? AMB : ICE,
    condensed: true,
    depth: isAccent ? 10 : 0,
    side: "#b37a00",
    align: "left",
    alpha: k
  });
});

// Garis bawah aksen tebal memanjang
const ul = s.spring(0.85, "snappy");
s.rect(70, 646, 410 * ul, 10, { fill: AMB, stroke: "none" });

// Penghitung blok kecil menyala berurutan
for (let i = 0; i < 10; i++) {
  const on = s.t > 0.3 + i * 0.18;
  s.rect(70 + i * 38, 710, 26, 16, { fill: on ? AMB : DIM, stroke: "none" });
}

// Angka odometer sederhana
const val = Math.round(s.lerp(10, 99, s.spring(0.5, "heavy")));
s.text3d(val + "%", 70, 845, { size: 132, color: ICE, condensed: true, depth: 10, side: "#b37a00", align: "left" });`,
  },
  {
    id: 'reel-tegas',
    name: 'Reel Tegas',
    tagline: 'Poster Swiss kontras tinggi: krem, hitam, merah sinyal, blok tajam & angka raksasa',
    nuance: 'Energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.',
    recommendedDurationSec: 28,
    palette: {
      id: 'reel-tegas',
      name: 'Reel Tegas',
      bg: '#f2efe8',
      grid: 'rgba(17, 17, 17, 0.04)',
      primary: '#111111',
      secondary: '#e63323',
      accent: '#ffd400',
      text: '#111111',
      isLight: true,
    },
    subtitleDefaults: { style: 'boxed', animation: 'static' },
    animationCardPrompt: `Reel Tegas (poster tegas: krem, hitam, merah sinyal & sedikit kuning, blok warna yang meluncur, angka raksasa, coretan merah). Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.
Gaya animasi "Reel Tegas": Poster bergerak yang tegas ala Swiss: komposisi bersih, kontras tinggi, rata kiri, setiap scene satu ide besar. Palet ketat: krem #f2efe8, hitam #111111, merah sinyal #e63323, dan sedikit kuning #ffd400 hanya untuk angka. Komposisi dibangun dari BLOK WARNA persegi panjang tanpa sudut membulat yang meluncur masuk dari tepi layar (membelah layar, balok daftar, pita miring), lalu ANGKA atau KATA raksasa (\`s.text3d\`, depth 0, size 100-420, font condensed otomatis) JATUH ke tempatnya dan diam. Elemen khas: angka besar sebagai pusat perhatian, daftar bernomor berupa balok bertumpuk, pita merah miring yang mencoret, lingkaran pie yang terisi searah jarum jam, garis tebal hitam. Gerakan presisi dengan easing tajam (cepat lalu berhenti mati), berirama; tanpa bayangan, tanpa gradasi, tanpa label teknis, tanpa objek 3D, tanpa tokoh. (Apa pun gayanya, setiap orang/tokoh WAJIB faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah.)`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 640, 1], [2.8, 360, 640, 1]]);
s.sfx("thud", 0.25, 0.65);
s.sfx("whoosh", 0.85, 0.45);

const BLK = "#111111", RED = "#e63323", YEL = "#ffd400";
const slide = s.ease.sharp(s.at(0.05, 0.35));
const drop = s.ease.sharp(s.at(0.32, 0.35));

// Blok hitam meluncur tajam dari kiri
s.rect(0, 160, 720 * slide, 380, { fill: BLK, stroke: "none" });
s.text3d("01", 64, 345 - (1 - drop) * 180, {
  size: 270,
  color: YEL,
  condensed: true,
  depth: 0,
  align: "left",
  alpha: drop
});

// Garis tebal hitam & balok daftar
const bar1 = s.ease.sharp(s.at(0.65, 0.3));
s.rect(64, 595, 592 * bar1, 12, { fill: BLK, stroke: "none" });
s.text3d("SATU IDE BESAR", 64, 685, { size: 84, color: BLK, condensed: true, depth: 0, align: "left", alpha: bar1 });

// Pita merah miring meluncur
const redBar = s.ease.sharp(s.at(1.0, 0.35));
s.rect(64, 775, 480 * redBar, 66, { fill: RED, stroke: "none" });
s.text("TANPA KOMPROMI", 88, 808, { size: 30, color: "#f2efe8", weight: 700, align: "left", alpha: redBar });`,
  },
  {
    id: 'belah-warna',
    name: 'Belah Warna',
    tagline: 'Layar terbelah miring hijau botol & salmon, warna benda terbalik saat menembus batas',
    nuance: 'Energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.',
    recommendedDurationSec: 30,
    palette: {
      id: 'belah-warna',
      name: 'Belah Warna',
      bg: '#0d4a3c',
      grid: 'rgba(255, 241, 220, 0.05)',
      primary: '#ff8c69',
      secondary: '#0d4a3c',
      accent: '#fff1dc',
      text: '#fff1dc',
      isLight: false,
    },
    subtitleDefaults: { style: 'clean', animation: 'static' },
    animationCardPrompt: `Belah Warna (belah warna: layar terbelah batas miring hijau botol & salmon, benda flat yang warnanya terbalik saat menembus batas, cocok untuk tips dan edukasi cepat). Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.
Gaya animasi "Belah Warna": BELAH WARNA: layar dibelah SATU BATAS MIRING jadi dua warna keras, hijau botol #0d4a3c di atas dan salmon #ff8c69 di bawah, cocok untuk tips, keuangan, produktivitas, dan penjelasan cepat. Salin helper dari contoh gaya ini (\`side\`, \`field\`, \`both\`, \`slab\`, \`disc\`, \`word\`) dan gambar dengan \`ctx\` mentah. ATURAN UTAMA: (1) Setiap scene dimulai \`field(a, b)\`, batas berjalan dari (0, a) ke (720, b); selalu miring, a dan b berbeda minimal 120, jangan pernah datar. (2) BATAS ITU PEMAIN UTAMA: animasikan a dan b di setiap scene, misalnya menyapu, naik seperti air, atau menukik mengikuti benda. (3) SEMUA benda digambar lewat \`both(a, b, (main, shade, back) => { ... })\`, sehingga bagian benda di atas batas berwarna salmon dan bagian di bawahnya hijau: warnanya TERBALIK tepat di garis batas. Inilah ciri gaya ini, jadi tiap scene wajib punya benda yang menembus batas. Pakai warna dari argumen \`main\`, \`shade\`, \`back\`, bukan warna tetap. (4) Benda FLAT geometris tanpa outline dan tanpa gradasi: lingkaran, kotak membulat, dan \`slab\` (kotak dengan sisi tebal di bawahnya), dirakit jadi koin, toples, ponsel, batang grafik, kalender, tas, kunci sesuai topik scene. (5) Kata besar kapital font tebal warna krem #fff1dc (\`word\`), maksimal 1-2 kata, muncul setelah benda mendarat. Gerakan tegas dan cepat: jatuh, memantul, menyapu, \`s.ease.back\`. Pakai \`s.sfx("whoosh")\`, \`s.sfx("thud")\`, dan \`s.sfx("pop")\`. Tanpa warna biru tua atau kuning, tanpa barcode, tanpa objek 3D, tanpa coretan, tanpa wajah, tanpa bayangan lembut. Letakkan benda utama di y 150-820; warna batas boleh sampai bawah. (Apa pun gayanya, setiap orang/tokoh WAJIB faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah.)`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 640, 1], [3.2, 360, 640, 1]]);
s.sfx("whoosh", 0.2, 0.5);
s.sfx("thud", 0.85, 0.65);
s.sfx("pop", 1.4, 0.5);

// Gunakan helper built-in s.field / s.both / s.slab / s.disc / s.word
const sweep = s.ease.back(s.at(0.1, 0.65));
const a = s.lerp(660, 440, sweep);
const b = s.lerp(420, 650, sweep);

s.field(a, b);

const drop = s.ease.back(s.at(0.35, 0.55));
const yPos = s.lerp(200, 480, drop);

s.both(a, b, (main, shade, back) => {
  s.slab(220, yPos - 110, 280, 175, 22, 20, main, shade);
  s.disc(360, yPos + 120, 64, main, back);
});

if (s.t > 1.25) {
  const wk = s.ease.back(s.at(1.25, 0.35));
  s.word("FOKUS", 360, 820, 82, wk);
}`,
  },
  {
    id: 'peta-gurun',
    name: 'Peta Gurun Minimalis',
    tagline: 'Peta topografi isometrik & bukit pasir berlapis, kapsul gading, jalur emas putus-putus',
    nuance: 'Energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.',
    recommendedDurationSec: 36,
    palette: {
      id: 'peta-gurun',
      name: 'Peta Gurun Minimalis',
      bg: '#EDE2CA',
      grid: 'rgba(200, 182, 152, 0.14)',
      primary: '#A6893A',
      secondary: '#6D8B47',
      accent: '#A94442',
      text: '#2B2B2B',
      isLight: true,
    },
    subtitleDefaults: { style: 'ivory-capsule', animation: 'word-highlight' },
    animationCardPrompt: `Peta Gurun Minimalis (Animasi 2D bergaya vektor datar yang dipadukan dengan perspektif isome). Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.
Gaya animasi "Peta Gurun Minimalis": Animasi 2D bergaya vektor datar yang dipadukan dengan perspektif isometrik peta topografi dan adegan darat 3D low-poly berpermukaan matte rapi. Peta menampilkan garis pantai lengkung halus, garis kontur topografi tipis, penanda lokasi berupa lingkaran konsentris hitam-putih, serta ikon bangunan geometris kubus sederhana dengan bayangan lembut. Adegan darat menampilkan siluet hewan tunggangan, tenda prisma sederhana, pohon akasia berkanopi datar hijau zaitun (#6D8B47), bukit pasir berlapis dengan gunung bersudut tajam di kejauhan, serta sosok manusia berjubah putih polos. Gunakan garis putus-putus emas (#A6893A) dengan pendaran halus di bawahnya untuk jalur perjalanan, serta garis penunjuk tipis miring berujung lingkaran kecil yang menghubungkan objek dengan label kapsul. Palet warna didominasi krem pasir (#EDE2CA) dan cokelat muda (#C8B698), dipadukan dengan aksen biru laut pastel (#BBD2DC), emas hangat (#A6893A), merah bata (#A94442), serta hitam keabuan (#2B2B2B) untuk teks utama. Pencahayaan dibuat lembut melalui bayangan elips tipis di bawah setiap objek darat, vignette hangat di tepi layar, serta efek pendar bercahaya emas halus pada simbol penting tanpa menggunakan tekstur bitmap kasar. Latar tampilan peta menggunakan gradasi krem bersih dengan kabut horison di bagian atas untuk ruang teks, sedangkan adegan darat menggunakan gradasi langit biru-abu (#6E8898) atau senja hangat ke warna pasir. Tipografi judul dan label menggunakan huruf sans-serif bersih di dalam kotak kapsul putih gading (#FAF6EC) bersudut membulat dan berbingkai tipis emas-cokelat (#C8B698). Subtitle ditampilkan di area aman bagian bawah menggunakan kapsul putih gading (#FAF6EC) berbingkai tipis pada latar terang atau kapsul gelap transparan pada latar menengah, dengan teks sans-serif yang muncul kata demi kata mengikuti suara dan sorotan emas (#A6893A) pada kata kunci. Kamera bergerak tenang dengan efek pan, tilt, dan zoom perlahan mengikuti pertumbuhan garis jalur atau menggeser parallax lapisan bukit pasir. Transisi antar scene menggunakan sapuan tirai kabut krem (#EDE2CA) yang memudar halus selama 0,35 detik di awal dan akhir scene agar perpindahan antara peta dan lanskap darat terasa menyatu. Hindari: penggunaan foto, tekstur kasar berlebihan, warna neon mencolok, efek 3D mengilap, serta menggambar wajah. Semua orang atau tokoh wajib digambar faceless (kepala polos tanpa mata, hidung, mulut, atau ekspresi wajah).`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 620, 1], [3.6, 390, 560, 1.07]]);
s.sfx("whoosh", 0.3, 0.4);
s.sfx("ding", 2.0, 0.45);

const SAND = "#C8B698", GOLD = "#A6893A", SEA = "#BBD2DC", OLIVE = "#6D8B47", INK = "#2B2B2B";
const k = s.spring(0.15, "smooth");

// Garis pantai & kontur topografi tipis
s.polyline([[0, 260], [180, 290], [420, 240], [720, 310], [720, 0], [0, 0]], { fill: SEA, stroke: "#9fbac6", width: 2, close: true });
for (let i = 0; i < 4; i++) {
  s.ellipse(360, 560, 280 - i * 48, 170 - i * 30, { stroke: SAND, width: 1.4, alpha: 0.65 });
}

// Jalur perjalanan putus-putus emas tumbuh
s.polyline([[160, 720], [280, 610], [410, 540], [520, 410]], {
  stroke: GOLD,
  width: 4,
  dash: [12, 10],
  draw: s.spring(0.4, "heavy")
});

// Penanda lokasi konsentris & pohon akasia datar
s.circle(520, 410, 18, { fill: "#FAF6EC", stroke: INK, width: 2.5, alpha: s.at(1.2, 0.3) });
s.circle(520, 410, 7, { fill: "#A94442", stroke: "none", alpha: s.at(1.2, 0.3) });
s.ellipse(210, 675, 48, 16, { fill: OLIVE, stroke: "none", alpha: k });
s.line(210, 675, 210, 718, { stroke: "#7a5c3a", width: 4, alpha: k });

// Kapsul label putih gading
const lbl = s.spring(1.3, "smooth");
s.group({ x: 420, y: 315, alpha: lbl }, () => {
  s.rect(-115, -24, 230, 48, { fill: "#FAF6EC", stroke: SAND, width: 2, radius: 24 });
  s.text("TITIK EKSPEDISI", 0, 1, { size: 17, color: INK, align: "center", weight: 700 });
});`,
  },
  {
    id: 'garis-tinta',
    name: 'Garis Tinta',
    tagline: 'Minimalis garis tinta rapi di kertas krem, satu metafora garis & aksen hijau #12a37f',
    nuance: 'Energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.',
    recommendedDurationSec: 30,
    palette: {
      id: 'garis-tinta',
      name: 'Garis Tinta',
      bg: '#f6f2e9',
      grid: 'rgba(36, 32, 26, 0.04)',
      primary: '#24201a',
      secondary: '#12a37f',
      accent: '#12a37f',
      text: '#24201a',
      isLight: true,
    },
    subtitleDefaults: { style: 'clean', animation: 'static' },
    animationCardPrompt: `Garis Tinta (garis tinta: kertas krem & hijau hutan, ikon garis tinta tipis dengan satu aksen hijau, teks kapital bergaris bawah). Nuansa: energik dan membakar semangat, ritme cepat, potongan scene pendek, banyak gerakan.
Gaya animasi "Garis Tinta": Minimalis dengan GARIS TINTA: ilustrasi digambar dengan garis tipis rapi warna tinta (#24201a di latar terang, #eef2ea di latar gelap) \`width: 3-5, wobble: 0, hatch: false\`, dan SATU aksen HIJAU #12a37f untuk bagian yang jadi jawaban/harapan (jalur yang berhasil, titik yang naik, cahaya di balik pintu), dengan hijau pucat #d5f2e8 sebagai isian lembut. Ceritakan pesan sebagai METAFORA GARIS yang kamu rancang dari kalimat scene itu (contoh cara berpikirnya: jalan terputus lalu tersambung, dua rute yang berbeda nasib, pintu yang terbuka; cari metafora sendiri yang paling pas, jangan mengulang contoh ini). Satu metafora besar per scene, letaknya bebas di area ilustrasi, garisnya MUNCUL DENGAN DIGAMBAR (\`draw: s.at(...)\`), lalu aksen hijau datang belakangan sebagai jawabannya. Latar krem dipakai untuk kebanyakan scene; latar gelap (night, hijau hutan) untuk momen penegasan. Gerakan pelan dan tenang: garis tergambar, titik melompat lembut, bentuk berayun. Tanpa label pojok, tanpa tokoh manusia kecuali benar-benar perlu, tanpa objek 3D dan tanpa arsiran. (Apa pun gayanya, setiap orang/tokoh WAJIB faceless: tanpa mata, alis, hidung, mulut, atau ekspresi wajah.)`,
    sampleCode: `// ===== SCENE 1 =====
s.kamera([[0, 360, 620, 1], [3.5, 360, 560, 1.05]]);
s.sfx("ding", 1.85, 0.55);

const INK = "#24201a", GRN = "#12a37f", PALE = "#d5f2e8";
const drawBase = s.at(0.15, 0.9);
const drawBridge = s.at(1.25, 0.75);

// Metafora garis: dua tebing terputus, lalu jembatan hijau menyambungkannya
s.polyline([[90, 560], [270, 560], [270, 670]], { stroke: INK, width: 4, wobble: 0, hatch: false, draw: drawBase });
s.polyline([[450, 670], [450, 560], [630, 560]], { stroke: INK, width: 4, wobble: 0, hatch: false, draw: drawBase });

// Aksen hijau datang belakangan sebagai jawaban
s.circle(360, 520, 54, { fill: PALE, stroke: "none", alpha: drawBridge });
s.polyline([[270, 560], [360, 495], [450, 560]], { stroke: GRN, width: 4.5, wobble: 0, hatch: false, draw: drawBridge });
s.circle(s.lerp(270, 450, drawBridge), 560 - Math.sin(drawBridge * Math.PI) * 65, 9, {
  fill: GRN,
  stroke: "none",
  alpha: drawBridge
});

const txt = s.at(1.9, 0.4);
s.text("TERHUBUNG KEMBALI", 360, 770, { size: 32, color: INK, align: "center", weight: 700, alpha: txt });
s.line(210, 798, 210 + 300 * txt, 798, { stroke: GRN, width: 3.5 });`,
  },
];

export const VIDEO_STYLES_MAP: Record<PaletteId, VideoStylePreset> = VIDEO_STYLES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<PaletteId, VideoStylePreset>
);
