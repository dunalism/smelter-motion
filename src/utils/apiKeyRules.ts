export interface ApiKeyValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

// Printable ASCII without whitespace/control characters so it is safe in HTTP headers
// and supports any API key format (not tied to a specific prefix like AIza).
const PRINTABLE_HEADER_SAFE_REGEX = /^[\x21-\x7E]{8,512}$/;
const LEGACY_AIZA_PATTERN = /AIza[A-Za-z0-9_-]{12,}/g;

export function validateGeminiApiKeyFormat(raw: unknown): ApiKeyValidationResult {
  if (typeof raw !== 'string') {
    return {
      valid: false,
      normalized: '',
      error: 'API Key Gemini wajib diisi.',
    };
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      valid: false,
      normalized: '',
      error: 'API Key Gemini tidak boleh kosong.',
    };
  }

  if (/[\s\r\n]/.test(trimmed)) {
    return {
      valid: false,
      normalized: '',
      error: 'API Key Gemini tidak boleh mengandung spasi atau baris baru.',
    };
  }

  if (trimmed.length < 8) {
    return {
      valid: false,
      normalized: '',
      error: 'API Key Gemini terlalu pendek (minimal 8 karakter).',
    };
  }

  if (!PRINTABLE_HEADER_SAFE_REGEX.test(trimmed)) {
    return {
      valid: false,
      normalized: '',
      error: 'API Key Gemini mengandung karakter kontrol atau tidak didukung.',
    };
  }

  return {
    valid: true,
    normalized: trimmed,
  };
}

export function maskGeminiApiKey(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 10) {
    return `${trimmed.slice(0, 3)}••••`;
  }
  return `${trimmed.slice(0, 6)}••••••${trimmed.slice(-4)}`;
}

export function redactApiKeySecrets(message: string, knownKey?: string): string {
  if (!message) return '';
  let safe = message.replace(LEGACY_AIZA_PATTERN, '[API_KEY_DIRAHASIAKAN]');
  if (knownKey && knownKey.trim().length >= 8) {
    safe = safe.split(knownKey.trim()).join('[API_KEY_DIRAHASIAKAN]');
  }
  return safe;
}

export function extractUserApiKeyFromHeader(
  headerValue: string | string[] | undefined
): ApiKeyValidationResult {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!raw || !raw.trim()) {
    return {
      valid: false,
      normalized: '',
      error:
        'API Key Gemini belum diatur. Klik "Atur API Key" di bagian atas aplikasi untuk memasukkan kunci Anda.',
    };
  }
  return validateGeminiApiKeyFormat(raw);
}
