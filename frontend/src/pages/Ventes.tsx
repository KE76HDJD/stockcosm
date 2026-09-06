import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, XCircle, Calendar, ShoppingBag } from 'lucide-react';
import { ventesApi } from '../api/produits';
import { useLoading } from '../hooks/useLoading';
import { StockBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { toast } from '../components/Toast';
import { formatDateTime } from '../api/utils';
import { useAuthStore } from '../hooks/useAuth';
import type { Vente, VenteLigne } from '../types';

export function VentesPage() {
  const { isLoading, withLoading } = useLoading(true);
  const user = useAuthStore((s) => s.user);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Vente | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = (p = page) => withLoading(async () => {
    const res = await ventesApi.list({
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      page: p,
      limit: 20,
    });
    setVentes(res.ventes);
    setTotal(res.total);
  });

  useEffect(() => { load(1); }, []);

  const filtered = search
    ? ventes.filter((v) => v.notes?.toLowerCase().includes(search.toLowerCase()) || v.id.includes(search))
    : ventes;

  const openDetail = async (id: string) => {
    setDetailId(id);
    const d = await ventesApi.get(id);
    setDetail(d);
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Annuler cette vente ? Le stock sera rétabli.')) return;
    try {
      await ventesApi.annuler(id);
      toast.success('Vente annulée');
      setDetail(null);
      setDetailId(null);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de l'annulation");
    }
  };

  const handleFilter = () => { setPage(1); load(1); };

  if (isLoading) return <div className="space-y-4">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="font-heading font-700 text-fluid-2xl sm:text-2xl">Historique des ventes</h1>
        <p className="text-text-secondary dark:text-[#8B9199] text-fluid-sm sm:text-sm mt-1">{total} vente{total > 1 ? 's' : ''}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par notes ou ID..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-text-secondary dark:text-[#8B9199] shrink-0" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2.5 sm:py-2 bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 flex-1 sm:flex-none" />
          <span className="text-text-secondary dark:text-[#8B9199] text-sm hidden sm:inline">→</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2.5 sm:py-2 bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 dark:focus:border-[#3ECF8E]/40 flex-1 sm:flex-none" />
          <Button variant="secondary" size="sm" onClick={handleFilter} className="shrink-0">Filtrer</Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border dark:border-white/[0.08]">
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">ID</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Date</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Vendeur</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Type</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Articles</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Statut</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((v, i) => (
                <motion.tr
                  key={v.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border dark:border-white/[0.08] last:border-0 hover:bg-porcelaine/50 dark:hover:bg-white/[0.05] transition-colors"
                >
                  <td className="px-6 py-3 text-sm font-mono text-text-secondary dark:text-[#8B9199]">{v.id.slice(0, 8)}...</td>
                  <td className="px-6 py-3 text-sm">{formatDateTime(v.created_at)}</td>
                  <td className="px-6 py-3 text-sm font-medium">{v.user_nom || '—'}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${v.type === 'KIT' ? 'bg-accent/10 dark:bg-[#3ECF8E]/15 text-accent dark:text-[#3ECF8E]' : 'bg-blue-50 text-blue-600'}`}>
                      {v.type === 'KIT' ? 'Kit' : 'Simple'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm">{v.lignes.length} article{v.lignes.length > 1 ? 's' : ''}</td>
                  <td className="px-6 py-3">
                    <StockBadge variant={v.status} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openDetail(v.id)} className="p-1.5 rounded-button hover:bg-porcelaine dark:hover:bg-white/[0.05] transition-colors">
                        <Eye size={16} className="text-text-secondary dark:text-[#8B9199]" />
                      </button>
                      {v.status === 'ACTIVE' && user?.role === 'ADMIN' && (
                        <button onClick={() => handleCancel(v.id)} className="p-1.5 rounded-button hover:bg-red-50 transition-colors">
                          <XCircle size={16} className="text-stock-rupture" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 sm:hidden">
        <AnimatePresence>
          {filtered.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${v.type === 'KIT' ? 'bg-accent/10 dark:bg-[#3ECF8E]/15 text-accent dark:text-[#3ECF8E]' : 'bg-blue-50 text-blue-600'}`}>
                    {v.type === 'KIT' ? 'Kit' : 'Simple'}
                  </span>
                  <StockBadge variant={v.status} />
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => openDetail(v.id)} className="p-1.5 rounded-button hover:bg-porcelaine dark:hover:bg-white/[0.05] transition-colors">
                      <Eye size={14} className="text-text-secondary dark:text-[#8B9199]" />
                  </button>
                  {v.status === 'ACTIVE' && user?.role === 'ADMIN' && (
                    <button onClick={() => handleCancel(v.id)} className="p-1.5 rounded-button hover:bg-red-50 transition-colors">
                      <XCircle size={14} className="text-stock-rupture" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-primary dark:text-[#E4E6E9] truncate pr-2">{v.lignes.length} article{v.lignes.length > 1 ? 's' : ''}</span>
                <span className="text-xs text-text-secondary dark:text-[#8B9199] shrink-0">{formatDateTime(v.created_at)}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={ShoppingBag} title="Aucune vente trouvée" description="Aucune vente ne correspond à vos critères." />
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>Précédent</Button>
          <span className="text-sm text-text-secondary dark:text-[#8B9199]">Page {page}</span>
          <Button variant="secondary" size="sm" disabled={ventes.length < 20} onClick={() => { setPage(page + 1); load(page + 1); }}>Suivant</Button>
        </div>
      )}

      <Modal isOpen={!!detailId} onClose={() => { setDetailId(null); setDetail(null); }} title="Détail de la vente" maxWidth="max-w-2xl">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">ID</p>
                <p className="font-mono text-xs sm:text-sm break-all">{detail.id}</p>
              </div>
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Date</p>
                <p className="text-sm">{formatDateTime(detail.created_at)}</p>
              </div>
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Vendeur</p>
                <p className="font-medium text-sm">{detail.user_nom || '—'}</p>
              </div>
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Type</p>
                <p className="font-medium text-sm">{detail.type === 'KIT' ? 'Vente kit' : 'Vente simple'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-heading font-600 text-sm mb-3">Articles</h3>
              <div className="space-y-2">
                {detail.lignes.map((l: VenteLigne) => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-border dark:border-white/[0.08] last:border-0">
                    <div>
                      <p className="text-sm font-medium">{l.produit_nom}</p>
                      <p className="text-xs text-text-secondary dark:text-[#8B9199]">{l.quantity} unité{l.quantity > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {detail.status === 'ACTIVE' && user?.role === 'ADMIN' && (
              <div className="flex justify-end pt-2">
                <Button variant="danger" size="sm" onClick={() => handleCancel(detail.id)}>
                  <XCircle size={14} />
                  Annuler la vente
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
