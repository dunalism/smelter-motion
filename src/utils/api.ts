import { ensureApiKeyVaultLoaded, getActiveGeminiApiKey } from './apiKeyVault';

export class ApiRequestError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export interface PostJsonOptions {
  apiKeyOverride?: string;
}

export async function postJson<T>(
  url: string,
  payload: unknown,
  options?: PostJsonOptions
): Promise<T> {
  await ensureApiKeyVaultLoaded();
  const apiKey = options?.apiKeyOverride ?? getActiveGeminiApiKey();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (apiKey) {
    headers['X-Gemini-Api-Key'] = apiKey;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const rawText = await res.text();
  const trimmed = rawText.trim();

  if (!trimmed) {
    throw new ApiRequestError(
      `Server mengembalikan respons kosong (HTTP ${res.status}). Silakan coba lagi.`,
      res.status
    );
  }

  if (trimmed.startsWith('<')) {
    if (res.status === 504 || res.status === 502 || res.status === 503) {
      throw new ApiRequestError(
        `Koneksi server timeout/sibuk (HTTP ${res.status}). Coba kurangi jumlah scene atau ulangi beberapa saat lagi.`,
        res.status
      );
    }
    throw new ApiRequestError(
      `Server mengembalikan halaman HTML alih-alih JSON (HTTP ${res.status}). Silakan muat ulang halaman atau coba lagi.`,
      res.status
    );
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    throw new ApiRequestError(
      `Respons server tidak valid (${res.status}): ${trimmed.slice(0, 140)}`,
      res.status
    );
  }

  if (!res.ok) {
    const errMsg =
      typeof parsed.error === 'string' && parsed.error.trim()
        ? parsed.error
        : `Permintaan gagal (HTTP ${res.status}).`;
    const errCode = typeof parsed.code === 'string' ? parsed.code : undefined;
    throw new ApiRequestError(errMsg, res.status, errCode);
  }

  return parsed as T;
}
