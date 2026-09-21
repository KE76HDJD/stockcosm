import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Undo2 } from 'lucide-react';
import { produitsApi, stockApi } from '../api/produits';
import { useLoading } from '../hooks/useLoading';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ProductSelect } from '../components/ProductSelect';
import { toast } from '../components/Toast';
import { formatDateTime } from '../api/utils';
import type { Produit, Mouvement } from '../types';

type TabType = 'IN' | 'OUT' | 'ADJUST';

export function EntreesPage() {
  const { isLoading, withLoading } = useLoading(true);
  const navigate = useNavigate();
  const [entrees, setEntrees] = useState<Mouvement[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('IN');
  const [form, setForm] = useState({ produit_id: '', quantity: 1, nouvelle_quantite: 0, raison: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => withLoading(async () => {
    const [e, p] = await Promise.allSettled([stockApi.listEntrees(), produitsApi.list({ limit: 100 })]);
    if (e.status === 'fulfilled') setEntrees(e.value);
    if (p.status === 'fulfilled') setProduits(p.value.filter((x) => x.status === 'ACTIVE'));
  });

  useEffect(() => { load(); }, []);

  const openForm = (tab: TabType = 'IN') => {
    setActiveTab(tab);
    setForm({ produit_id: '', quantity: 1, nouvelle_quantite: 0, raison: '' });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.produit_id) { toast.error('Sélectionnez un produit'); return; }
    const produit = produits.find((p) => p.id === form.produit_id);
    if (!produit) { toast.error('Produit introuvable'); return; }
    setSubmitting(true);
    try {
      if (activeTab === 'IN') {
        if (form.quantity < 1) { toast.error('Quantité invalide'); return; }
        await stockApi.entrer({ produit_id: form.produit_id, quantity: form.quantity });
        toast.success(`${produit.name} : +${form.quantity} (stock ${produit.stock_quantity + form.quantity})`, {
          label: 'Voir le stock',
          onClick: () => navigate(`/produits?highlight=${form.produit_id}`),
        });
      } else if (activeTab === 'OUT') {
        if (form.quantity < 1) { toast.error('Quantité invalide'); return; }
        if (form.quantity > produit.stock_quantity) { toast.error(`Stock insuffisant : ${produit.stock_quantity} disponible`); return; }
        await stockApi.sortir({ produit_id: form.produit_id, quantity: form.quantity, raison: form.raison || undefined });
        toast.success(`${produit.name} : -${form.quantity} (stock ${produit.stock_quantity - form.quantity})`, {
          label: 'Voir le stock',
          onClick: () => navigate(`/produits?highlight=${form.produit_id}`),
        });
      } else {
        if (form.nouvelle_quantite < 0) { toast.error('Quantité invalide'); return; }
        await stockApi.ajuster({ produit_id: form.produit_id, nouvelle_quantite: form.nouvelle_quantite, raison: form.raison || undefined });
        toast.success(`${produit.name} : stock ajusté à ${form.nouvelle_quantite}`, {
          label: 'Voir le stock',
          onClick: () => navigate(`/produits?highlight=${form.produit_id}`),
        });
      }
      setShowForm(false);
      setForm({ produit_id: '', quantity: 1, nouvelle_quantite: 0, raison: '' });
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAnnuler = async (m: Mouvement) => {
    if (!confirm(`Annuler cette entrée de ${m.quantity} pour "${m.produit_nom}" ? Un mouvement inverse sera créé.`)) return;
    try {
      await stockApi.annulerMouvement(m.id);
      toast.success('Entrée annulée — stock corrigé');
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Annulation impossible");
    }
  };

  if (isLoading) return <div className="space-y-4">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}</div>;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-700 text-fluid-2xl sm:text-2xl">Mouvements de stock</h1>
          <p className="text-text-secondary dark:text-[#8B9199] text-fluid-sm sm:text-sm mt-1">{entrees.length} entrée{entrees.length > 1 ? 's' : ''} enregistrée{entrees.length > 1 ? 's' : ''}</p>
        </div>
        {!showForm && (
          <div className="flex gap-2">
            <Button onClick={() => openForm('IN')} className="flex-1 sm:flex-none">
              <Plus size={16} />
              Entrée
            </Button>
            <Button variant="secondary" onClick={() => openForm('OUT')} className="flex-1 sm:flex-none">
              <ArrowUpFromLine size={16} />
              Sortie
            </Button>
          </div>
        )}
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4 sm:p-6 space-y-4"
        >
          <div className="flex gap-2 p-1 bg-porcelaine dark:bg-white/[0.05] rounded-button w-fit">
            {([
              { id: 'IN', label: 'Entrée (+)', icon: Plus },
              { id: 'OUT', label: 'Sortie (-)', icon: ArrowUpFromLine },
              { id: 'ADJUST', label: 'Ajuster (=)', icon: SlidersHorizontal },
            ] as const).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button text-xs font-medium transition-colors ${activeTab === t.id ? 'bg-[#E8751A] text-white' : 'text-text-secondary dark:text-[#8B9199] hover:text-text-primary'}`}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          <h2 className="text-base font-heading font-600 text-text-primary dark:text-[#E4E6E9]">
            {activeTab === 'IN' ? 'Nouvelle entrée de stock' : activeTab === 'OUT' ? 'Sortie corrective de stock' : 'Ajustement de stock'}
          </h2>
          <p className="text-xs text-text-secondary dark:text-[#8B9199] -mt-2">
            {activeTab === 'IN' ? 'Ajoute des unités au stock.' : activeTab === 'OUT' ? 'Retire des unités (correction d\'erreur).' : 'Définit le stock exact — utile si l\'inventaire physique diffère.'}
          </p>
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Produit *</label>
            <ProductSelect
              value={form.produit_id}
              onChange={(v) => {
                const p = produits.find((x) => x.id === v);
                setForm({ ...form, produit_id: v, nouvelle_quantite: p ? p.stock_quantity : 0 });
              }}
              produits={produits}
              placeholder="Sélectionner un produit..."
            />
            {form.produit_id && (
              <p className="text-xs text-text-secondary dark:text-[#8B9199] mt-1">
                Stock actuel : <span className="font-semibold text-text-primary dark:text-[#E4E6E9]">{produits.find((p) => p.id === form.produit_id)?.stock_quantity ?? '—'}</span>
              </p>
            )}
          </div>
          {activeTab !== 'ADJUST' ? (
            <div>
              <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Quantité *</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} min="1" className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40" />
            </div>
          ) : (
            <div>
              <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Nouvelle quantité en stock *</label>
              <input type="number" value={form.nouvelle_quantite} onChange={(e) => setForm({ ...form, nouvelle_quantite: Number(e.target.value) })} min="0" className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40" />
            </div>
          )}
          {activeTab !== 'IN' && (
            <div>
              <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Raison (optionnel)</label>
              <input type="text" value={form.raison} onChange={(e) => setForm({ ...form, raison: e.target.value })} placeholder={activeTab === 'OUT' ? 'Ex: erreur de saisie' : 'Ex: inventaire physique'} className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40" />
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleSubmit} loading={submitting} className="w-full sm:w-auto">
              {activeTab === 'IN' ? 'Enregistrer l\'entrée' : activeTab === 'OUT' ? 'Enregistrer la sortie' : 'Ajuster le stock'}
            </Button>
          </div>
        </motion.div>
      )}

      <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border dark:border-white/[0.08]">
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Produit</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Quantité</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Stock après</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Enregistré par</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {entrees.map((e, i) => (
                <motion.tr
                  key={e.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border dark:border-white/[0.08] last:border-0 hover:bg-porcelaine/50 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <td className="px-6 py-3 text-sm">{formatDateTime(e.created_at)}</td>
                  <td className="px-6 py-3 text-sm font-medium">{e.produit_nom}</td>
                  <td className="px-6 py-3 text-sm font-medium text-stock-normal">+{e.quantity}</td>
                  <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{e.stock_after ?? '—'}</td>
                  <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{e.user_nom || '—'}</td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleAnnuler(e)}
                      title="Annuler cette entrée (correction)"
                      className="p-1.5 rounded-button hover:bg-red-50 dark:hover:bg-red-500/10 text-text-secondary dark:text-[#8B9199] hover:text-stock-rupture transition-colors"
                    >
                      <Undo2 size={14} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="space-y-2 sm:hidden">
        <AnimatePresence>
          {entrees.map((e, i) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium truncate pr-2">{e.produit_nom}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stock-normal shrink-0">+{e.quantity}</span>
                  <button onClick={() => handleAnnuler(e)} className="p-1 rounded-button hover:bg-red-50 dark:hover:bg-red-500/10">
                    <Undo2 size={14} className="text-stock-rupture" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary dark:text-[#8B9199]">{e.user_nom || '—'}</span>
                <span className="text-xs text-text-secondary dark:text-[#8B9199]">{formatDateTime(e.created_at)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {entrees.length === 0 && !showForm && (
        <EmptyState icon={ArrowDownToLine} title="Aucune entrée de stock" description="Enregistrez une première entrée de stock." />
      )}
    </div>
  );
}
