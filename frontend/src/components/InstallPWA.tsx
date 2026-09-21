import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem('pwa-install-dismissed')) {
        setShowBanner(true);
      }
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      localStorage.removeItem('pwa-install-dismissed');
    };

    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (isInstalled || dismissed || !showBanner || !deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm"
      >
        <div className="bg-white dark:bg-[#1E2023] rounded-2xl shadow-2xl border border-sage/20 dark:border-[#2E3136] p-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#E8751A' }}>
              <svg width="22" height="22" viewBox="0 0 100 100" fill="none">
                <rect width="100" height="100" rx="22" fill="#E8751A"/>
                <g transform="translate(50 32)">
                  <polygon points="0,-18 18,0 0,18 -18,0" fill="white"/>
                  <polygon points="0,-10 10,0 0,10 -10,0" fill="#E8751A"/>
                  <circle r="2.5" fill="white"/>
                </g>
                <text x="50" y="68" text-anchor="middle" font-family="sans-serif" font-weight="700" font-size="16" letter-spacing="1.5" fill="white">M</text>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ecritoire dark:text-[#E4E6E9]">
                Installer Mina la Préférée
              </p>
              <p className="text-xs text-warm-gray dark:text-[#8B9199] mt-0.5">
                Accès rapide depuis l'écran d'accueil
              </p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleInstall}
              className="flex-1 px-4 py-2 text-white text-sm font-medium rounded-xl active:scale-[0.97] transition-all"
              style={{ background: '#E8751A' }}
            >
              Installer
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-warm-gray dark:text-[#8B9199] text-sm font-medium rounded-xl hover:bg-gris dark:hover:bg-[#2E3136] transition-colors"
            >
              Non merci
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
