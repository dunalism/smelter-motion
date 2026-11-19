import { useEffect, useState } from 'react';
import type { ProjectState, StudioStep } from './types/studio';
import { DEMO_PROJECT } from './data/demoProject';
import { TopBar } from './components/TopBar';
import { IdeStep } from './components/IdeStep';
import { NarasiStep } from './components/NarasiStep';
import { SuaraStep } from './components/SuaraStep';
import { AnimasiStep } from './components/AnimasiStep';
import { ExportModal } from './components/ExportModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import {
  ensureApiKeyVaultLoaded,
  getApiKeyStateSnapshot,
  subscribeApiKeyState,
  type StoredKeyState,
} from './utils/apiKeyVault';

function getInitialStep(): StudioStep {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    if (step === 'ide' || step === 'narasi' || step === 'suara' || step === 'animasi') {
      return step;
    }
    if (params.get('autostart') === '1') {
      return 'animasi';
    }
  }
  return 'ide';
}

export default function App() {
  const [activeStep, setActiveStep] = useState<StudioStep>(getInitialStep);
  const [project, setProject] = useState<ProjectState>(() => structuredClone(DEMO_PROJECT));
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyState, setApiKeyState] = useState<StoredKeyState>(() => getApiKeyStateSnapshot());

  useEffect(() => {
    const unsubscribe = subscribeApiKeyState(setApiKeyState);
    void ensureApiKeyVaultLoaded();
    return unsubscribe;
  }, []);

  const handleLoadDemo = () => {
    setProject(structuredClone(DEMO_PROJECT));
  };

  return (
    <div
      data-step={activeStep}
      data-has-apikey={apiKeyState.hasKey ? 'true' : 'false'}
      className="min-h-screen lg:h-screen flex flex-col bg-[#0B0E14] text-[#E6ECF5] overflow-x-hidden"
    >
      <TopBar
        activeStep={activeStep}
        onSelectStep={setActiveStep}
        onOpenExport={() => setIsExportOpen(true)}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        apiKeyState={apiKeyState}
        sceneCount={project.scenes.length}
      />

      {activeStep === 'ide' && (
        <IdeStep
          project={project}
          onUpdateProject={setProject}
          onLoadDemo={handleLoadDemo}
          onNextStep={() => setActiveStep('narasi')}
          onJumpToAnimasi={() => setActiveStep('animasi')}
          hasApiKey={apiKeyState.hasKey}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        />
      )}

      {activeStep === 'narasi' && (
        <NarasiStep
          project={project}
          onUpdateProject={setProject}
          onNextStep={() => setActiveStep('suara')}
        />
      )}

      {activeStep === 'suara' && (
        <SuaraStep
          project={project}
          onUpdateProject={setProject}
          onNextStep={() => setActiveStep('animasi')}
          hasApiKey={apiKeyState.hasKey}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        />
      )}

      {activeStep === 'animasi' && (
        <AnimasiStep
          project={project}
          onUpdateProject={setProject}
          hasApiKey={apiKeyState.hasKey}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        />
      )}

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        project={project}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        keyState={apiKeyState}
      />
    </div>
  );
}
