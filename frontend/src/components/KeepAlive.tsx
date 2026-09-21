import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuth';
import { BrandMark } from './BrandMark';

const INACTIVITY_MS = 15 * 60 * 1000;
const GRACE_MS = 2 * 60 * 1000;

export function KeepAlive() {
  const [showInactivity, setShowInactivity] = useState(false);
  const [showWaking, setShowWaking] = useState(false);
  const [countdown, setCountdown] = useState(GRACE_MS / 1000);
  const inactivityRef = useRef<number | null>(null);
  const graceRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const resetInactivity = useCallback(() => {
    if (!isAuthenticated) return;
    if (inactivityRef.current) window.clearTimeout(inactivityRef.current);
    if (graceRef.current) window.clearTimeout(graceRef.current);
    if (countdownRef.current) window.clearInterval(countdownRef.current);
    setShowInactivity(false);
    setCountdown(GRACE_MS / 1000);
    inactivityRef.current = window.setTimeout(() => {
      setShowInactivity(true);
      let left = GRACE_MS / 1000;
      countdownRef.current = window.setInterval(() => {
        left -= 1;
        setCountdown(left);
        if (left <= 0) {
          if (countdownRef.current) window.clearInterval(countdownRef.current);
          logout().catch(() => {});
          window.location.href = '/login';
        }
      }, 1000);
      graceRef.current = window.setTimeout(() => {
        logout().catch(() => {});
        window.location.href = '/login';
      }, GRACE_MS);
    }, INACTIVITY_MS);
  }, [isAuthenticated, logout]);

  const handleContinue = () => {
    fetch('/api/health', { credentials: 'include' }).catch(() => {});
    resetInactivity();
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    const events: (keyof WindowEventMap)[] = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handler = () => {
      if (!showInactivity) resetInactivity();
    };
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    resetInactivity();
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      if (inactivityRef.current) window.clearTimeout(inactivityRef.current);
      if (graceRef.current) window.clearTimeout(graceRef.current);
      if (countdownRef.current) window.clearInterval(countdownRef.current);
    };
  }, [isAuthenticated, resetInactivity, showInactivity]);

  // Keep Render awake: ping /health toutes les 60s
  useEffect(() => {
    if (!isAuthenticated) return;
    const ping = () => fetch('/api/health', { credentials: 'include' }).catch(() => {});
    ping();
    const id = window.setInterval(ping, 60_000);
    return () => window.clearInterval(id);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const origFetch = window.fetch;
    let wakingTimer: number | null = null;
    window.fetch = async (...args) => {
      try {
        const res = await origFetch(...args);
        if (res.status === 502 || res.status === 503 || res.status === 504) throw new Error('waking');
        return res;
      } catch (e) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        if (url.includes('/api/') || url.includes('/health')) {
          setShowWaking(true);
          if (wakingTimer) window.clearTimeout(wakingTimer);
          let retries = 0;
          const tryAgain = async () => {
            retries += 1;
            try {
              const r = await origFetch(...args);
              if (r.ok || r.status < 500) {
                setShowWaking(false);
                window.location.reload();
                return;
              }
            } catch {}
            if (retries < 20) wakingTimer = window.setTimeout(tryAgain, 3000);
          };
          wakingTimer = window.setTimeout(tryAgain, 3000);
        }
        throw e;
      }
    };
    return () => {
      window.fetch = origFetch;
      if (wakingTimer) window.clearTimeout(wakingTimer);
    };
  }, [isAuthenticated]);

  return (
    <>
      <AnimatePresence>
        {showWaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-[#121416]/80 backdrop-blur-sm"
          >
            <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-8 shadow-xl flex flex-col items-center gap-5 max-w-sm mx-4 text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                style={{ width: 72, height: 72 }}
              >
                <div style={{ transform: 'rotate(-360deg)' }}>
                  <BrandMark size={64} />
                </div>
              </motion.div>
              <div>
                <p className="font-heading font-700 text-base text-text-primary dark:text-[#E4E6E9]">Mina la Préférée se réveille</p>
                <p className="text-sm text-text-secondary dark:text-[#8B9199] mt-1">Un instant, on prépare votre boutique...</p>
              </div>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-[#E8751A]"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInactivity && !showWaking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-6 shadow-xl max-w-md w-full text-center"
            >
              <div className="mx-auto mb-4 flex justify-center">
                <BrandMark size={56} />
              </div>
              <h3 className="font-heading font-700 text-lg text-text-primary dark:text-[#E4E6E9]">Toujours là ?</h3>
              <p className="text-sm text-text-secondary dark:text-[#8B9199] mt-2">
                Aucune activité depuis 15 minutes. Votre session va expirer dans{' '}
                <span className="font-semibold text-[#E8751A]">{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
              </p>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    logout().catch(() => {});
                    window.location.href = '/login';
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-button border border-border dark:border-white/[0.08] text-sm text-text-secondary dark:text-[#8B9199] hover:bg-porcelaine dark:hover:bg-white/[0.05] transition-colors"
                >
                  <LogOut size={16} />
                  Déconnexion
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 px-4 py-2.5 rounded-button bg-[#E8751A] text-white text-sm font-medium hover:bg-[#D16615] transition-colors"
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
