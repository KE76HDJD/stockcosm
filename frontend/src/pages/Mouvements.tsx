import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, History } from 'lucide-react';
import { produitsApi, stockApi } from '../api/produits';
import { useLoading } from '../hooks/useLoading';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ProductSelect } from '../components/ProductSelect';
import { formatDateTime, getTypeMouvementEmoji, getTypeMouvementColor } from '../api/utils';
import type { Produit, Mouvement } from '../types';

export function MouvementsPage() {
  const { isLoading, withLoading } = useLoading(true);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedProduit, setSelectedProduit] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    withLoading(async () => {
      const p = await produitsApi.list({ limit: 100 });
      setProduits(p.filter((x) => x.status === 'ACTIVE'));
    });
  }, []);

  const loadMouvements = (p = 1) => {
    setPage(p);
    withLoading(async () => {
      const res = await stockApi.listMouvements({
        produit_id: selectedProduit || undefined,
        type: typeFilter || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        page: p,
        limit: 30,
      });
      setMouvements(res.mouvements);
      setTotal(res.total);
    });
  };

  useEffect(() => {
    loadMouvements(1);
  }, [selectedProduit, typeFilter]);

  const handleFilter = () => loadMouvements(1);

  if (isLoading) return <div className="space-y-4">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-heading font-700 text-fluid-2xl sm:text-2xl">Historique des sorties</h1>
        <p className="text-text-secondary dark:text-[#8B9199] text-fluid-sm sm:text-sm mt-1">Historique global de tous les sorties</p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0 sm:min-w-[200px] sm:max-w-md">
          <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Produit</label>
          <ProductSelect
            value={selectedProduit}
            onChange={setSelectedProduit}
            produits={produits}
            placeholder="Tous les produits"
            showAllOption
            allOptionLabel="Tous les produits"
          />
        </div>
        <div className="min-w-0 sm:min-w-[150px]">
          <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Type</label>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full px-3 py-2.5 sm:py-2 bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40">
            <option value="">Tous les types</option>
            <option value="IN">Entrées</option>
            <option value="OUT">Ventes</option>
            <option value="RETURN">Retours</option>
            <option value="AUTRE_SORTIE">Autres sorties</option>
            <option value="AJUSTEMENT">Ajustements</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:min-w-[130px]">
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Du</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2.5 sm:py-2 bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40" />
          </div>
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Au</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2.5 sm:py-2 bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40" />
          </div>
        </div>
        <div className="sm:pt-5">
          <Button variant="secondary" size="sm" onClick={handleFilter} className="w-full sm:w-auto">
            <Search size={14} />
            Filtrer
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border dark:border-white/[0.08]">
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Produit</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Quantité</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Stock avant</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Stock après</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Utilisateur</th>
            </tr>
          </thead>
          <tbody>
            {mouvements.map((m, i) => (
              <motion.tr
                key={m.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className="border-b border-border dark:border-white/[0.08] last:border-0 hover:bg-porcelaine/50 dark:hover:bg-white/[0.05] transition-colors"
              >
                <td className="px-6 py-3 text-sm">{formatDateTime(m.created_at)}</td>
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    <span>{getTypeMouvementEmoji(m.type)}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${getTypeMouvementColor(m.type)}`}>
                      {m.type_label}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm font-medium">{m.produit_nom}</td>
                <td className={`px-6 py-3 text-sm font-medium ${m.type === 'IN' || m.type === 'RETURN' ? 'text-stock-normal' : 'text-stock-rupture'}`}>
                  {m.type === 'IN' || m.type === 'RETURN' ? '+' : '-'}{m.quantity}
                </td>
                <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{m.stock_before ?? '—'}</td>
                <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{m.stock_after ?? '—'}</td>
                <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{m.user_nom || '—'}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        {mouvements.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span>{getTypeMouvementEmoji(m.type)}</span>
                <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${getTypeMouvementColor(m.type)}`}>
                  {m.type_label}
                </span>
              </div>
              <span className={`text-sm font-medium ${m.type === 'IN' || m.type === 'RETURN' ? 'text-stock-normal' : 'text-stock-rupture'}`}>
                {m.type === 'IN' || m.type === 'RETURN' ? '+' : '-'}{m.quantity}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-primary dark:text-[#E4E6E9] truncate pr-2">{m.produit_nom}</span>
              <span className="text-xs text-text-secondary dark:text-[#8B9199] shrink-0">{formatDateTime(m.created_at)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-text-secondary dark:text-[#8B9199]">{m.user_nom || '—'}</span>
              <span className="text-xs text-text-secondary dark:text-[#8B9199]">Stock: {m.stock_before ?? '—'} → {m.stock_after ?? '—'}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {mouvements.length === 0 && (
        <EmptyState icon={History} title="Aucune sortie trouvée" description="Modifiez vos filtres ou créez des sorties." />
      )}

      {total > 30 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => loadMouvements(page - 1)}>Précédent</Button>
          <span className="text-sm text-text-secondary dark:text-[#8B9199]">Page {page} ({total} sorties)</span>
          <Button variant="secondary" size="sm" disabled={mouvements.length < 30} onClick={() => loadMouvements(page + 1)}>Suivant</Button>
        </div>
      )}
    </div>
  );
}
