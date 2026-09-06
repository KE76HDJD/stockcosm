import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Eye, Plus } from 'lucide-react';
import { produitsApi, categoriesApi } from '../api/produits';
import { useLoading } from '../hooks/useLoading';
import { StockBadge } from '../components/Badge';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { toast } from '../components/Toast';
import { formatQuantity, formatDateTime, getTypeMouvementEmoji, getTypeMouvementColor } from '../api/utils';
import type { Produit, ProduitStock, Mouvement, PaginatedMouvements } from '../types';

export function ProduitsPage() {
  const { isLoading, withLoading } = useLoading(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [detailProduit, setDetailProduit] = useState<Produit | null>(null);
  const [stockInfo, setStockInfo] = useState<ProduitStock | null>(null);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [mouvementsTotal, setMouvementsTotal] = useState(0);
  const [mouvementsPage, setMouvementsPage] = useState(1);
  const [mouvementsPages, setMouvementsPages] = useState(0);
  const [loadingMouvements, setLoadingMouvements] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', categorie_id: '', alert_threshold: 10 });
  const [creating, setCreating] = useState(false);

  const loadProduits = () => withLoading(async () => {
    const [p, c] = await Promise.all([
      produitsApi.list({ search: search || undefined, limit: 50 }),
      categoriesApi.list(),
    ]);
    setProduits(p);
    setCategories(c);
  });

  useEffect(() => { loadProduits(); }, []);

  useEffect(() => {
    const highlight = searchParams.get('highlight');
    if (highlight && produits.length > 0) {
      const produit = produits.find((p) => p.id === highlight);
      if (produit) {
        setHighlightedId(highlight);
        openDetail(produit);
        setTimeout(() => setHighlightedId(null), 3000);
        searchParams.delete('highlight');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [searchParams, produits]);

  const handleSearch = async () => {
    await withLoading(async () => {
      const p = await produitsApi.list({ search: search || undefined, limit: 50 });
      setProduits(p);
    });
  };

  const loadMouvements = async (produitId: string, page: number) => {
    setLoadingMouvements(true);
    try {
      const res = await produitsApi.getMouvements(produitId, page, 10);
      setMouvements(res.mouvements);
      setMouvementsTotal(res.total);
      setMouvementsPages(res.pages);
      setMouvementsPage(res.page);
    } finally {
      setLoadingMouvements(false);
    }
  };

  const openDetail = async (p: Produit) => {
    setDetailProduit(p);
    const stock = await produitsApi.get(p.id).then((prod) => ({
      produit_id: prod.id,
      produit_nom: prod.name,
      stock_actuel: prod.stock_quantity,
      stock_reel: prod.stock_quantity,
      alert_threshold: prod.alert_threshold,
      statut: prod.stock_quantity <= 0 ? 'rupture' : prod.stock_quantity <= prod.alert_threshold ? 'faible' : 'normal',
    } as ProduitStock));
    setStockInfo(stock);
    await loadMouvements(p.id, 1);
  };

  const handleCreate = async () => {
    if (!createForm.name.trim()) { toast.error('Le nom est requis'); return; }
    if (!createForm.categorie_id) { toast.error('Sélectionnez une catégorie'); return; }
    setCreating(true);
    try {
      const newProduit = await produitsApi.create(createForm);
      toast.success(`${newProduit.name} créé`);
      setProduits([...produits, newProduit]);
      setShowCreateModal(false);
      setCreateForm({ name: '', categorie_id: '', alert_threshold: 10 });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  };

  const filtered = selectedCat
    ? produits.filter((p) => p.categorie_id === selectedCat && p.status === 'ACTIVE')
    : produits.filter((p) => p.status === 'ACTIVE');

  if (isLoading) return <div className="space-y-4">{Array.from({length:5}).map((_,i)=><div key={i} className="h-12 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-700 text-fluid-2xl sm:text-2xl">Produits</h1>
          <p className="text-text-secondary dark:text-[#8B9199] text-fluid-sm sm:text-sm mt-1">{produits.filter(p => p.status === 'ACTIVE').length} produits actifs</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          <Plus size={16} />
          Nouveau produit
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Rechercher un produit..."
            className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 dark:focus:border-[#3ECF8E]/40 dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50"
          />
        </div>
        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="px-3 py-2.5 sm:py-2 bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9]"
        >
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Desktop table */}
      <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border dark:border-white/[0.08]">
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Produit</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Catégorie</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Stock</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Seuil</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Statut</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className={`border-b border-border dark:border-white/[0.08] last:border-0 transition-colors cursor-pointer ${
                    highlightedId === p.id
                      ? 'bg-brand-orange/10 ring-2 ring-brand-orange/30'
                      : 'hover:bg-porcelaine/50 dark:hover:bg-white/[0.05]'
                  }`}
                  onClick={() => openDetail(p)}
                >
                  <td className="px-6 py-3 text-sm font-medium">{p.name}</td>
                  <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{p.categorie_nom}</td>
                  <td className="px-6 py-3 text-sm font-medium">{formatQuantity(p.stock_quantity)}</td>
                  <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{p.alert_threshold}</td>
                  <td className="px-6 py-3">
                    <StockBadge variant={p.stock_quantity <= 0 ? 'rupture' : p.stock_quantity <= p.alert_threshold ? 'faible' : 'normal'} />
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-button hover:bg-porcelaine dark:hover:bg-white/[0.05] transition-colors" onClick={(e) => { e.stopPropagation(); openDetail(p); }}>
                        <Eye size={16} className="text-text-secondary dark:text-[#8B9199]" />
                      </button>
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
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4 cursor-pointer active:bg-porcelaine/50 dark:active:bg-white/[0.05] transition-colors ${
                highlightedId === p.id ? 'ring-2 ring-brand-orange/30' : ''
              }`}
              onClick={() => openDetail(p)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium truncate pr-2">{p.name}</span>
                <StockBadge variant={p.stock_quantity <= 0 ? 'rupture' : p.stock_quantity <= p.alert_threshold ? 'faible' : 'normal'} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary dark:text-[#8B9199]">{p.categorie_nom}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary dark:text-[#8B9199]">Seuil: {p.alert_threshold}</span>
                  <span className="text-sm font-semibold">{formatQuantity(p.stock_quantity)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={Search} title="Aucun produit trouvé" description="Modifiez votre recherche ou filtre." />
      )}

      <Modal isOpen={!!detailProduit} onClose={() => { setDetailProduit(null); setStockInfo(null); setMouvements([]); }} title={detailProduit?.name || ''} maxWidth="max-w-2xl">
        {detailProduit && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Catégorie</p>
                <p className="font-medium text-sm">{detailProduit.categorie_nom}</p>
              </div>
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Seuil d'alerte</p>
                <p className="font-medium text-sm">{detailProduit.alert_threshold}</p>
              </div>
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Stock actuel</p>
                <p className="font-heading font-700 text-fluid-xl sm:text-xl">{stockInfo?.stock_actuel || detailProduit.stock_quantity}</p>
              </div>
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Statut</p>
                <StockBadge variant={stockInfo?.statut || 'normal'} size="md" />
              </div>
            </div>

            <div>
              <h3 className="font-heading font-600 text-sm mb-3">
                Historique des sorties
                {mouvementsTotal > 0 && <span className="text-text-secondary dark:text-[#8B9199] font-normal ml-2">({mouvementsTotal} mouvement{mouvementsTotal > 1 ? 's' : ''})</span>}
              </h3>
              {loadingMouvements ? (
                <div className="space-y-2">
                  {Array.from({length:3}).map((_,i)=><div key={i} className="h-10 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}
                </div>
              ) : mouvements.length === 0 ? (
                <p className="text-sm text-text-secondary dark:text-[#8B9199]">Aucune sortie enregistrée.</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {mouvements.map((m) => (
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-border dark:border-white/[0.08] last:border-0">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <span className="shrink-0">{getTypeMouvementEmoji(m.type)}</span>
                          <div className="min-w-0">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${getTypeMouvementColor(m.type)}`}>
                              {m.type_label}
                            </span>
                            <span className="text-xs text-text-secondary dark:text-[#8B9199] ml-2">{formatDateTime(m.created_at)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                          <span className="text-xs text-text-secondary dark:text-[#8B9199] hidden sm:inline">Stock: {m.stock_before} → {m.stock_after}</span>
                          <span className={`text-sm font-medium ${m.type === 'IN' || m.type === 'RETURN' ? 'text-stock-normal' : 'text-stock-rupture'}`}>
                            {m.type === 'IN' || m.type === 'RETURN' ? '+' : '-'}{m.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {mouvementsPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-3">
                      <Button variant="secondary" size="sm" disabled={mouvementsPage <= 1} onClick={() => loadMouvements(detailProduit.id, mouvementsPage - 1)}>Précédent</Button>
                      <span className="text-xs text-text-secondary dark:text-[#8B9199]">Page {mouvementsPage}/{mouvementsPages}</span>
                      <Button variant="secondary" size="sm" disabled={mouvementsPage >= mouvementsPages} onClick={() => loadMouvements(detailProduit.id, mouvementsPage + 1)}>Suivant</Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nouveau produit">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Nom du produit *</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              placeholder="Ex: Savon Alauna"
              className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 dark:focus:border-[#3ECF8E]/40 dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50"
            />
          </div>
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Catégorie *</label>
            <select
              value={createForm.categorie_id}
              onChange={(e) => setCreateForm({ ...createForm, categorie_id: e.target.value })}
              className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm"
            >
              <option value="">Sélectionner...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Seuil d'alerte</label>
            <input
              type="number"
              value={createForm.alert_threshold}
              onChange={(e) => setCreateForm({ ...createForm, alert_threshold: Number(e.target.value) })}
              min="0"
              className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)} className="w-full sm:w-auto">Annuler</Button>
            <Button onClick={handleCreate} loading={creating} className="w-full sm:w-auto">Créer le produit</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
