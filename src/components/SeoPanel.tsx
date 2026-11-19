import { useState } from 'react';
import type { ProjectState, SeoMetadata } from '../types/studio';
import {
  formatHashtagsCopyText,
  formatShortCopyText,
  formatTagsCopyText,
  formatYoutubeCopyText,
  sanitizeSeoMetadata,
} from '../engine/seoPrompt';
import { ApiRequestError, postJson } from '../utils/api';
import { Check, Copy, Hash, KeyRound, Loader2, Sparkles, Tag } from 'lucide-react';

interface SeoPanelProps {
  project: ProjectState;
  onUpdateProject: (updater: (prev: ProjectState) => ProjectState) => void;
  hasApiKey: boolean;
  onOpenApiKeyModal: () => void;
  compact?: boolean;
}

const EMPTY_SEO: SeoMetadata = {
  primaryKeyword: '',
  secondaryKeywords: [],
  title: '',
  description: '',
  short: '',
  tags: [],
  hashtags: [],
};

export function SeoPanel({
  project,
  onUpdateProject,
  hasApiKey,
  onOpenApiKeyModal,
  compact = false,
}: SeoPanelProps) {
  const [creatorPromo, setCreatorPromo] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [needsApiKeyAction, setNeedsApiKeyAction] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const seo = project.seo ?? EMPTY_SEO;
  const hasSeoContent = Boolean(
    seo.title || seo.description || seo.short || seo.tags.length > 0 || seo.hashtags.length > 0
  );

  const updateSeo = (patch: Partial<SeoMetadata>) => {
    onUpdateProject((prev) => ({
      ...prev,
      seo: {
        ...(prev.seo ?? EMPTY_SEO),
        ...patch,
      },
    }));
  };

  const handleCopy = async (key: string, value: string) => {
    if (!value.trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Clipboard blocked fallback
    }
  };

  const handleGenerateSeo = async () => {
    setErrorMsg(null);
    setNeedsApiKeyAction(false);
    setIsGenerating(true);
    try {
      const data = await postJson<{ seo?: Partial<SeoMetadata> }>('/api/generate-seo', {
        title: project.title,
        topic: project.topic,
        narrations: project.scenes.map((sc) => sc.narration),
        creatorPromo: creatorPromo.trim(),
      });
      if (!data.seo) {
        throw new Error('Server tidak mengembalikan data SEO.');
      }
      const cleaned = sanitizeSeoMetadata(data.seo);
      onUpdateProject((prev) => ({
        ...prev,
        seo: cleaned,
      }));
    } catch (err) {
      if (
        err instanceof ApiRequestError &&
        (err.status === 401 || err.code === 'MISSING_API_KEY' || err.code === 'INVALID_API_KEY')
      ) {
        setNeedsApiKeyAction(true);
      }
      setErrorMsg(err instanceof Error ? err.message : 'Gagal membuat metadata SEO.');
    } finally {
      setIsGenerating(false);
    }
  };

  const tagsText = formatTagsCopyText(seo.tags);
  const hashtagsText = formatHashtagsCopyText(seo.hashtags);

  return (
    <section className={`bg-[#121722] border border-[#222A3A] rounded-xl ${compact ? 'p-4' : 'p-5 sm:p-6'} space-y-4`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222A3A] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-400" aria-hidden="true" />
            <h2 className="font-display text-base sm:text-lg font-bold text-white">
              SEO &amp; Caption Generator
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            Dibuat otomatis dari naskah video untuk YouTube, TikTok, dan Reels — siap langsung copas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasSeoContent && (
            <>
              <button
                type="button"
                onClick={() => handleCopy('bundle-short', formatShortCopyText(seo))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-200 hover:bg-[#1E283B]"
              >
                {copiedKey === 'bundle-short' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{copiedKey === 'bundle-short' ? 'Tersalin!' : 'Salin TikTok/Reels'}</span>
              </button>
              <button
                type="button"
                onClick={() => handleCopy('bundle-yt', formatYoutubeCopyText(seo))}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-200 hover:bg-[#1E283B]"
              >
                {copiedKey === 'bundle-yt' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-sky-400" />
                )}
                <span>{copiedKey === 'bundle-yt' ? 'Tersalin!' : 'Salin Paket YouTube'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleGenerateSeo}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-500 text-slate-950 text-xs font-semibold hover:bg-sky-400 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>
              {isGenerating
                ? 'Menyusun SEO...'
                : hasSeoContent
                  ? 'Buat Ulang SEO'
                  : 'Buat SEO dari Naskah'}
            </span>
          </button>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <label htmlFor="seo-creator-promo" className="text-xs font-medium text-slate-300 shrink-0">
          Kontak / Link Kreator (opsional):
        </label>
        <input
          id="seo-creator-promo"
          type="text"
          value={creatorPromo}
          onChange={(e) => setCreatorPromo(e.target.value)}
          placeholder="Contoh: Cek link di bio atau IG @namakamu"
          className="flex-1 bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
        />
      </div>

      {!hasApiKey && (
        <div className="rounded-lg bg-amber-950/30 border border-amber-500/30 px-3 py-2 text-xs text-amber-200 flex items-center justify-between gap-2">
          <span>Atur API Key Gemini untuk membuat atau memperbarui SEO otomatis dari naskah.</span>
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className="inline-flex items-center gap-1 font-semibold text-amber-300 hover:underline shrink-0"
          >
            <KeyRound className="w-3 h-3" />
            <span>Atur API Key</span>
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-lg bg-rose-950/50 border border-rose-500/40 px-3 py-2 text-xs text-rose-200 flex items-center justify-between gap-2"
        >
          <span>{errorMsg}</span>
          {needsApiKeyAction && (
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className="font-semibold text-amber-300 hover:underline shrink-0"
            >
              Atur API Key
            </button>
          )}
        </div>
      )}

      {(seo.primaryKeyword || (seo.secondaryKeywords && seo.secondaryKeywords.length > 0)) && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {seo.primaryKeyword && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-medium">
              Kata Kunci Utama: {seo.primaryKeyword}
            </span>
          )}
          {seo.secondaryKeywords?.map((kw, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full bg-[#0B0E14] border border-[#263042] text-slate-300"
            >
              {kw}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="seo-title-input" className="text-xs font-medium text-slate-300">
              Judul YouTube
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  seo.title.length > 70 ? 'text-amber-400' : 'text-slate-500'
                }`}
              >
                {seo.title.length}/70
              </span>
              <button
                type="button"
                onClick={() => handleCopy('title', seo.title)}
                disabled={!seo.title}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-40"
              >
                {copiedKey === 'title' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'title' ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
          <input
            id="seo-title-input"
            type="text"
            value={seo.title}
            onChange={(e) => updateSeo({ title: e.target.value })}
            placeholder="Judul video ramah pencarian (maks 70 karakter)"
            className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="seo-short-input" className="text-xs font-medium text-slate-300">
              Caption TikTok / Reels
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  seo.short.length > 150 ? 'text-amber-400' : 'text-slate-500'
                }`}
              >
                {seo.short.length}/150
              </span>
              <button
                type="button"
                onClick={() => handleCopy('short', seo.short)}
                disabled={!seo.short}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-40"
              >
                {copiedKey === 'short' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'short' ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
          <input
            id="seo-short-input"
            type="text"
            value={seo.short}
            onChange={(e) => updateSeo({ short: e.target.value })}
            placeholder="Caption 1-2 kalimat yang bikin penasaran"
            className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="seo-desc-input" className="text-xs font-medium text-slate-300">
              Deskripsi YouTube
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  seo.description.length > 700 ? 'text-amber-400' : 'text-slate-500'
                }`}
              >
                {seo.description.length}/700
              </span>
              <button
                type="button"
                onClick={() => handleCopy('description', seo.description)}
                disabled={!seo.description}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-40"
              >
                {copiedKey === 'description' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'description' ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
          <textarea
            id="seo-desc-input"
            rows={compact ? 4 : 6}
            value={seo.description}
            onChange={(e) => updateSeo({ description: e.target.value })}
            placeholder="Deskripsi terstruktur: pembuka, poin isi video, dan ajakan bertindak..."
            className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-2 text-xs leading-relaxed text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="seo-tags-input" className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
              <Tag className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Tags ({seo.tags.length})</span>
            </label>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono tabular-nums ${
                  tagsText.length >= 400 ? 'text-amber-400' : 'text-slate-500'
                }`}
              >
                {tagsText.length}/400
              </span>
              <button
                type="button"
                onClick={() => handleCopy('tags', tagsText)}
                disabled={!tagsText}
                className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-40"
              >
                {copiedKey === 'tags' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === 'tags' ? 'Disalin' : 'Salin'}</span>
              </button>
            </div>
          </div>
          <textarea
            id="seo-tags-input"
            rows={2}
            value={tagsText}
            onChange={(e) =>
              updateSeo({
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim().replace(/^#+/, '').toLowerCase())
                  .filter(Boolean),
              })
            }
            placeholder="kata kunci 1, kata kunci 2, ..."
            className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="seo-hashtags-input" className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
              <Hash className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Hashtags ({seo.hashtags.length})</span>
            </label>
            <button
              type="button"
              onClick={() => handleCopy('hashtags', hashtagsText)}
              disabled={!hashtagsText}
              className="inline-flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 disabled:opacity-40"
            >
              {copiedKey === 'hashtags' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'hashtags' ? 'Disalin' : 'Salin'}</span>
            </button>
          </div>
          <textarea
            id="seo-hashtags-input"
            rows={2}
            value={hashtagsText}
            onChange={(e) =>
              updateSeo({
                hashtags: e.target.value
                  .split(/\s+/)
                  .map((h) => h.trim().toLowerCase())
                  .filter(Boolean)
                  .map((h) => (h.startsWith('#') ? h : `#${h}`)),
              })
            }
            placeholder="#katakunci1 #katakunci2"
            className="w-full bg-[#0B0E14] border border-[#263042] rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>
    </section>
  );
}
