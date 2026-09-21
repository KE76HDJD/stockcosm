import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, AlertCircle, Check, Shield, UserCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { authApi } from '../api/auth';
import { useAuthStore } from '../hooks/useAuth';

export function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('ASSISTANT');
  const [adminExists, setAdminExists] = useState(true);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    authApi.setupStatus().then((res) => {
      const exists = !res.needs_setup;
      setAdminExists(exists);
      if (!exists) setRole('ADMIN');
    }).catch(() => {}).finally(() => setCheckingSetup(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Tous les champs sont requis');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await authApi.register({ username, password, role });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  if (checkingSetup) {
    return (
      <div className="min-h-screen bg-porcelaine flex items-center justify-center p-4">
        <div className="w-8 h-8 rounded-full border-4 border-[#E8751A]/20 border-t-[#E8751A] animate-spin" />
      </div>
    );
  }

  if (adminExists) {
    return (
      <div className="min-h-screen bg-porcelaine flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[#E8751A]/10 flex items-center justify-center mx-auto mb-4">
              <UserPlus size={28} className="text-[#E8751A]" />
            </div>
            <h1 className="font-heading font-700 text-xl text-text-primary dark:text-[#E4E6E9]">Inscriptions fermées</h1>
            <p className="text-sm text-text-secondary dark:text-[#8B9199] mt-3 leading-relaxed">
              Cette application est <strong className="text-text-primary dark:text-[#E4E6E9]">privée et réservée à la boutique Mina la Préférée</strong>.<br />
              Seul l'administrateur peut créer un compte pour son équipe.<br />
              Veuillez contacter votre administrateur pour obtenir vos accès.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => navigate('/login')} className="w-full">Aller à la connexion</Button>
              <p className="text-xs text-text-secondary dark:text-[#8B9199] mt-2">Vous êtes administrateur ? Connectez-vous puis créez les comptes depuis <strong>Utilisateurs</strong>.</p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

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
            <div className="w-14 h-14 rounded-full bg-[#E8751A]/10 flex items-center justify-center mx-auto mb-4">
              <UserPlus size={28} className="text-[#E8751A]" />
            </div>
            <h1 className="font-heading font-700 text-xl text-text-primary dark:text-[#E4E6E9]">
              Créer le compte administrateur
            </h1>
            <p className="text-text-secondary dark:text-[#8B9199] text-sm mt-2">
              Première installation — créez le compte qui gèrera la boutique
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <div className="w-12 h-12 rounded-full bg-stock-normal/10 flex items-center justify-center mx-auto mb-3">
                <Check size={24} className="text-stock-normal" />
              </div>
              <p className="text-sm font-medium text-stock-normal">Compte créé avec succès</p>
              <p className="text-xs text-text-secondary dark:text-[#8B9199] mt-2">
                {loggingIn ? 'Connexion en cours...' : 'Vous pouvez maintenant vous connecter'}
              </p>
              <Button
                onClick={async () => {
                  setLoggingIn(true);
                  try {
                    await useAuthStore.getState().login(username, password);
                    navigate('/');
                  } catch {
                    navigate('/login');
                  }
                }}
                loading={loggingIn}
                className="w-full mt-4"
                size="lg"
              >
                Se connecter
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Nom d'utilisateur *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="Votre nom"
                />
              </div>

              <div>
                <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 focus:outline-none focus:ring-2 focus:ring-accent/20"
                    placeholder="Min. 6 caractères"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] transition-colors">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Confirmer *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 focus:outline-none focus:ring-2 focus:ring-accent/20"
                  placeholder="Retapez le mot de passe"
                />
              </div>

              <div className="bg-[#E8751A]/5 border border-[#E8751A]/20 rounded-button p-3">
                <p className="text-xs text-[#E8751A] flex items-center gap-2"><Shield size={14} /> Compte administrateur — accès complet à la gestion de la boutique</p>
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Créer mon compte
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-accent dark:text-[#3ECF8E] hover:underline">
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
