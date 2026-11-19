import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { postJson } from '../utils/api';
import { validateGeminiApiKeyFormat } from '../utils/apiKeyRules';
import {
  clearGeminiApiKey,
  saveGeminiApiKey,
  type KeyStorageMode,
  type StoredKeyState,
} from '../utils/apiKeyVault';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  keyState: StoredKeyState;
}

export function ApiKeyModal({ isOpen, onClose, keyState }: ApiKeyModalProps) {
  const [inputKey, setInputKey] = useState('');
  const [showRaw, setShowRaw] = useState(false);
  const [storageMode, setStorageMode] = useState<KeyStorageMode>(keyState.storageMode || 'persistent');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setInputKey('');
      setShowRaw(false);
      setStorageMode(keyState.storageMode || 'persistent');
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, keyState.storageMode]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const formatCheck = inputKey.trim() ? validateGeminiApiKeyFormat(inputKey) : null;

  const handleSaveOnly = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const check = validateGeminiApiKeyFormat(inputKey);
    if (!check.valid) {
      setErrorMsg(check.error || 'Format API Key Gemini tidak valid.');
      return;
    }

    setIsSaving(true);
    try {
      const next = await saveGeminiApiKey(check.normalized, storageMode);
      setInputKey('');
      setShowRaw(false);
      setSuccessMsg(
        next.encryptedAtRest
          ? `API Key (${next.maskedKey}) berhasil disimpan dalam bentuk terenkripsi AES-256-GCM.`
          : `API Key (${next.maskedKey}) aktif untuk sesi tab ini (memori).`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan API Key.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleVerifyAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const check = validateGeminiApiKeyFormat(inputKey);
    if (!check.valid) {
      setErrorMsg(check.error || 'Format API Key Gemini tidak valid.');
      return;
    }

    setIsVerifying(true);
    try {
      await postJson<{ ok: boolean; model?: string }>(
        '/api/verify-gemini-key',
        {},
        { apiKeyOverride: check.normalized }
      );
      const next = await saveGeminiApiKey(check.normalized, storageMode);
      setInputKey('');
      setShowRaw(false);
      setSuccessMsg(
        `API Key (${next.maskedKey}) terverifikasi aktif dengan Gemini dan tersimpan aman.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Verifikasi API Key gagal.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClearKey = () => {
    clearGeminiApiKey();
    setInputKey('');
    setShowRaw(false);
    setErrorMsg(null);
    setSuccessMsg('API Key telah dihapus bersih dari browser dan memori sesi.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="apikey-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-lg bg-[#121722] border border-[#263147] rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#222A3A] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <KeyRound className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 id="apikey-modal-title" className="font-display text-base font-bold text-white">
                Pengaturan API Key Gemini
              </h2>
              <p className="text-xs text-slate-400">
                Wajib memakai kunci Anda sendiri — tanpa API key bawaan server
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan API Key"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#1C2434] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleVerifyAndSave} className="p-5 space-y-4">
          {/* Current Status */}
          <div
            className={`rounded-lg border px-3.5 py-2.5 flex items-center justify-between gap-3 ${
              keyState.hasKey
                ? 'bg-emerald-950/30 border-emerald-500/30'
                : 'bg-amber-950/30 border-amber-500/30'
            }`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {keyState.hasKey ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span className="text-emerald-200">API Key Tersimpan &amp; Aktif</span>
                  </>
                ) : (
                  <span className="text-amber-200">Belum Ada API Key Gemini</span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 font-mono break-words">
                {keyState.hasKey
                  ? `${keyState.maskedKey} · ${
                      keyState.storageMode === 'session'
                        ? 'Hanya Sesi Tab Ini'
                        : keyState.encryptedAtRest
                          ? 'Terenkripsi AES-256-GCM'
                          : 'Memori Sesi'
                    }`
                  : 'Fitur AI (Skrip, TTS Suara, Kode Animasi) memerlukan API key Anda.'}
              </p>
            </div>

            {keyState.hasKey && (
              <button
                type="button"
                onClick={handleClearKey}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-rose-950/50 border border-rose-500/40 text-xs font-medium text-rose-200 hover:bg-rose-900/50 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hapus Key</span>
              </button>
            )}
          </div>

          {/* Input Field */}
          <div>
            <label htmlFor="gemini-api-key-input" className="block text-xs font-medium text-slate-200 mb-1.5">
              {keyState.hasKey ? 'Ganti API Key Gemini' : 'Masukkan API Key Gemini'}
            </label>
            <div className="relative">
              <input
                id="gemini-api-key-input"
                type={showRaw ? 'text' : 'password'}
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="Tempel API Key Gemini Anda..."
                className="w-full rounded-lg bg-[#0B0E14] border border-[#2A3346] pl-3.5 pr-10 py-2.5 font-mono text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowRaw((v) => !v)}
                aria-label={showRaw ? 'Sembunyikan API Key' : 'Tampilkan API Key'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-white"
              >
                {showRaw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {formatCheck && !formatCheck.valid && (
              <p className="mt-1.5 text-xs text-amber-300">{formatCheck.error}</p>
            )}
          </div>

          {/* Storage Mode */}
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-slate-200 mb-1">
              Mode Penyimpanan
            </legend>
            <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#0B0E14] border border-[#242D3F] cursor-pointer hover:border-slate-500 transition-colors">
              <input
                type="radio"
                name="key-storage-mode"
                value="persistent"
                checked={storageMode === 'persistent'}
                onChange={() => setStorageMode('persistent')}
                className="mt-0.5 accent-sky-400"
              />
              <div>
                <div className="text-xs font-semibold text-white">
                  Simpan Terenkripsi di Browser (AES-256-GCM)
                </div>
                <div className="text-[11px] text-slate-400">
                  Tetap tersimpan saat halaman dimuat ulang; dienkripsi dengan kunci Web Crypto non-ekstraktable.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-2.5 rounded-lg bg-[#0B0E14] border border-[#242D3F] cursor-pointer hover:border-slate-500 transition-colors">
              <input
                type="radio"
                name="key-storage-mode"
                value="session"
                checked={storageMode === 'session'}
                onChange={() => setStorageMode('session')}
                className="mt-0.5 accent-sky-400"
              />
              <div>
                <div className="text-xs font-semibold text-white">Hanya Sesi Tab Ini</div>
                <div className="text-[11px] text-slate-400">
                  Lebih ketat untuk perangkat bersama; kunci otomatis terhapus saat tab browser ditutup.
                </div>
              </div>
            </label>
          </fieldset>

          {/* Security Rules Info */}
          <div className="rounded-lg bg-[#0B0E14] border border-[#222A3A] p-3 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Aturan Keamanan API Key</span>
            </div>
            <ul className="text-[11px] text-slate-400 space-y-1 list-disc pl-4 leading-relaxed">
              <li>Aplikasi menonaktifkan API key bawaan server — hanya key Anda yang digunakan.</li>
              <li>Key tidak pernah disimpan sebagai teks polos di localStorage/sessionStorage.</li>
              <li>Dikirim ke server proxy lewat header terpisah tanpa dicatat di log maupun URL.</li>
            </ul>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-lg bg-rose-950/60 border border-rose-500/40 px-3.5 py-2.5 text-xs text-rose-200"
            >
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="rounded-lg bg-emerald-950/50 border border-emerald-500/40 px-3.5 py-2.5 text-xs text-emerald-200"
            >
              {successMsg}
            </div>
          )}

          {/* Actions */}
          <div className="pt-1 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSaveOnly}
              disabled={isVerifying || isSaving || !inputKey.trim()}
              className="px-3.5 py-2 rounded-lg bg-[#182030] border border-[#2B364B] text-xs font-medium text-slate-200 hover:bg-[#1E283C] disabled:opacity-40"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Tanpa Uji'}
            </button>
            <button
              type="submit"
              disabled={isVerifying || isSaving || !inputKey.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-500 text-slate-950 text-xs font-semibold hover:bg-sky-400 disabled:opacity-40"
            >
              {isVerifying && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
              <span>{isVerifying ? 'Memverifikasi...' : 'Verifikasi & Simpan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
