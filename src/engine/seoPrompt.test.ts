import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSeoGenerationPrompt,
  formatHashtagsCopyText,
  formatShortCopyText,
  formatTagsCopyText,
  formatYoutubeCopyText,
  sanitizeSeoMetadata,
} from './seoPrompt';
import { buildScriptGenerationPrompt } from './scriptPrompt';

test('buildSeoGenerationPrompt includes script narrations, creator promo, and SEO rules', () => {
  const prompt = buildSeoGenerationPrompt({
    title: 'Cara Berhenti Overthinking',
    topic: 'Cara berhenti overthinking malam hari',
    narrations: [
      'Jam dua pagi tapi otak masih muter terus.',
      'Coba tulis satu hal kecil yang bisa kamu kontrol besok.',
    ],
    creatorPromo: 'Cek template gratis di bio @kreator',
  });

  assert.ok(prompt.includes('Cara Berhenti Overthinking'));
  assert.ok(prompt.includes('Jam dua pagi tapi otak masih muter terus.'));
  assert.ok(prompt.includes('Cek template gratis di bio @kreator'));
  assert.ok(prompt.includes('1 KATA KUNCI UTAMA'));
  assert.ok(prompt.includes('maks 70 karakter'));
});

test('sanitizeSeoMetadata filters banned generic hashtags and normalizes tags', () => {
  const cleaned = sanitizeSeoMetadata({
    primaryKeyword: '  cara berhenti overthinking  ',
    secondaryKeywords: ['tips tidur nyenyak', '  '],
    title: '  Cara Berhenti Overthinking Sebelum Tidur  ',
    description: 'Pembuka\n\nDi video ini:\n✅ Poin satu',
    short: 'Otak masih muter jam 2 pagi? Coba trik ini!',
    tags: ['#Overthinking', 'Cara Berhenti Overthinking', '  '],
    hashtags: ['#Overthinking', '#fyp', '#viral', '#shorts', '#satsetmotion', 'tips tidur'],
  });

  assert.equal(cleaned.primaryKeyword, 'cara berhenti overthinking');
  assert.deepEqual(cleaned.secondaryKeywords, ['tips tidur nyenyak']);
  assert.deepEqual(cleaned.tags, ['overthinking', 'cara berhenti overthinking']);
  assert.deepEqual(cleaned.hashtags, ['#overthinking', '#tipstidur']);
});

test('SEO copy formatters produce ready-to-paste strings', () => {
  const seo = {
    title: 'Cara Berhenti Overthinking',
    description: 'Penjelasan singkat.\n\nDi video ini:\n✅ Trik 1 menit',
    short: 'Susah tidur karena mikir terus?',
    tags: ['overthinking', 'tips tidur'],
    hashtags: ['#overthinking', '#tipstidur'],
  };

  assert.equal(formatTagsCopyText(seo.tags), 'overthinking, tips tidur');
  assert.equal(formatHashtagsCopyText(seo.hashtags), '#overthinking #tipstidur');
  assert.equal(
    formatShortCopyText(seo),
    'Susah tidur karena mikir terus?\n\n#overthinking #tipstidur'
  );
  assert.equal(
    formatYoutubeCopyText(seo),
    'Cara Berhenti Overthinking\n\nPenjelasan singkat.\n\nDi video ini:\n✅ Trik 1 menit\n\n#overthinking #tipstidur'
  );
});

test('buildScriptGenerationPrompt instructs emphasis per scene and seo metadata', () => {
  const prompt = buildScriptGenerationPrompt({
    topic: 'Kenapa susah fokus saat kerja',
    styleTone: 'Storytelling Santai & Mengalir',
    styleName: 'Modern Flat',
    styleNuance: 'Energik',
    styleCardPrompt: 'Gaya flat',
    targetDurationSec: 30,
    sceneCount: 5,
    aspectRatio: '9:16',
    dims: '720x1280',
    paletteColors: {},
  });

  assert.ok(prompt.includes('emphasis:'));
  assert.ok(prompt.includes('digarisbawahi pada subtitle'));
  assert.ok(prompt.includes('objek `seo`'));
});
