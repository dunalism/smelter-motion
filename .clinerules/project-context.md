# GerakCanvas (smelter-motion) — Project Context

Read this file first instead of scanning the repo. Use `search_codebase` or targeted line-range `read_files` before opening large files.

## Stack & Runtime
- **App:** GerakCanvas — JavaScript Canvas motion video studio (Ide → Narasi → Suara → Animasi → Export MP4).
- **Frontend:** React 19, Vite 8, Tailwind CSS v4 (`@tailwindcss/vite`), Lucide icons, `motion`, `mp4-muxer`.
- **Backend:** Express 4 (`server.ts`) serving Vite middleware (dev) or `dist/` (prod) + `/api/*` routes.
- **AI:** `@google/genai` (BYOK via `X-Gemini-Api-Key` header).
- **Alias:** `@/*` → `./*` (`tsconfig.json`, `vite.config.ts`).
- **UI Language:** Indonesian (`id`).

## Commands
- Dev server: `bun run dev` (`bun server.ts`)
- Build: `bun run build` (`vite build`)
- Typecheck: `bun run lint` (`tsc --noEmit`)
- Tests: `bun test` (46 tests across 9 `*.test.ts` files, ~586ms)

## Architecture & Data Flow
1. **State (`src/App.tsx`):** Single `ProjectState` (`useState`, initialized from `DEMO_PROJECT`), passed via `(project, onUpdateProject)` to step components (`ide` | `narasi` | `suara` | `animasi`) + `ExportModal` + `ApiKeyModal`.
2. **BYOK API Key:** Stored in `src/utils/apiKeyVault.ts`, attached as `X-Gemini-Api-Key` by `postJson()` (`src/utils/api.ts`), validated on server by `requireUserGeminiClient()` (`server.ts`), redacted via `redactApiKeySecrets()` (`src/utils/apiKeyRules.ts`).
3. **API Endpoints (`server.ts`):**
   - `POST /api/verify-gemini-key`
   - `POST /api/generate-script`
   - `POST /api/generate-seo`
   - `POST /api/generate-tts`
   - `POST /api/generate-scene-code`
   - `POST /api/convert-mp4` (FFmpeg `libx264` + `yuv420p` transcode fallback)
   - Unmatched `/api/*` always returns JSON (`404`/`500`), never HTML.

## File Map
- `src/types/studio.ts` — All core types: `ProjectState` (includes `subtitles`, `watermark?`, `scenes`, `seo?`), `SceneItem`, `SceneAudio`, `SeoMetadata`, `PaletteId` (11), `VideoStylePreset`, `SubtitleSettings` (`enabled`, `fontSize`, `position`, `style`, `accentColor`), `SubtitleStyle` (15 curated IDs: `tulisan_tangan`, `mesin_ketik`, `sorot_kata`, `stiker_kertas`, `pop_tebal`, `karaoke`, `kotak_putih`, `kotak_gelap`, `glitch`, `panduan_atas`, `elegan_atas`, `satu_kata`, `neon`, `kartu_selotip`, `garis_bawah`), `WatermarkSettings` (`enabled`, `platforms`, `position`, `opacity`, `scale`, `text?`), `WatermarkPlatform` (`instagram` | `youtube` | `tiktok` | `facebook`), `WatermarkPosition` (`bottom-left` | `bottom-right` | `top-left` | `top-right`).
- `src/components/` — `TopBar.tsx`, `IdeStep.tsx`, `NarasiStep.tsx`, `SuaraStep.tsx`, `AnimasiStep.tsx` (preloads audio word timings, triggers `SubtitleStudioModal` & `WatermarkModal`), `ExportModal.tsx`, `ApiKeyModal.tsx`, `SeoPanel.tsx`, `SubtitleStudioModal.tsx`, `WatermarkModal.tsx`.
- `src/engine/canvasRenderer.ts` — `compileSceneCode()`, `renderSceneFrame()` (renders scene + subtitle + watermark overlays). Exposes `MotionSceneContext` (`s`): `t`, `width`, `height`, `kamera`, `sfx`, `group`, `line`, `polyline`, `rect`, `circle`, `ellipse`, `arc`, `box3d`, `text`, `text3d`, `sparkle`, `burst`, Belah Warna helpers (`field`, `side`, `both`, `slab`, `disc`, `word`), math (`spring`, `stagger`, `keys`, `wave`, `at`, `lerp`, `rand`, `ease`).
- `src/engine/motionMath.ts` — `spring`, `ease`, `stagger`, `keys`, `evaluateCamera`, `splitMultiSceneCode`, `inferSceneDurationFromCode`, `resolveSceneAtTime`.
- `src/engine/wordTiming.ts` — Audio-to-subtitle word-level sync: `getWordTimings()` (sync cache + WAV PCM decode via `decodeWavPcmSamples()`/`alignWordsToPcm()`, fallback `computeSmartWordTimings()`), `ensureAudioWordTimings()` & `preloadProjectAudioTimings()` (async decode for MP3/WebM/OGG/URL).
- `src/engine/subtitleRenderer.ts`, `subtitleConfig.ts`, `subtitleStylesData.ts` — 15 curated subtitle styles (+ `LEGACY_STYLE_FALLBACK`), `resolveSubtitleConfig()`, `renderSubtitleOverlay()` (synced via `getWordTimings()` with `audioDataUrl` & `audioDurationSec`), `renderSubtitlePreviewFrame()`, `extractAutoEmphasisKeywords()`.
- `src/engine/watermarkRenderer.ts` — Social media corner-safe watermark overlay: `WATERMARK_PLATFORMS`, `DEFAULT_WATERMARK_SETTINGS`, `normalizeWatermarkSettings()`, `computeWatermarkLayout()`, `renderWatermarkOverlay()`, `renderWatermarkPreviewFrame()`.
- `src/engine/videoExporter.ts`, `mp4ExportHelpers.ts` — WebCodecs H.264 + `mp4-muxer` export (calls `preloadProjectAudioTimings()` before render, passes `watermark` & `subtitles` to `renderSceneFrame()`); MediaRecorder + `/api/convert-mp4` fallback.
- `src/engine/sfxSynthesizer.ts` — Procedural Web Audio SFX.
- `src/engine/scriptPrompt.ts`, `seoPrompt.ts` — Gemini prompt builders & metadata sanitizers.
- `src/data/videoStyles.ts` (11 presets), `ttsVoices.ts` (TTS models + voices), `demoProject.ts`.
- `src/utils/api.ts` (`postJson`, `ApiRequestError`), `apiKeyRules.ts`, `apiKeyVault.ts`.

## Conventions & Guardrails
- **Theme:** Dark canvas `#0B0E14`, text `#E6ECF5`, fonts `Outfit` (display), `DM Sans` (sans), `JetBrains Mono` (mono) in `index.html` & `src/index.css`.
- **Vite (`vite.config.ts`):** Keep `DISABLE_HMR` check and `copy-unbundled-src-assets` plugin intact.
- **Large files (avoid full-file reads; use `search_codebase` or line ranges):** `server.ts` (~686L), `src/data/demoProject.ts`, `src/data/videoStyles.ts`, `src/engine/subtitleStylesData.ts`, `src/engine/subtitleRenderer.ts`, `src/engine/videoExporter.ts`.
- **Verification:** Run `bun run lint` and `bun test` after code changes.
