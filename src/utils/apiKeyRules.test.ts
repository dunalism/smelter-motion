import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractUserApiKeyFromHeader,
  maskGeminiApiKey,
  redactApiKeySecrets,
  validateGeminiApiKeyFormat,
} from './apiKeyRules';

test('validateGeminiApiKeyFormat accepts both AIza and non-AIza key formats', () => {
  const aiza = validateGeminiApiKeyFormat('  AIzaSyD-ExampleKey_1234567890abcdefghij  ');
  assert.equal(aiza.valid, true);
  assert.equal(aiza.normalized, 'AIzaSyD-ExampleKey_1234567890abcdefghij');

  const customPrefix = validateGeminiApiKeyFormat('gk_live_9876543210abcdef_custom.key');
  assert.equal(customPrefix.valid, true);
  assert.equal(customPrefix.normalized, 'gk_live_9876543210abcdef_custom.key');

  const tokenStyle = validateGeminiApiKeyFormat('ya29.a0AfH6SMC_token+with/chars=123');
  assert.equal(tokenStyle.valid, true);
});

test('validateGeminiApiKeyFormat rejects empty, whitespace, control chars, and short strings', () => {
  assert.equal(validateGeminiApiKeyFormat('').valid, false);
  assert.equal(validateGeminiApiKeyFormat('short').valid, false);
  assert.equal(validateGeminiApiKeyFormat('key with spaces 12345').valid, false);
  assert.equal(validateGeminiApiKeyFormat('key\nwithnewline12345').valid, false);
});

test('maskGeminiApiKey preserves only prefix and last 4 characters', () => {
  const masked = maskGeminiApiKey('gk_live_ExampleKey_1234567890abcd');
  assert.equal(masked, 'gk_liv••••••abcd');
  assert.equal(masked.includes('ExampleKey'), false);
});

test('redactApiKeySecrets scrubs AIza tokens and explicit knownKey values', () => {
  const raw = 'Request failed with key custom_secret_key_999888777 at endpoint';
  const safe = redactApiKeySecrets(raw, 'custom_secret_key_999888777');
  assert.equal(safe.includes('custom_secret_key_999888777'), false);
  assert.equal(safe, 'Request failed with key [API_KEY_DIRAHASIAKAN] at endpoint');
});

test('extractUserApiKeyFromHeader enforces header presence without prefix lock-in', () => {
  const missing = extractUserApiKeyFromHeader(undefined);
  assert.equal(missing.valid, false);

  const valid = extractUserApiKeyFromHeader('custom_gemini_key_1234567890');
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized, 'custom_gemini_key_1234567890');
});
