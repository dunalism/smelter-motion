import test from 'node:test';
import assert from 'node:assert/strict';
import { TTS_VOICES } from '../data/ttsVoices';
import { getVoicePreviewTuning, pickBrowserSpeechVoice } from './voicePreview';

test('getVoicePreviewTuning provides valid pitch and rate tuning for all TTS voice presets', () => {
  for (const voice of TTS_VOICES) {
    const tuning = getVoicePreviewTuning(voice);
    assert.ok(tuning.pitch >= 0.5 && tuning.pitch <= 1.5);
    assert.ok(tuning.rate >= 0.75 && tuning.rate <= 1.3);
  }
});

test('pickBrowserSpeechVoice prefers Indonesian voices matching requested gender', () => {
  const mockVoices = [
    { name: 'English US', lang: 'en-US' },
    { name: 'Microsoft Ardi Online (Natural) - Indonesian (Indonesia)', lang: 'id-ID' },
    { name: 'Microsoft Gadis Online (Natural) - Indonesian (Indonesia)', lang: 'id-ID' },
  ] as SpeechSynthesisVoice[];

  assert.ok(pickBrowserSpeechVoice(mockVoices, 'female')?.name.includes('Gadis'));
  assert.ok(pickBrowserSpeechVoice(mockVoices, 'male')?.name.includes('Ardi'));
});

test('pickBrowserSpeechVoice falls back gracefully when no Indonesian or gender-matched voice exists', () => {
  const mockVoices = [
    { name: 'Default System Voice', lang: 'en-US' },
  ] as SpeechSynthesisVoice[];

  assert.equal(pickBrowserSpeechVoice(mockVoices, 'female')?.name, 'Default System Voice');
  assert.equal(pickBrowserSpeechVoice([], 'male'), null);
});

