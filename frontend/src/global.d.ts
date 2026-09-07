interface DeferredInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface Window {
    _deferredInstallPrompt: DeferredInstallPromptEvent | null;
  }
}

export {};
