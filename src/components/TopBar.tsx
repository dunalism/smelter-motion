import type { StudioStep } from '../types/studio';
import type { StoredKeyState } from '../utils/apiKeyVault';
import { Download, KeyRound } from 'lucide-react';

interface TopBarProps {
  activeStep: StudioStep;
  onSelectStep: (step: StudioStep) => void;
  onOpenExport: () => void;
  onOpenApiKeyModal: () => void;
  apiKeyState: StoredKeyState;
  sceneCount: number;
}

const STEPS: Array<{ id: StudioStep; label: string }> = [
  { id: 'ide', label: '1. Ide' },
  { id: 'narasi', label: '2. Narasi' },
  { id: 'suara', label: '3. Suara' },
  { id: 'animasi', label: '4. Animasi' },
];

export function TopBar({
  activeStep,
  onSelectStep,
  onOpenExport,
  onOpenApiKeyModal,
  apiKeyState,
  sceneCount,
}: TopBarProps) {
  return (
    <div className="shrink-0 bg-[#0B0E14] border-b border-[#222A3A]">
      <header className="h-14 px-4 sm:px-6 flex items-center justify-between gap-4 md:gap-8">
        {/* Zone 1: Single text element brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectStep('ide')}
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 rounded"
        >
          GerakCanvas
        </button>

        {/* Zone 2: 4 single-line step links (desktop) */}
        <nav
          aria-label="Alur pembuatan video"
          className="hidden md:flex items-center gap-6"
        >
          {STEPS.map((step) => {
            const isActive = activeStep === step.id;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onSelectStep(step.id)}
                aria-current={isActive ? 'step' : undefined}
                className={`relative py-4 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:text-sky-300 ${
                  isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {step.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-sky-400 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: API Key button + Export CTA */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            aria-label={
              apiKeyState.hasKey
                ? `Pengaturan API Key Gemini (Aktif: ${apiKeyState.maskedKey})`
                : 'Pengaturan API Key Gemini (Belum Diatur)'
            }
            className={`inline-flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
              apiKeyState.hasKey
                ? 'bg-[#121927] border-emerald-500/40 text-emerald-200 hover:bg-[#182235]'
                : 'bg-amber-500/10 border-amber-500/40 text-amber-200 hover:bg-amber-500/20'
            }`}
          >
            <span
              aria-hidden="true"
              className={`w-2 h-2 rounded-full ${
                apiKeyState.hasKey ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">
              {apiKeyState.hasKey ? 'API Key Aktif' : 'Atur API Key'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            disabled={sceneCount === 0}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-sky-500 text-slate-950 hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>Eksport MP4</span>
          </button>
        </div>
      </header>

      {/* Mobile 4-step switcher */}
      <nav
        aria-label="Navigasi langkah mobile"
        className="md:hidden grid grid-cols-4 border-t border-[#1C2331] px-2"
      >
        {STEPS.map((step) => {
          const isActive = activeStep === step.id;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onSelectStep(step.id)}
              aria-current={isActive ? 'step' : undefined}
              className={`relative py-2.5 text-xs font-medium text-center whitespace-nowrap transition-colors ${
                isActive ? 'text-sky-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {step.label}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-2 bottom-0 h-0.5 bg-sky-400 rounded-full"
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
