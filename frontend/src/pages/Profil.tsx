import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Camera, Lock, Shield, ShieldCheck, ShieldOff, Save, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../hooks/useAuth';
import { authApi } from '../api/auth';
import { Button } from '../components/Button';
import { toast } from '../components/Toast';

export function ProfilPage() {
  const { user, fetchUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState(user?.username || '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [show2faSetup, setShow2faSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret2fa, setSecret2fa] = useState('');
  const [code2fa, setCode2fa] = useState('');
  const [saving2fa, setSaving2fa] = useState(false);

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleSaveProfile = async () => {
    if (!username.trim()) { toast.error('Le nom est requis'); return; }
    setSavingProfile(true);
    try {
      await authApi.updateProfile({ username });
      await fetchUser();
      toast.success('Profil mis à jour');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) { toast.error('Tous les champs sont requis'); return; }
    if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 6) { toast.error('Le mot de passe doit faire au moins 6 caractères'); return; }
    setSavingPassword(true);
    try {
      await authApi.changePassword({ current_password: currentPassword, new_password: newPassword });
      toast.success('Mot de passe modifié');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Fichier trop volumineux (max 5MB)'); return; }
    setUploadingPhoto(true);
    try {
      await authApi.uploadPhoto(file);
      await fetchUser();
      toast.success('Photo mise à jour');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSetup2fa = async () => {
    try {
      const res = await authApi.setup2fa();
      setQrCode(res.qr_code_base64);
      setSecret2fa(res.secret);
      setShow2faSetup(true);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleVerify2fa = async () => {
    if (code2fa.length !== 6) { toast.error('Code à 6 chiffres requis'); return; }
    setSaving2fa(true);
    try {
      await authApi.verify2fa(code2fa);
      await fetchUser();
      toast.success('2FA activé avec succès');
      setShow2faSetup(false);
      setCode2fa('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Code incorrect');
    } finally {
      setSaving2fa(false);
    }
  };

  const handleDisable2fa = async () => {
    if (code2fa.length !== 6) { toast.error('Code à 6 chiffres requis'); return; }
    setSaving2fa(true);
    try {
      await authApi.disable2fa(code2fa);
      await fetchUser();
      toast.success('2FA désactivé');
      setCode2fa('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Code incorrect');
    } finally {
      setSaving2fa(false);
    }
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-heading font-700 text-2xl">Mon profil</h1>
        <p className="text-text-secondary dark:text-[#8B9199] text-sm mt-1">Gérez vos informations personnelles</p>
      </div>

      {/* Photo de profil */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-6">
        <h2 className="font-heading font-600 text-sm mb-4">Photo de profil</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-accent/10 dark:bg-[#3ECF8E]/10 flex items-center justify-center overflow-hidden border-2 border-border dark:border-white/[0.08]">
              {user?.profile_photo ? (
                <img src={user.profile_photo} alt="Photo" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-accent dark:text-[#3ECF8E]" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-accent text-white rounded-full flex items-center justify-center hover:bg-accent-hover transition-colors shadow-sm"
            >
              {uploadingPhoto ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoUpload} className="hidden" />
          </div>
          <div>
            <p className="text-sm font-medium">{user?.username}</p>
            <p className="text-xs text-text-secondary dark:text-[#8B9199] mt-0.5">JPEG, PNG ou WebP — max 5MB</p>
          </div>
        </div>
      </motion.div>

      {/* Informations personnelles */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-6">
        <h2 className="font-heading font-600 text-sm mb-4">Informations personnelles</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Nom d'utilisateur</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 outline-none focus:border-accent/40 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-[#8B9199]">
            <Shield size={14} className="text-accent dark:text-[#3ECF8E]" />
            Rôle : <span className="font-medium">{user?.role === 'ADMIN' ? 'Administrateur' : 'Assistant'}</span>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} loading={savingProfile}>
              <Save size={14} />
              Enregistrer
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Mot de passe */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-6">
        <h2 className="font-heading font-600 text-sm mb-4 flex items-center gap-2">
          <Lock size={15} className="text-accent dark:text-[#3ECF8E]" />
          Changer le mot de passe
        </h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Mot de passe actuel</label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 outline-none focus:border-accent/40 transition-colors"
              />
              <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] transition-colors">
                {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Nouveau mot de passe</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 outline-none focus:border-accent/40 transition-colors"
              />
              <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] transition-colors">
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Confirmer</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 pr-10 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 outline-none focus:border-accent/40 transition-colors"
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] transition-colors">
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleChangePassword} loading={savingPassword}>
              <Lock size={14} />
              Modifier
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Sécurité 2FA */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-6">
        <h2 className="font-heading font-600 text-sm mb-4 flex items-center gap-2">
          <ShieldCheck size={15} className="text-accent dark:text-[#3ECF8E]" />
          Authentification à deux facteurs (2FA)
        </h2>

        {user?.two_factor_enabled ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-stock-normal/5 rounded-button border border-stock-normal/20">
              <ShieldCheck size={16} className="text-stock-normal" />
              <span className="text-sm font-medium text-stock-normal">2FA activé</span>
            </div>
            <div>
              <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Code TOTP pour désactiver</label>
              <input
                type="text"
                value={code2fa}
                onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 outline-none focus:border-accent/40 transition-colors tracking-widest text-center font-mono"
                maxLength={6}
              />
            </div>
            <div className="flex justify-end">
              <Button variant="danger" onClick={handleDisable2fa} loading={saving2fa}>
                <ShieldOff size={14} />
                Désactiver le 2FA
              </Button>
            </div>
          </div>
        ) : show2faSetup ? (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary dark:text-[#8B9199]">
              Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)
            </p>
            <div className="flex justify-center py-4">
              <div className="bg-white dark:bg-[#1C1F22] p-3 rounded-card border border-border dark:border-white/[0.08] shadow-sm">
                <img src={`data:image/png;base64,${qrCode}`} alt="QR Code 2FA" className="w-48 h-48" />
              </div>
            </div>
            <div>
              <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Code de vérification</label>
              <input
                type="text"
                value={code2fa}
                onChange={(e) => setCode2fa(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 outline-none focus:border-accent/40 transition-colors tracking-widest text-center font-mono"
                maxLength={6}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setShow2faSetup(false); setCode2fa(''); }}>Annuler</Button>
              <Button onClick={handleVerify2fa} loading={saving2fa}>
                <ShieldCheck size={14} />
                Activer le 2FA
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary dark:text-[#8B9199]">
              Ajoutez une couche de sécurité supplémentaire à votre compte. Vous aurez besoin d'une application d'authentification.
            </p>
            <div className="flex justify-end">
              <Button variant="secondary" onClick={handleSetup2fa}>
                <ShieldCheck size={14} />
                Activer le 2FA
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
