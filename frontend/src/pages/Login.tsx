import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../hooks/useAuth';
import { motion } from 'framer-motion';
import { Lock, User, AlertCircle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/Button';

const storeName = "KET SKIN CARE BY MINA LA PREFEREE";

function AnimatedStoreName() {
  const [typed, setTyped] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (typed < storeName.length) {
      const timer = setTimeout(() => setTyped(typed + 1), 40);
      return () => clearTimeout(timer);
    }
  }, [typed]);

  useEffect(() => {
    const interval = setInterval(() => setShowCursor((c) => !c), 530);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-center">
      <h1
        className="font-heading font-800 text-base sm:text-xl leading-tight tracking-wide whitespace-nowrap"
        style={{
          color: '#E8751A',
          textShadow: '0 0 20px rgba(232, 117, 26, 0.4), 0 0 40px rgba(232, 117, 26, 0.15)',
        }}
      >
        {storeName.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.3, y: -8 }}
            animate={i < typed ? {
              opacity: 1,
              scale: 1,
              y: 0,
            } : {
              opacity: 0,
              scale: 0.3,
              y: -8,
            }}
            transition={{
              type: 'spring',
              stiffness: 600,
              damping: 15,
              mass: 0.5,
            }}
            className="inline-block"
            style={i < typed ? {
              textShadow: '0 0 8px rgba(232, 117, 26, 0.6)',
            } : undefined}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
        <motion.span
          animate={{ opacity: showCursor ? 1 : 0 }}
          transition={{ duration: 0.1 }}
          className="inline-block font-body font-300"
          style={{ color: '#E8751A' }}
        >
          |
        </motion.span>
      </h1>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: storeName.length * 0.04 + 0.3 }}
        className="text-text-secondary dark:text-[#8B9199] text-sm mt-2"
      >
        Gestion de stock — Cosmétiques
      </motion.p>
    </div>
  );
}

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show2fa, setShow2fa] = useState(false);
  const [code2fa, setCode2fa] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const login = useAuthStore((s) => s.login);
  const login2fa = useAuthStore((s) => s.login2fa);
  const twoFactorRequired = useAuthStore((s) => s.twoFactorRequired);
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    const wasDark = root.classList.contains('dark');
    root.classList.remove('dark');
    return () => { if (wasDark) root.classList.add('dark'); };
  }, []);

  useEffect(() => {
    if (twoFactorRequired) {
      setShow2fa(true);
      setLoading(false);
    }
  }, [twoFactorRequired]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      if (!useAuthStore.getState().twoFactorRequired) {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  const handle2faSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code2fa.length !== 6) {
      setError('Code à 6 chiffres requis');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login2fa(code2fa);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Code incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-porcelaine flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-8">
          <div className="text-center mb-8">
            <AnimatedStoreName />
          </div>

          {show2fa ? (
            <form onSubmit={handle2faSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <div className="w-12 h-12 rounded-full bg-accent/10 dark:bg-[#3ECF8E]/10 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={24} className="text-accent dark:text-[#3ECF8E]" />
                </div>
                <p className="text-sm font-medium text-text-primary dark:text-[#E4E6E9]">Vérification en deux étapes</p>
                <p className="text-xs text-text-secondary dark:text-[#8B9199] mt-1">Saisissez le code de votre application d'authentification</p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 px-4 py-3 bg-stock-rupture/5 border border-stock-rupture/20 rounded-button text-stock-rupture text-sm"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-[#E4E6E9] mb-1.5">Code TOTP</label>
                <input
                  type="text"
                  value={code2fa}
                  onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 text-center font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                />
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Vérifier
              </Button>

              <button
                type="button"
                onClick={() => { setShow2fa(false); setCode2fa(''); setError(''); }}
                className="w-full text-center text-xs text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] transition-colors"
              >
                Retour à la connexion
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 px-4 py-3 bg-stock-rupture/5 border border-stock-rupture/20 rounded-button text-stock-rupture text-sm"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}

              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-[#E4E6E9] mb-1.5">Nom d'utilisateur</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199]" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                    placeholder="Votre identifiant"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary dark:text-[#E4E6E9] mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-colors"
                    placeholder="Votre mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] transition-colors"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Se connecter
              </Button>
            </form>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link to="/register" className="text-sm text-accent dark:text-[#3ECF8E] hover:underline">
            Pas de compte ? Créer un compte
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
