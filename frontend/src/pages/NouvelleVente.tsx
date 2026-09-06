import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShoppingCart, Minus, Plus, AlertCircle } from 'lucide-react';
import { produitsApi, ventesApi } from '../api/produits';
import { useLoading } from '../hooks/useLoading';
import { Button } from '../components/Button';
import { toast } from '../components/Toast';
import type { Produit } from '../types';

interface LigneVente {
  produit_id: string;
  produit_nom: string;
  quantity: number;
  stock: number;
}

export function NouvelleVentePage() {
  const { isLoading, withLoading } = useLoading(true);
  const navigate = useNavigate();
  const [type, setType] = useState<'SIMPLE' | 'KIT'>('SIMPLE');
  const [produits, setProduits] = useState<Produit[]>([]);
  const [lignes, setLignes] = useState<LigneVente[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    withLoading(async () => {
      const p = await produitsApi.list({ limit: 100 });
      setProduits(p.filter((x) => x.status === 'ACTIVE'));
    });
  }, []);

  const addLine = () => {
    setLignes([...lignes, { produit_id: '', produit_nom: '', quantity: 1, stock: 0 }]);
  };

  const updateLine = (index: number, field: string, value: any) => {
    const newLignes = [...lignes];
    if (field === 'produit_id') {
      const prod = produits.find((p) => p.id === value);
      if (prod) {
        newLignes[index] = { ...newLignes[index], produit_id: value, produit_nom: prod.name, stock: prod.stock_quantity };
      }
    } else if (field === 'quantity') {
      newLignes[index] = { ...newLignes[index], quantity: Math.max(1, Number(value)) };
    }
    setLignes(newLignes);
  };

  const removeLine = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (lignes.length === 0) {
      toast.error('Ajoutez au moins un produit');
      return;
    }
    for (const l of lignes) {
      if (!l.produit_id) {
        toast.error('Sélectionnez tous les produits');
        return;
      }
      if (l.quantity > l.stock) {
        toast.error(`Stock insuffisant pour ${l.produit_nom} (disponible: ${l.stock})`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await ventesApi.create({
        type,
        lignes: lignes.map((l) => ({ produit_id: l.produit_id, quantity: l.quantity })),
      });
      const stockInfo = lignes.map((l) => `${l.produit_nom} : ${l.stock - l.quantity} restant${l.stock - l.quantity > 1 ? 's' : ''}`).join(', ');
      const msg = lignes.length === 1
        ? `Vente enregistrée — ${stockInfo}`
        : `Vente enregistrée — ${lignes.length} produits vendus`;
      const highlightId = lignes.length === 1 ? lignes[0].produit_id : undefined;
      toast.success(msg, {
        label: 'Voir le stock',
        onClick: () => navigate(highlightId ? `/produits?highlight=${highlightId}` : '/produits'),
      });
      setLignes([]);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-16 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}</div>;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-3xl">
      <div>
        <h1 className="font-heading font-700 text-fluid-2xl sm:text-2xl">Nouvelle vente</h1>
        <p className="text-text-secondary dark:text-[#8B9199] text-fluid-sm sm:text-sm mt-1">
          {type === 'KIT' ? 'Vente regroupant plusieurs produits' : 'Enregistrer une sortie de stock'}
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setType('SIMPLE')}
          className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-button text-sm font-medium transition-colors ${type === 'SIMPLE' ? 'bg-accent text-white' : 'bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] text-text-secondary dark:text-[#8B9199] hover:bg-porcelaine dark:hover:bg-white/[0.05]'}`}
        >
          Vente simple
        </button>
        <button
          onClick={() => setType('KIT')}
          className={`flex-1 sm:flex-none px-4 py-2.5 sm:py-2 rounded-button text-sm font-medium transition-colors ${type === 'KIT' ? 'bg-accent text-white' : 'bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] text-text-secondary dark:text-[#8B9199] hover:bg-porcelaine dark:hover:bg-white/[0.05]'}`}
        >
          Vente kit
        </button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {lignes.map((ligne, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3 sm:p-4">
            <div className="flex flex-col sm:grid sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7">
                <label className="text-xs text-text-secondary dark:text-[#8B9199] mb-1 block">Produit</label>
                <select value={ligne.produit_id} onChange={(e) => updateLine(i, 'produit_id', e.target.value)} className="w-full px-3 py-2.5 sm:py-2 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40">
                  <option value="">Choisir...</option>
                  {produits.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (stock: {p.stock_quantity})</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="text-xs text-text-secondary dark:text-[#8B9199] mb-1 block">Quantité</label>
                <input type="number" value={ligne.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} min="1" className="w-full px-3 py-2.5 sm:py-2 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40" />
              </div>
              <div className="sm:col-span-2 flex items-end justify-end">
                <button onClick={() => removeLine(i)} className="p-2.5 sm:p-2 text-text-secondary dark:text-[#8B9199] hover:text-stock-rupture transition-colors w-full sm:w-auto text-center">
                  <Minus size={16} className="mx-auto" />
                </button>
              </div>
            </div>
            {ligne.produit_id && ligne.quantity > ligne.stock && (
              <div className="flex items-center gap-2 mt-2 text-stock-rupture text-xs">
                <AlertCircle size={14} />
                Stock insuffisant (disponible: {ligne.stock})
              </div>
            )}
          </motion.div>
        ))}
        <Button variant="secondary" onClick={addLine} size="sm" className="w-full sm:w-auto">
          <Plus size={16} />
          Ajouter un produit
        </Button>
      </div>

      <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4 sm:p-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3">
        <Button onClick={handleSubmit} loading={submitting} size="lg" className="w-full sm:w-auto">
          <ShoppingCart size={18} />
          {type === 'KIT' ? 'Enregistrer la vente kit' : 'Enregistrer la vente'}
        </Button>
      </div>
    </div>
  );
}
