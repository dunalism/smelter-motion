---
trigger: always_on
---

# GerakCanvas (smelter-motion) — Project Context

Jika file ini bertentangan dengan kode, percayai kode lalu perbaiki file ini.

## Ringkasan

GerakCanvas adalah studio video motion berbasis JavaScript Canvas yang berjalan di browser dengan backend Express untuk integrasi Gemini AI dan fallback transcode MP4. Alur kerja studio terdiri dari 4 tahap utama: Ide → Narasi → Suara → Animasi, lalu Export MP4.

## Stack

Bun, React 19, Vite 8, Tailwind CSS v4, Express 4, `@google/genai`, `mp4-muxer`, FFmpeg (opsional untuk fallback).

## Commands

- `bun run dev` (`bun server.ts`) · `bun run build` (`vite build`) · `bun run lint` (`tsc --noEmit`) · `bun test`

## Arsitektur

- State tunggal `ProjectState` dikelola di `src/App.tsx` dan dioper via props ke tiap tahap dan modal.
- Alur BYOK API key: disimpan di vault klien (`apiKeyVault`) → dikirim lewat header `X-Gemini-Api-Key` oleh `postJson()` → divalidasi `requireUserGeminiClient()` di `server.ts` → secret disaring oleh `redactApiKeySecrets()`.
- Pipeline render per frame (`renderSceneFrame`): scene canvas → subtitle overlay → watermark overlay.
- Ekspor MP4: WebCodecs H.264 + `mp4-muxer` (utama), fallback ke MediaRecorder + `POST /api/convert-mp4`.
- Semua route `/api/*` yang tidak cocok atau error middleware wajib mengembalikan JSON, bukan HTML.

## Struktur Singkat

`src/components/` berisi UI per tahap dan modal; `src/engine/` menangani kompilasi/render Canvas, math animasi, sinkronisasi kata-audio, subtitle, watermark, SFX, prompt AI, dan ekspor video; `src/data/` menyimpan preset gaya, suara TTS, dan proyek demo; `src/utils/` berisi helper API, vault key, dan preview suara browser.

## Keputusan & Alasan

- API key Gemini dikelola klien (BYOK) lewat header per request, tidak disimpan di server `[alasan: perlu konfirmasi]`.
- Preview contoh suara memakai Web Speech API browser (`voicePreview`) tanpa memanggil `/api/generate-tts` agar gratis tanpa memakan token/kuota API.
- Sinkronisasi kata-audio memisahkan decode WAV sinkron dan decode non-WAV (MP3/WebM/OGG/URL) asinkron karena `renderSceneFrame()` berjalan sinkron per frame.
- ID style subtitle lama dipertahankan lewat fallback mapping agar proyek/preset lama tidak rusak `[alasan: perlu konfirmasi]`.

## Jebakan

- `preloadProjectAudioTimings()` wajib dipanggil sebelum render sinkron (ekspor dan `AnimasiStep`); jika tidak, subtitle non-WAV tidak sinkron dengan suara tanpa error.
- Mengubah kontrak `MotionSceneContext` (`s`) memengaruhi preset bawaan dan prompt generator scene AI. Perbarui keduanya bersamaan.

## Konvensi & Guardrails

- UI & pesan error berbahasa Indonesia; tema gelap `#0B0E14`, teks `#E6ECF5`, font `Outfit`, `DM Sans`, `JetBrains Mono`.
- `vite.config.ts`: jangan ubah guard `DISABLE_HMR` dan plugin `copy-unbundled-src-assets`.
- File besar (jangan baca utuh, pakai `search_codebase` atau line-range): `server.ts`, `src/data/demoProject.ts`, `src/data/videoStyles.ts`, `src/engine/subtitleStylesData.ts`, `src/engine/subtitleRenderer.ts`, `src/engine/videoExporter.ts`.
- Jalankan `bun run lint` dan `bun test` setelah mengubah kode.

## Status / Ditunda

- Belum ada catatan tugas aktif atau fitur yang ditunda.
