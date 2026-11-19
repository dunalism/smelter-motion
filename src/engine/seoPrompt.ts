import type { SeoMetadata } from '../types/studio';

export interface SeoPromptInput {
  title: string;
  topic: string;
  narrations: string[];
  creatorPromo?: string;
}

export const SEO_SYSTEM_INSTRUCTION =
  'Kamu adalah pakar SEO YouTube Shorts, TikTok, dan Instagram Reels. Balas HANYA dengan JSON valid sesuai skema. Semua metadata harus ditulis dalam bahasa yang sama dengan naskah video (Bahasa Indonesia yang natural, jelas, dan mudah dicari orang).';

export const SEO_METADATA_RULES = `Metadata upload (YouTube, TikTok, Reels) supaya mudah ditemukan lewat pencarian, dalam bahasa video ini.
Tentukan dulu 1 KATA KUNCI UTAMA (frasa 2-4 kata yang benar-benar diketik orang, mis. "cara berhenti overthinking", bukan istilah puitis) dan 2-3 kata kunci turunan.
- "primaryKeyword": 1 kata kunci utama (frasa 2-4 kata yang sering dicari orang).
- "secondaryKeywords": array 2-3 kata kunci turunan yang relevan.
- "title": maks 70 karakter, kata kunci utama di awal + alasan jujur untuk mengklik (manfaat, angka, penasaran). Tanpa kapital semua, tanpa hashtag, maks 1 emoji.
- "description": RAPI, bukan satu paragraf; bagian dipisah baris kosong ("\\n\\n" di string JSON), poin dengan "\\n":
  1) pembuka 1-2 kalimat dengan kata kunci utama di kalimat pertama + apa yang didapat penonton;
  2) judul bagian (mis. "Di video ini:") lalu 3-4 poin berawalan emoji yang cocok (✅ 💡 🎬), maks ~12 kata per poin, memuat kata kunci turunan secara alami;
  3) penutup + ajakan spesifik (jika kreator memberi kontak/link, pakai persis; jika tidak ada, ajak komentar/simpan/bagikan).
  Maks ~700 karakter, jangan menyalin narasi mentah-mentah, jangan menumpuk kata kunci, tanpa hashtag.
- "short": caption TikTok/Reels 1-2 kalimat (maks ~150 karakter), bikin penasaran, boleh 1 emoji, tanpa hashtag, beda dari judul.
- "tags": 10-15 kata kunci (utama, variasi/sinonim, long-tail, 2-3 topik umum), huruf kecil semua tanpa "#", total gabungan karakter < 400 karakter.
- "hashtags": 4-6 hashtag yang BENAR-BENAR dipakai orang untuk topik ini, urut spesifik ke umum: 2-3 dari isi video (mis. "#berhentimenunda"), 1-2 niche/komunitas (mis. "#kontenkreator"), maks 1 umum yang nyambung. Huruf kecil tanpa spasi. DILARANG yang generik tak berhubungan (#viral, #fyp, #foryou, #trending, #explore), yang hampir sama, dan JANGAN sertakan "#shorts" atau "#satsetmotion".`;

export function buildSeoGenerationPrompt(input: SeoPromptInput): string {
  const scriptLines = input.narrations
    .map((n, idx) => `Scene ${idx + 1}: ${n.trim()}`)
    .filter((line) => line.length > 10)
    .join('\n');

  const promoSection = input.creatorPromo?.trim()
    ? `\nKontak / Link Promosi Kreator (masukkan persis di bagian penutup description): ${input.creatorPromo.trim()}`
    : '\nKontak / Link Promosi Kreator: (tidak ada, gunakan ajakan diskusi/komentar atau simpan video yang spesifik).';

  return `Buatkan metadata SEO upload (YouTube, TikTok, Reels) berdasarkan naskah video berikut.

Judul Proyek: ${input.title.trim() || 'Tanpa Judul'}
Topik Utama: ${input.topic.trim() || input.title.trim()}

Naskah Lengkap Per Scene:
${scriptLines || '(Naskah kosong, gunakan judul dan topik di atas)'}${promoSection}

ATURAN WAJIB SEO:
${SEO_METADATA_RULES}`;
}

const BANNED_HASHTAGS = new Set([
  '#viral',
  '#fyp',
  '#foryou',
  '#foryoupage',
  '#trending',
  '#explore',
  '#shorts',
  '#satsetmotion',
]);

export function sanitizeSeoMetadata(raw: Partial<SeoMetadata> | undefined): SeoMetadata {
  const tags = Array.isArray(raw?.tags)
    ? raw!.tags
        .map((t) => String(t).trim().replace(/^#+/, '').toLowerCase())
        .filter(Boolean)
        .slice(0, 15)
    : [];

  const hashtags = Array.isArray(raw?.hashtags)
    ? raw!.hashtags
        .map((h) => {
          const clean = String(h).trim().replace(/\s+/g, '').toLowerCase();
          return clean.startsWith('#') ? clean : `#${clean}`;
        })
        .filter((h) => h.length > 1 && !BANNED_HASHTAGS.has(h))
        .slice(0, 6)
    : [];

  return {
    primaryKeyword: typeof raw?.primaryKeyword === 'string' ? raw.primaryKeyword.trim() : '',
    secondaryKeywords: Array.isArray(raw?.secondaryKeywords)
      ? raw!.secondaryKeywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 4)
      : [],
    title: String(raw?.title || '').trim(),
    description: String(raw?.description || '').trim(),
    short: String(raw?.short || '').trim(),
    tags,
    hashtags,
  };
}

export function formatTagsCopyText(tags: string[]): string {
  return tags.map((t) => t.trim()).filter(Boolean).join(', ');
}

export function formatHashtagsCopyText(hashtags: string[]): string {
  return hashtags.map((h) => h.trim()).filter(Boolean).join(' ');
}

export function formatShortCopyText(seo: SeoMetadata): string {
  const tagsLine = formatHashtagsCopyText(seo.hashtags);
  if (!seo.short.trim()) return tagsLine;
  if (!tagsLine) return seo.short.trim();
  return `${seo.short.trim()}\n\n${tagsLine}`;
}

export function formatYoutubeCopyText(seo: SeoMetadata): string {
  const parts: string[] = [];
  if (seo.title.trim()) parts.push(seo.title.trim());
  if (seo.description.trim()) parts.push(seo.description.trim());
  const tagsLine = formatHashtagsCopyText(seo.hashtags);
  if (tagsLine) parts.push(tagsLine);
  return parts.join('\n\n');
}
