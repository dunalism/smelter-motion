import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterVoicesByGender,
  getVoicePreset,
  resolveTtsModel,
  resolveVoiceName,
  TTS_MODELS,
  TTS_VOICES,
} from './ttsVoices';
import { buildScriptGenerationPrompt } from '../engine/scriptPrompt';

test('TTS_VOICES has expanded balanced female and male voices with metadata and samples', () => {
  const females = filterVoicesByGender('female');
  const males = filterVoicesByGender('male');
  assert.ok(TTS_VOICES.length >= 16, 'Expected expanded voice catalog');
  assert.ok(females.length >= 8, 'Expected at least 8 female voices');
  assert.ok(males.length >= 8, 'Expected at least 8 male voices');

  for (const voice of TTS_VOICES) {
    assert.ok(voice.id.length > 0);
    assert.ok(voice.speakingStyle.trim().length > 5);
    assert.ok(voice.bestFor.trim().length > 10);
    assert.ok(voice.sampleText.trim().length > 10);
    assert.ok(voice.defaultStylePrompt.trim().length > 5);
  }
});

test('resolveTtsModel supports flash-tts and flash-lite-tts accurately', () => {
  assert.equal(TTS_MODELS.length, 2);
  assert.equal(resolveTtsModel('gemini-3.8-flash-tts'), 'gemini-3.8-flash-tts');
  assert.equal(resolveTtsModel('flash-tts'), 'gemini-3.8-flash-tts');
  assert.equal(resolveTtsModel('gemini-3.8-flash-lite-tts'), 'gemini-3.8-flash-lite-tts');
  assert.equal(resolveTtsModel('flash-lite-tts'), 'gemini-3.8-flash-lite-tts');
  assert.equal(resolveTtsModel(undefined), 'gemini-3.8-flash-tts');
});

test('resolveVoiceName validates catalog voice names and falls back safely', () => {
  assert.equal(resolveVoiceName('Aoede'), 'Aoede');
  assert.equal(resolveVoiceName('Charon'), 'Charon');
  assert.equal(resolveVoiceName('UnknownVoice'), 'Kore');
  assert.equal(getVoicePreset('Puck').gender, 'male');
  assert.equal(getVoicePreset('Sulafat').gender, 'female');
});

test('buildScriptGenerationPrompt enforces natural narration rules and removes conflicting limits', () => {
  const prompt = buildScriptGenerationPrompt({
    topic: 'Kenapa susah mulai kerja pagi hari',
    styleTone: 'Storytelling Santai & Mengalir',
    styleName: 'Modern Flat',
    styleNuance: 'Energik',
    styleCardPrompt: 'Gaya flat bersih',
    targetDurationSec: 30,
    sceneCount: 5,
    aspectRatio: '9:16',
    dims: '720x1280',
    paletteColors: { bg: '#ffffff', primary: '#4f6bff' },
  });

  assert.ok(prompt.includes('Cara menulis narasi (paling penting)'));
  assert.ok(prompt.includes('4-12 kata'));
  assert.ok(prompt.includes('minimal 2 detik'));
  assert.ok(prompt.includes('Rehook'));
  assert.equal(prompt.includes('8-18 kata'), false);
});

test('buildScriptGenerationPrompt adapts scene count and duration naturally to narration when sceneCount is omitted', () => {
  const prompt = buildScriptGenerationPrompt({
    topic: 'Kenapa susah fokus pagi hari',
    styleTone: 'Storytelling Santai & Mengalir',
    styleName: 'Modern Flat',
    styleNuance: 'Energik',
    styleCardPrompt: 'Gaya flat bersih',
    targetDurationSec: 25,
    aspectRatio: '9:16',
    dims: '720x1280',
    paletteColors: { bg: '#ffffff', primary: '#4f6bff' },
  });

  assert.ok(prompt.includes('PRINSIP DURASI SCENE NATURAL'));
  assert.ok(prompt.includes('tentukan jumlah scene secara alami'));
  assert.equal(prompt.includes('DILARANG keras membuat scene lebih dari 4.0 detik'), false);
});
