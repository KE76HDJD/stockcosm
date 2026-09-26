import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    if (standalone) {
      setIsInstalled(true);
      return;
    }
    setIsIOS(iOS);

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
      localStorage.removeItem('pwa-ios-dismissed');
    };

    // Android
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    // iOS : afficher bannière manuelle si pas installé et pas dismiss
    if (iOS && !localStorage.getItem('pwa-ios-dismissed')) {
      const t = setTimeout(() => setShowBanner(true), 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
        window.removeEventListener('appinstalled', onAppInstalled);
      };
    }

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
    if (isIOS) localStorage.setItem('pwa-ios-dismissed', '1');
    else localStorage.setItem('pwa-install-dismissed', '1');
  };

  if (isInstalled || dismissed || !showBanner) return null;
  if (!isIOS && !deferredPrompt) return null;

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
          {isIOS ? (
            <div className="mt-3 space-y-3">
              <div className="bg-[#FFF7ED] dark:bg-white/[0.05] border border-[#E8751A]/15 rounded-xl p-3">
                <p className="text-xs font-medium text-[#5A3E2B] dark:text-[#E4E6E9] flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-[#E8751A] text-white flex items-center justify-center text-[10px]">1</span>
                  Appuyez sur <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-gray-100 dark:bg-white/10 mx-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg></span> Partager
                </p>
                <p className="text-xs font-medium text-[#5A3E2B] dark:text-[#E4E6E9] mt-2 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-[#E8751A] text-white flex items-center justify-center text-[10px]">2</span>
                  Puis <span className="font-semibold">Sur l'écran d'accueil</span> <span className="text-[11px]">⊕</span>
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full px-4 py-2 text-warm-gray dark:text-[#8B9199] text-sm font-medium rounded-xl hover:bg-gris dark:hover:bg-[#2E3136] transition-colors"
              >
                Compris
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
