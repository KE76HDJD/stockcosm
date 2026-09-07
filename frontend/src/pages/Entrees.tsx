import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowDownToLine } from 'lucide-react';
import { produitsApi, stockApi } from '../api/produits';
import { useLoading } from '../hooks/useLoading';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ProductSelect } from '../components/ProductSelect';
import { toast } from '../components/Toast';
import { formatDateTime } from '../api/utils';
import type { Produit, Mouvement } from '../types';

export function EntreesPage() {
  const { isLoading, withLoading } = useLoading(true);
  const navigate = useNavigate();
  const [entrees, setEntrees] = useState<Mouvement[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ produit_id: '', quantity: 1 });
  const [submitting, setSubmitting] = useState(false);

  const load = () => withLoading(async () => {
    const [e, p] = await Promise.all([stockApi.listEntrees(), produitsApi.list({ limit: 100 })]);
    setEntrees(e);
    setProduits(p.filter((x) => x.status === 'ACTIVE'));
  });

  useEffect(() => { load(); }, []);

  const openForm = () => {
    setForm({ produit_id: '', quantity: 1 });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.produit_id) { toast.error('Sélectionnez un produit'); return; }
    if (form.quantity < 1) { toast.error('Quantité invalide'); return; }
    setSubmitting(true);
    try {
      const produit = produits.find((p) => p.id === form.produit_id);
      await stockApi.entrer({
        produit_id: form.produit_id,
        quantity: form.quantity,
      });
      const newStock = produit ? produit.stock_quantity + form.quantity : '?';
      const produitNom = produit?.name || 'Produit';
      toast.success(`${produitNom} : ${newStock} en stock`, {
        label: 'Voir le stock',
        onClick: () => navigate(`/produits?highlight=${form.produit_id}`),
      });
      setShowForm(false);
      setForm({ produit_id: '', quantity: 1 });
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="space-y-4">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}</div>;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-700 text-fluid-2xl sm:text-2xl">Entrées de stock</h1>
          <p className="text-text-secondary dark:text-[#8B9199] text-fluid-sm sm:text-sm mt-1">{entrees.length} entrée{entrees.length > 1 ? 's' : ''} enregistrée{entrees.length > 1 ? 's' : ''}</p>
        </div>
        {!showForm && (
          <Button onClick={openForm} className="w-full sm:w-auto">
            <Plus size={16} />
            Nouvelle entrée
          </Button>
        )}
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4 sm:p-6 space-y-4"
        >
          <h2 className="text-base font-heading font-600 text-text-primary dark:text-[#E4E6E9]">Nouvelle entrée de stock</h2>
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Produit *</label>
            <ProductSelect
              value={form.produit_id}
              onChange={(v) => setForm({ ...form, produit_id: v })}
              produits={produits}
              placeholder="Sélectionner un produit..."
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Quantité *</label>
            <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} min="1" className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40" />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleSubmit} loading={submitting} className="w-full sm:w-auto">Enregistrer</Button>
          </div>
        </motion.div>
      )}

      {/* Desktop table */}
      <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border dark:border-white/[0.08]">
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Produit</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Quantité</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Stock après</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Enregistré par</th>
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
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
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
                <span className="text-sm font-medium text-stock-normal shrink-0">+{e.quantity}</span>
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
