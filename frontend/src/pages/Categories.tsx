import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tags, Plus, Eye, ArrowLeft } from 'lucide-react';
import { categoriesApi, produitsApi } from '../api/produits';
import { useLoading } from '../hooks/useLoading';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { StockBadge } from '../components/Badge';
import { toast } from '../components/Toast';
import { formatDateTime, getTypeMouvementEmoji, getTypeMouvementColor } from '../api/utils';
import type { Categorie, Produit, ProduitStock, Mouvement } from '../types';

export function CategoriesPage() {
  const { isLoading, withLoading } = useLoading(true);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail view
  const [selectedCat, setSelectedCat] = useState<Categorie | null>(null);
  const [catProduits, setCatProduits] = useState<Produit[]>([]);
  const [loadingProduits, setLoadingProduits] = useState(false);

  // Product detail modal
  const [detailProduit, setDetailProduit] = useState<Produit | null>(null);
  const [detailCatName, setDetailCatName] = useState('');
  const [stockInfo, setStockInfo] = useState<ProduitStock | null>(null);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [mouvementsTotal, setMouvementsTotal] = useState(0);
  const [mouvementsPage, setMouvementsPage] = useState(1);
  const [mouvementsPages, setMouvementsPages] = useState(0);
  const [loadingMouvements, setLoadingMouvements] = useState(false);

  const load = () => withLoading(async () => {
    const c = await categoriesApi.list();
    setCategories(c);
  });

  useEffect(() => { load(); }, []);

  const openCreate = () => { setName(''); setShowModal(true); };

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Le nom est requis'); return; }
    setSubmitting(true);
    try {
      await categoriesApi.create(name.trim());
      toast.success('Catégorie créée');
      setShowModal(false);
      await load();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (c: Categorie) => {
    setSelectedCat(c);
    setLoadingProduits(true);
    try {
      const res = await categoriesApi.getProduits(c.id);
      setCatProduits(res.produits);
    } catch {
      setCatProduits([]);
    } finally {
      setLoadingProduits(false);
    }
  };

  const loadMouvements = async (produitId: string, page: number) => {
    setLoadingMouvements(true);
    try {
      const res = await produitsApi.getMouvements(produitId, page);
      setMouvements(res.mouvements);
      setMouvementsTotal(res.total);
      setMouvementsPages(res.pages);
      setMouvementsPage(res.page);
    } finally {
      setLoadingMouvements(false);
    }
  };

  const openProductDetail = async (p: Produit) => {
    setDetailProduit(p);
    setDetailCatName(selectedCat?.name || '');
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

  if (isLoading) return <div className="space-y-4">{Array.from({length:3}).map((_,i)=><div key={i} className="h-14 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}</div>;

  if (selectedCat) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelectedCat(null); setCatProduits([]); }} className="p-2 hover:bg-porcelaine dark:hover:bg-white/[0.05] rounded-button transition-colors">
            <ArrowLeft size={20} className="text-text-secondary dark:text-[#8B9199]" />
          </button>
          <div>
            <h1 className="font-heading font-700 text-2xl">{selectedCat.name}</h1>
            <p className="text-text-secondary dark:text-[#8B9199] text-sm mt-1">{catProduits.length} produit{catProduits.length > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border dark:border-white/[0.08]">
                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Produit</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Stock</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Seuil</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Statut</th>
              </tr>
            </thead>
            <tbody>
              {catProduits.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-border dark:border-white/[0.08] last:border-0 hover:bg-porcelaine/50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                  onClick={() => openProductDetail(p)}
                >
                  <td className="px-6 py-3 text-sm font-medium">{p.name}</td>
                  <td className="px-6 py-3 text-sm">{p.stock_quantity}</td>
                  <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{p.alert_threshold}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${
                      p.stock_quantity <= 0 ? 'bg-stock-rupture/10 text-stock-rupture' :
                      p.stock_quantity <= p.alert_threshold ? 'bg-stock-faible/10 text-stock-faible' :
                      'bg-stock-normal/10 text-stock-normal'
                    }`}>
                      {p.stock_quantity <= 0 ? 'Rupture' : p.stock_quantity <= p.alert_threshold ? 'Faible' : 'Normal'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {catProduits.length === 0 && (
            <EmptyState icon={Tags} title="Aucun produit dans cette catégorie" description="Ajoutez des produits à cette catégorie." />
          )}
        </div>

        <Modal isOpen={!!detailProduit} onClose={() => { setDetailProduit(null); setStockInfo(null); setMouvements([]); setDetailCatName(''); }} title={detailProduit?.name || ''} maxWidth="max-w-2xl">
          {detailProduit && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-4">
                  <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Catégorie</p>
                  <p className="font-medium">{detailProduit.categorie_nom || detailCatName}</p>
                </div>
                <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-4">
                  <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Seuil d'alerte</p>
                  <p className="font-medium">{detailProduit.alert_threshold}</p>
                </div>
                <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-4">
                  <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Stock actuel</p>
                  <p className="font-heading font-700 text-xl">{stockInfo?.stock_actuel ?? detailProduit.stock_quantity}</p>
                </div>
                <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-4">
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
                          <div className="flex items-center gap-3">
                            <span>{getTypeMouvementEmoji(m.type)}</span>
                            <div>
                              <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${getTypeMouvementColor(m.type)}`}>
                                {m.type_label}
                              </span>
                              <span className="text-xs text-text-secondary dark:text-[#8B9199] ml-2">{formatDateTime(m.created_at)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-text-secondary dark:text-[#8B9199]">Stock: {m.stock_before} → {m.stock_after}</span>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-700 text-2xl">Catégories</h1>
          <p className="text-text-secondary dark:text-[#8B9199] text-sm mt-1">{categories.length} catégorie{categories.length > 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Nouvelle catégorie
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {categories.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-5 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => openDetail(c)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/5 dark:bg-[#3ECF8E]/10 rounded-button">
                    <Tags size={18} className="text-accent dark:text-[#3ECF8E]" />
                  </div>
                  <div>
                    <h3 className="font-heading font-600 text-base">{c.name}</h3>
                    <p className="text-xs text-text-secondary dark:text-[#8B9199] mt-0.5">{c.product_count} produit{c.product_count > 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button className="p-1.5 rounded-button hover:bg-porcelaine dark:hover:bg-white/[0.05] transition-colors">
                  <Eye size={16} className="text-text-secondary dark:text-[#8B9199]" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {categories.length === 0 && (
        <EmptyState icon={Tags} title="Aucune catégorie" description="Créez votre première catégorie pour organiser vos produits." />
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvelle catégorie">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary dark:text-[#8B9199] mb-1 block">Nom *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la catégorie" className="w-full px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={handleSubmit} loading={submitting}>Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
