import 'dotenv/config';
import express from 'express';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { extractUserApiKeyFromHeader, redactApiKeySecrets } from './src/utils/apiKeyRules';
import {
  buildScriptGenerationPrompt,
  SCRIPT_SYSTEM_INSTRUCTION,
} from './src/engine/scriptPrompt';
import {
  buildSeoGenerationPrompt,
  sanitizeSeoMetadata,
  SEO_SYSTEM_INSTRUCTION,
} from './src/engine/seoPrompt';
import { resolveTtsModel, resolveVoiceName } from './src/data/ttsVoices';
import { estimateNarrationDurationSec } from './src/engine/motionMath';
import { buildFfmpegMp4Args, isMp4Buffer } from './src/engine/mp4ExportHelpers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '12mb' }));

// Prevent caching on API routes and avoid leaking sensitive headers
app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  next();
});

class ApiKeyError extends Error {
  status: number;
  code: 'MISSING_API_KEY' | 'INVALID_API_KEY';

  constructor(message: string, code: 'MISSING_API_KEY' | 'INVALID_API_KEY') {
    super(message);
    this.name = 'ApiKeyError';
    this.status = 401;
    this.code = code;
  }
}

function requireUserGeminiClient(
  req: express.Request,
  apiVersion: string = 'v1beta'
): GoogleGenAI {
  const rawHeader = req.header('x-gemini-api-key');
  const check = extractUserApiKeyFromHeader(rawHeader);
  if (!check.valid) {
    throw new ApiKeyError(
      check.error || 'API Key Gemini belum dimasukkan.',
      rawHeader && rawHeader.trim() ? 'INVALID_API_KEY' : 'MISSING_API_KEY'
    );
  }
  return new GoogleGenAI({
    apiKey: check.normalized,
    apiVersion,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function formatApiErrorResponse(
  err: unknown,
  fallbackMsg: string,
  knownKey?: string
): { status: number; body: { error: string; code?: string } } {
  if (err instanceof ApiKeyError) {
    return { status: err.status, body: { error: err.message, code: err.code } };
  }
  const rawMsg = err instanceof Error ? err.message : String(err || fallbackMsg);
  const safeMsg = redactApiKeySecrets(rawMsg, knownKey);
  if (
    safeMsg.includes('API_KEY_INVALID') ||
    safeMsg.includes('API key not valid') ||
    safeMsg.includes('PERMISSION_DENIED') ||
    safeMsg.includes('403')
  ) {
    return {
      status: 401,
      body: {
        error:
          'API Key Gemini ditolak atau tidak valid. Periksa kembali API key Anda di pengaturan UI.',
        code: 'INVALID_API_KEY',
      },
    };
  }
  return {
    status: 500,
    body: { error: safeMsg || fallbackMsg },
  };
}

function stripCodeFences(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^```(?:javascript|js|ts|json)?\s*\n([\s\S]*?)\n```$/i);
  if (match) return match[1].trim();
  return trimmed.replace(/^```(?:javascript|js|ts|json)?\s*/i, '').replace(/```$/i, '').trim();
}

function parseJsonSafely<T>(raw: string): T {
  const cleaned = stripCodeFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error('Format JSON dari AI tidak lengkap. Silakan coba lagi.');
  }
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes('503') ||
    msg.includes('429') ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('high demand') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('overloaded') ||
    msg.includes('ETIMEDOUT') ||
    msg.includes('ECONNRESET') ||
    msg.includes('fetch failed') ||
    msg.includes('TIMEOUT')
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`TIMEOUT (${label} > ${ms}ms)`)), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function generateTextWithFallback(
  ai: GoogleGenAI,
  contents: string,
  config: Record<string, unknown>,
  primaryModel: string = 'gemini-4-hydrogen',
  fallbackModel: string = 'gemini-3.1-flash-lite'
) {
  const attempts: Array<{ model: string; useThinkingLow: boolean; delayMs: number; timeoutMs: number }> = [
    { model: primaryModel, useThinkingLow: false, delayMs: 0, timeoutMs: 20000 },
    { model: primaryModel, useThinkingLow: false, delayMs: 400, timeoutMs: 20000 },
    { model: fallbackModel, useThinkingLow: true, delayMs: 300, timeoutMs: 18000 },
  ];

  let lastErr: unknown = null;
  for (const attempt of attempts) {
    if (attempt.delayMs > 0) await sleep(attempt.delayMs);
    try {
      const attemptConfig = attempt.useThinkingLow
        ? { ...config, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
        : { ...config };
      return await withTimeout(
        ai.models.generateContent({
          model: attempt.model,
          contents,
          config: attemptConfig,
        }),
        attempt.timeoutMs,
        attempt.model
      );
    } catch (err) {
      lastErr = err;
      if (!isRetryableError(err)) {
        throw err;
      }
    }
  }
  throw lastErr;
}

function estimateWavDurationSeconds(base64Wav: string): number {
  try {
    const buf = Buffer.from(base64Wav, 'base64');
    if (buf.length < 44) return 3.0;
    const byteRate = buf.readUInt32LE(28);
    if (byteRate > 0) {
      return Number(Math.max(0.8, (buf.length - 44) / byteRate).toFixed(2));
    }
    return Number(Math.max(0.8, (buf.length - 44) / 48000).toFixed(2));
  } catch {
    return 3.0;
  }
}

app.post('/api/verify-gemini-key', async (req, res) => {
  try {
    const ai = requireUserGeminiClient(req, 'v1beta');
    await withTimeout(
      ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: 'Balas dengan satu kata: OK',
        config: { maxOutputTokens: 4 },
      }),
      12000,
      'verify-gemini-key'
    );
    res.json({ ok: true, model: 'gemini-3.1-flash-lite' });
  } catch (err) {
    const formatted = formatApiErrorResponse(
      err,
      'Gagal memverifikasi API Key Gemini.',
      req.header('x-gemini-api-key')
    );
    res.status(formatted.status).json(formatted.body);
  }
});

app.post('/api/generate-script', async (req, res) => {
  try {
    const {
      topic,
      styleTone = 'Edukasi Dinamis',
      styleName = 'Hologram Cyan',
      styleNuance = '',
      styleCardPrompt = '',
      targetDurationSec = 30,
      sceneCount,
      aspectRatio = '9:16',
      paletteColors = { bg: '#060913', primary: '#29e7ff', secondary: '#b26bff', accent: '#ff3fd1', text: '#f0f7ff' },
    } = req.body ?? {};

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      res.status(400).json({ error: 'Topik video wajib diisi.' });
      return;
    }

    const ai = requireUserGeminiClient(req, 'v1beta');
    const dims = aspectRatio === '16:9' ? '1280x720' : aspectRatio === '1:1' ? '960x960' : '720x1280';

    const prompt = buildScriptGenerationPrompt({
      topic,
      styleTone,
      styleName,
      styleNuance,
      styleCardPrompt,
      targetDurationSec,
      sceneCount,
      aspectRatio,
      dims,
      paletteColors,
    });

    const response = await generateTextWithFallback(ai, prompt, {
      systemInstruction: SCRIPT_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'Judul proyek video yang menarik' },
          seo: {
            type: Type.OBJECT,
            properties: {
              primaryKeyword: { type: Type.STRING },
              secondaryKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              short: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'description', 'short', 'tags', 'hashtags'],
          },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                narration: { type: Type.STRING },
                emphasis: { type: Type.STRING },
                visualBrief: { type: Type.STRING },
                cameraHint: { type: Type.STRING },
                durationSec: { type: Type.NUMBER },
                code: { type: Type.STRING },
              },
              required: [
                'title',
                'narration',
                'emphasis',
                'visualBrief',
                'cameraHint',
                'durationSec',
                'code',
              ],
            },
          },
        },
        required: ['title', 'scenes'],
      },
    });

    const parsed = parseJsonSafely<{
      title?: string;
      seo?: Record<string, unknown>;
      scenes?: Array<Record<string, unknown>>;
    }>(response.text ?? '{}');
    if (Array.isArray(parsed.scenes)) {
      parsed.scenes = parsed.scenes.map((sc) => {
        const narrationStr = typeof sc.narration === 'string' ? sc.narration : '';
        const rawDur = Number(sc.durationSec);
        const naturalDur = estimateNarrationDurationSec(narrationStr, 3.5);
        return {
          ...sc,
          durationSec:
            Number.isFinite(rawDur) && rawDur >= 1.2
              ? Math.min(20, rawDur)
              : naturalDur,
          emphasis: typeof sc.emphasis === 'string' ? sc.emphasis.trim() : '',
          code:
            typeof sc.code === 'string'
              ? sc.code.replace(/^(\/\/\s*=+\s*SCENE\s*\d+\s*=+)[ \t]+(?=\S)/i, '$1\n')
              : '',
        };
      });
    }
    if (parsed.seo) {
      parsed.seo = sanitizeSeoMetadata(parsed.seo) as unknown as Record<string, unknown>;
    }
    res.json(parsed);
  } catch (err) {
    const formatted = formatApiErrorResponse(
      err,
      'Gagal membuat skrip otomatis.',
      req.header('x-gemini-api-key')
    );
    res.status(formatted.status).json(formatted.body);
  }
});

app.post('/api/generate-seo', async (req, res) => {
  try {
    const {
      title = '',
      topic = '',
      narrations = [],
      creatorPromo = '',
    } = req.body ?? {};

    const cleanNarrations = Array.isArray(narrations)
      ? narrations.map((n) => String(n ?? '').trim()).filter(Boolean)
      : [];

    if (cleanNarrations.length === 0 && !String(topic || title).trim()) {
      res.status(400).json({ error: 'Naskah atau topik video diperlukan untuk membuat SEO.' });
      return;
    }

    const ai = requireUserGeminiClient(req, 'v1beta');
    const prompt = buildSeoGenerationPrompt({
      title: String(title || ''),
      topic: String(topic || ''),
      narrations: cleanNarrations,
      creatorPromo: String(creatorPromo || ''),
    });

    const response = await generateTextWithFallback(ai, prompt, {
      systemInstruction: SEO_SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          primaryKeyword: { type: Type.STRING },
          secondaryKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          short: { type: Type.STRING },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'description', 'short', 'tags', 'hashtags'],
      },
    });

    const parsed = parseJsonSafely<Record<string, unknown>>(response.text ?? '{}');
    res.json({ seo: sanitizeSeoMetadata(parsed) });
  } catch (err) {
    const formatted = formatApiErrorResponse(
      err,
      'Gagal membuat metadata SEO.',
      req.header('x-gemini-api-key')
    );
    res.status(formatted.status).json(formatted.body);
  }
});

app.post('/api/generate-tts', async (req, res) => {
  try {
    const {
      text,
      voiceName = 'Kore',
      style = 'Jelas, energik, dan natural seperti narator video edukasi modern berbahasa Indonesia',
      model = 'gemini-3.8-flash-tts',
    } = req.body ?? {};

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Teks narasi tidak boleh kosong.' });
      return;
    }

    const ai = requireUserGeminiClient(req, 'v1beta');
    const selectedModel = resolveTtsModel(model);
    const selectedVoice = resolveVoiceName(voiceName);
    const cleanText = text.trim();
    const cleanStyle = typeof style === 'string' ? style.trim() : '';

    const runTtsRequest = async (useSpeechMetadata: boolean) => {
      const partPayload =
        useSpeechMetadata && cleanStyle
          ? { text: cleanText, speechMetadata: { style: cleanStyle } }
          : {
              text: cleanStyle ? `Bacakan dengan gaya ${cleanStyle}: ${cleanText}` : cleanText,
            };

      return await withTimeout(
        ai.models.generateContent({
          model: selectedModel,
          contents: [
            {
              role: 'user',
              parts: [partPayload],
            },
          ],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice },
              },
            },
          },
        }),
        25000,
        selectedModel
      );
    };

    let response;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) await sleep(450);
      try {
        try {
          response = await runTtsRequest(true);
        } catch (firstErr) {
          const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
          if (msg.includes('speechMetadata')) {
            response = await runTtsRequest(false);
          } else {
            throw firstErr;
          }
        }
        break;
      } catch (err) {
        lastErr = err;
        if (!isRetryableError(err)) {
          throw err;
        }
      }
    }

    if (!response) {
      throw lastErr || new Error('Gagal menghasilkan audio TTS.');
    }

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      res.status(502).json({ error: 'Model TTS tidak mengembalikan data audio.' });
      return;
    }

    const durationSec = estimateWavDurationSeconds(base64Audio);
    res.json({
      audioDataUrl: `data:audio/wav;base64,${base64Audio}`,
      durationSec,
      voiceName: selectedVoice,
      model: selectedModel,
    });
  } catch (err) {
    const formatted = formatApiErrorResponse(
      err,
      'Gagal membuat suara AI.',
      req.header('x-gemini-api-key')
    );
    res.status(formatted.status).json(formatted.body);
  }
});

app.post('/api/generate-scene-code', async (req, res) => {
  try {
    const { prompt } = req.body ?? {};
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'Prompt animasi tidak boleh kosong.' });
      return;
    }

    const ai = requireUserGeminiClient(req, 'v1beta');
    const response = await generateTextWithFallback(ai, prompt.trim(), {
      systemInstruction:
        'Kamu adalah spesialis motion graphics JavaScript Canvas 2D. Balas HANYA dengan kode JavaScript murni yang valid sesuai spesifikasi objek `s` pada prompt. Jangan sertakan penjelasan markdown di luar kode.',
    });

    const code = stripCodeFences(response.text ?? '');
    res.json({ code });
  } catch (err) {
    const formatted = formatApiErrorResponse(
      err,
      'Gagal menghasilkan kode animasi.',
      req.header('x-gemini-api-key')
    );
    res.status(formatted.status).json(formatted.body);
  }
});

app.post(
  '/api/convert-mp4',
  express.raw({ type: ['video/*', 'application/octet-stream'], limit: '200mb' }),
  async (req, res) => {
    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
      res.status(400).json({ error: 'Data video tidak ditemukan atau kosong.' });
      return;
    }

    const rawExt = String(req.header('x-input-ext') || 'webm').toLowerCase().trim();
    const inputExt = rawExt === 'mp4' ? 'mp4' : 'webm';
    const rawFps = Number(req.header('x-video-fps') || '30');
    const safeFps = Number.isFinite(rawFps) ? Math.max(15, Math.min(60, Math.round(rawFps))) : 30;
    const includeAudio = req.header('x-include-audio') !== 'false';

    const tempDir = path.join(os.tmpdir(), `gerakcanvas-mp4-${randomUUID()}`);
    const inputPath = path.join(tempDir, `input.${inputExt}`);
    const outputPath = path.join(tempDir, 'output.mp4');

    let killedByClient = false;
    let ffmpegChild: ReturnType<typeof spawn> | null = null;

    const handleClose = () => {
      if (!res.writableEnded && ffmpegChild && !ffmpegChild.killed) {
        killedByClient = true;
        ffmpegChild.kill('SIGKILL');
      }
    };
    req.on('close', handleClose);

    try {
      await fs.mkdir(tempDir, { recursive: true });
      await fs.writeFile(inputPath, rawBody);

      const args = buildFfmpegMp4Args({
        inputPath,
        outputPath,
        fps: safeFps,
        includeAudio,
      });

      await new Promise<void>((resolve, reject) => {
        const child = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
        ffmpegChild = child;

        let stderrTail = '';
        child.stderr.on('data', (chunk: Buffer) => {
          stderrTail = (stderrTail + chunk.toString('utf8')).slice(-2500);
        });

        const timer = setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
          reject(new Error('Konversi video ke MP4 melebihi batas waktu.'));
        }, 120_000);

        child.on('error', (err) => {
          clearTimeout(timer);
          reject(new Error(`FFmpeg gagal dijalankan: ${err.message}`));
        });

        child.on('close', (code) => {
          clearTimeout(timer);
          if (killedByClient) {
            reject(new Error('Konversi MP4 dibatalkan oleh klien.'));
            return;
          }
          if (code !== 0) {
            reject(new Error(`Konversi MP4 gagal (kode ${code}): ${stderrTail.slice(-300)}`));
            return;
          }
          resolve();
        });
      });

      const mp4Buffer = await fs.readFile(outputPath);
      if (!isMp4Buffer(mp4Buffer)) {
        throw new Error('Hasil konversi tidak memiliki header MP4 yang valid.');
      }

      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', 'attachment; filename="video.mp4"');
      res.setHeader('Content-Length', String(mp4Buffer.length));
      res.send(mp4Buffer);
    } catch (err) {
      if (!res.headersSent) {
        const msg = err instanceof Error ? err.message : 'Gagal mengonversi video ke MP4.';
        res.status(killedByClient ? 499 : 500).json({ error: msg });
      }
    } finally {
      req.off('close', handleClose);
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    }
  }
);

// Ensure unmatched /api/* routes always return JSON instead of HTML
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `Endpoint API tidak ditemukan: ${req.method} ${req.path}` });
});

// Ensure Express middleware errors (e.g. malformed JSON body) return JSON instead of HTML
app.use(
  (
    err: unknown,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (req.path.startsWith('/api/')) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan server API.';
      res.status(500).json({ error: msg });
      return;
    }
    next(err);
  }
);

async function startServer() {
  const port = Number(process.env.PORT) || 3000;
  const isProduction =
    process.env.NODE_ENV === 'production' || process.argv.includes('--production');

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    const indexHtml = path.join(distDir, 'index.html');
    try {
      await fs.access(indexHtml);
    } catch {
      console.error(
        `Build folder tidak ditemukan (${indexHtml}). Jalankan "bun run build" terlebih dahulu.`
      );
      process.exit(1);
    }
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(indexHtml);
    });
  }

  app.listen(port, '0.0.0.0', () => {
    const mode = isProduction ? 'production' : 'development';
    console.log(`GerakCanvas studio server (${mode}) listening on http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
