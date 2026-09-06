import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, User, Shield, UserCheck, ShieldOff, ShieldCheck, Power, PowerOff, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../hooks/useAuth';
import { useLoading } from '../hooks/useLoading';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { toast } from '../components/Toast';
import { formatDateTime } from '../api/utils';
import type { User as UserType } from '../types';

export function UtilisateursPage() {
  const { isLoading, withLoading } = useLoading(true);
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<UserType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'ASSISTANT' as string });
  const [submitting, setSubmitting] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<UserType | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    withLoading(async () => {
      const u = await authApi.listUsers();
      setUsers(u);
    });
  }, []);

  const handleSubmit = async () => {
    if (!form.username || !form.password) { toast.error('Tous les champs sont requis'); return; }
    setSubmitting(true);
    try {
      await authApi.createUser(form);
      toast.success('Utilisateur créé');
      setShowModal(false);
      setForm({ username: '', password: '', role: 'ASSISTANT' });
      const u = await authApi.listUsers();
      setUsers(u);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u: UserType) => {
    try {
      await authApi.updateUser(u.id, { is_active: !u.is_active });
      toast.success(u.is_active ? `${u.username} désactivé` : `${u.username} activé`);
      setUsers(users.map((usr) => usr.id === u.id ? { ...usr, is_active: !usr.is_active } : usr));
      setConfirmToggle(null);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  const handleToggleRole = async (u: UserType) => {
    const newRole = u.role === 'ADMIN' ? 'ASSISTANT' : 'ADMIN';
    try {
      await authApi.updateUser(u.id, { role: newRole });
      toast.success(`${u.username} est maintenant ${newRole === 'ADMIN' ? 'Administrateur' : 'Assistant'}`);
      setUsers(users.map((usr) => usr.id === u.id ? { ...usr, role: newRole } : usr));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    }
  };

  if (isLoading) return <div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-12 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-700 text-fluid-2xl sm:text-2xl">Utilisateurs</h1>
          <p className="text-text-secondary dark:text-[#8B9199] text-fluid-sm sm:text-sm mt-1">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="w-full sm:w-auto">
          <Plus size={16} />
          Nouvel utilisateur
        </Button>
      </div>

      {/* Desktop table */}
      <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border dark:border-white/[0.08]">
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Utilisateur</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Rôle</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Statut</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Créé le</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {users.map((u, i) => {
                const isMe = u.id === currentUser?.id;
                return (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className={`border-b border-border dark:border-white/[0.08] last:border-0 transition-colors ${isMe ? 'bg-accent/3 dark:bg-[#3ECF8E]/10' : 'hover:bg-porcelaine/50 dark:hover:bg-white/[0.05]'}`}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMe ? 'bg-accent/20 dark:bg-[#3ECF8E]/20' : 'bg-accent/10 dark:bg-[#3ECF8E]/10'}`}>
                          <User size={16} className="text-accent dark:text-[#3ECF8E]" />
                        </div>
                        <div>
                          <span className="text-sm font-medium">{u.username}</span>
                          {isMe && <span className="text-xs text-accent dark:text-[#3ECF8E] ml-1.5">(vous)</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => !isMe && handleToggleRole(u)}
                        disabled={isMe}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-button transition-colors ${isMe ? 'cursor-default' : 'hover:bg-porcelaine dark:hover:bg-white/[0.05] cursor-pointer'}`}
                      >
                        {u.role === 'ADMIN' ? <Shield size={14} className="text-accent dark:text-[#3ECF8E]" /> : <UserCheck size={14} className="text-text-secondary dark:text-[#8B9199]" />}
                        <span className="text-sm">{u.role === 'ADMIN' ? 'Administrateur' : 'Assistant'}</span>
                      </button>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => !isMe && setConfirmToggle(u)}
                        disabled={isMe}
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge transition-colors ${isMe ? 'cursor-default' : 'cursor-pointer hover:opacity-80'} ${u.is_active ? 'bg-stock-normal/10 text-stock-normal' : 'bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-[#8B9199]'}`}
                      >
                        {u.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{u.created_at ? formatDateTime(u.created_at) : '—'}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!isMe && (
                          <>
                            <button
                              onClick={() => handleToggleRole(u)}
                              className="p-1.5 text-text-secondary dark:text-[#8B9199] hover:text-accent dark:hover:text-[#3ECF8E] hover:bg-accent/5 dark:hover:bg-[#3ECF8E]/10 rounded-button transition-colors"
                            >
                              {u.role === 'ADMIN' ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                            </button>
                            <button
                              onClick={() => setConfirmToggle(u)}
                              className={`p-1.5 rounded-button transition-colors ${u.is_active ? 'text-text-secondary hover:text-stock-rupture hover:bg-stock-rupture/5' : 'text-text-secondary hover:text-stock-normal hover:bg-stock-normal/5'}`}
                            >
                              {u.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        <AnimatePresence>
          {users.map((u, i) => {
            const isMe = u.id === currentUser?.id;
            return (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4 ${isMe ? 'bg-accent/3 dark:bg-[#3ECF8E]/10' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isMe ? 'bg-accent/20 dark:bg-[#3ECF8E]/20' : 'bg-accent/10 dark:bg-[#3ECF8E]/10'}`}>
                      <User size={16} className="text-accent dark:text-[#3ECF8E]" />
                    </div>
                    <div>
                      <span className="text-sm font-medium">{u.username}</span>
                      {isMe && <span className="text-xs text-accent dark:text-[#3ECF8E] ml-1.5">(vous)</span>}
                    </div>
                  </div>
                  {!isMe && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleRole(u)}
                        className="p-2 text-text-secondary dark:text-[#8B9199] hover:text-accent dark:hover:text-[#3ECF8E] hover:bg-accent/5 dark:hover:bg-[#3ECF8E]/10 rounded-button transition-colors"
                      >
                        {u.role === 'ADMIN' ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}
                      </button>
                      <button
                        onClick={() => setConfirmToggle(u)}
                        className={`p-2 rounded-button transition-colors ${u.is_active ? 'text-text-secondary hover:text-stock-rupture hover:bg-stock-rupture/5' : 'text-text-secondary hover:text-stock-normal hover:bg-stock-normal/5'}`}
                      >
                        {u.is_active ? <PowerOff size={15} /> : <Power size={15} />}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary dark:text-[#8B9199]">{u.role === 'ADMIN' ? 'Administrateur' : 'Assistant'}</span>
                  <button
                    onClick={() => !isMe && setConfirmToggle(u)}
                    disabled={isMe}
                    className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${u.is_active ? 'bg-stock-normal/10 text-stock-normal' : 'bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-[#8B9199]'}`}
                  >
                    {u.is_active ? 'Actif' : 'Inactif'}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvel utilisateur">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Nom d'utilisateur *</label>
            <input type="text" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40" />
          </div>
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Mot de passe *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2.5 pr-10 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40"
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
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleSubmit} loading={submitting} className="w-full sm:w-auto">Créer</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmToggle} onClose={() => setConfirmToggle(null)} title={confirmToggle?.is_active ? 'Désactiver cet utilisateur ?' : 'Activer cet utilisateur ?'}>
        {confirmToggle && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary dark:text-[#8B9199]">
              {confirmToggle.is_active ? (
                <>L'utilisateur <strong>{confirmToggle.username}</strong> sera déconnecté immédiatement et ne pourra plus se connecter.</>
              ) : (
                <>L'utilisateur <strong>{confirmToggle.username}</strong> pourra de nouveau se connecter.</>
              )}
            </p>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button variant="secondary" onClick={() => setConfirmToggle(null)} className="w-full sm:w-auto">Annuler</Button>
              <Button
                variant={confirmToggle.is_active ? 'danger' : 'primary'}
                onClick={() => handleToggleActive(confirmToggle)}
                className="w-full sm:w-auto"
              >
                {confirmToggle.is_active ? 'Désactiver' : 'Activer'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
