import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, ArrowDownToLine, ShoppingCart, AlertTriangle, ArrowLeft, ChevronRight } from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { produitsApi } from '../api/produits';
import { formatQuantity, formatTime, formatDateTime, getTypeMouvementEmoji, getTypeMouvementColor, getStatutColor } from '../api/utils';
import { useLoading } from '../hooks/useLoading';
import { CardSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { StockBadge } from '../components/Badge';
import { toast } from '../components/Toast';
import type { DashboardResume, DashboardCategorie, DashboardProduitCategorie, Produit, ProduitStock, Mouvement } from '../types';

function CountUp({ value }: { value: number }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    if (value === 0) { setDisplayed(0); return; }
    let start = 0;
    let frameId: number;
    const duration = 800;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setDisplayed(Math.floor(progress * value));
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value]);
  return <>{displayed.toLocaleString('fr-FR')}</>;
}

type DashboardView = 'global' | 'categories' | 'produits';

export function DashboardPage() {
  const { isLoading, withLoading } = useLoading(true);
  const [resume, setResume] = useState<DashboardResume | null>(null);
  const [view, setView] = useState<DashboardView>('global');
  const [previousView, setPreviousView] = useState<DashboardView>('global');
  const [categories, setCategories] = useState<DashboardCategorie[]>([]);
  const [selectedCat, setSelectedCat] = useState<DashboardCategorie | null>(null);
  const [catProduits, setCatProduits] = useState<DashboardProduitCategorie[]>([]);
  const [loadingCat, setLoadingCat] = useState(false);
  const [detailProduit, setDetailProduit] = useState<Produit | null>(null);
  const [stockInfo, setStockInfo] = useState<ProduitStock | null>(null);
  const [mouvements, setMouvements] = useState<Mouvement[]>([]);
  const [mouvementsTotal, setMouvementsTotal] = useState(0);
  const [mouvementsPage, setMouvementsPage] = useState(1);
  const [mouvementsPages, setMouvementsPages] = useState(0);
  const [loadingMouvements, setLoadingMouvements] = useState(false);

  useEffect(() => {
    withLoading(async () => {
      const r = await dashboardApi.getResume();
      setResume(r);
    });
  }, []);

  const handleGlobalClick = async () => {
    setView('categories');
    setLoadingCat(true);
    try {
      const cats = await dashboardApi.getCategories();
      setCategories(cats);
    } finally {
      setLoadingCat(false);
    }
  };

  const handleCategoryClick = async (cat: DashboardCategorie, source: DashboardView = 'categories') => {
    setPreviousView(source);
    setSelectedCat(cat);
    setView('produits');
    setLoadingCat(true);
    try {
      if (cat.id) {
        const res = await dashboardApi.getProduitsByCategorie(cat.id);
        setCatProduits(res.produits);
      } else {
        setCatProduits([]);
      }
    } finally {
      setLoadingCat(false);
    }
  };

  const handleBack = () => {
    if (view === 'produits') {
      setView(previousView);
      setSelectedCat(null);
      setCatProduits([]);
    } else {
      setView('global');
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

  const openDetail = async (p: DashboardProduitCategorie) => {
    const fullProduit: Produit = {
      id: p.id,
      name: p.name,
      stock_quantity: p.stock_quantity,
      alert_threshold: p.alert_threshold,
      categorie_id: '',
      categorie_nom: selectedCat?.name || '',
      status: 'ACTIVE',
    } as Produit;
    setDetailProduit(fullProduit);
    const stock = {
      produit_id: p.id,
      produit_nom: p.name,
      stock_actuel: p.stock_quantity,
      stock_reel: p.stock_quantity,
      alert_threshold: p.alert_threshold,
      statut: p.statut,
    } as ProduitStock;
    setStockInfo(stock);
    await loadMouvements(p.id, 1);
  };

  if (isLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">{Array.from({length:4}).map((_,i)=><CardSkeleton key={i} />)}</div>;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="font-heading font-700 text-fluid-2xl sm:text-2xl text-text-primary dark:text-[#E4E6E9] dark:text-[#E4E6E9]">Tableau de bord</h1>
        <p className="text-text-secondary dark:text-[#8B9199] dark:text-[#8B9199] text-fluid-sm sm:text-sm mt-1">Vue d'ensemble du stock</p>
      </div>

      <AnimatePresence mode="wait">
        {/* NIVEAU 1 : Global */}
        {view === 'global' && (
          <motion.div
            key="global"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6 sm:space-y-8"
          >
            {/* Carte cliquable : total produits */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4 sm:p-6 cursor-pointer hover:shadow-md transition-all duration-200 group"
              onClick={handleGlobalClick}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-fluid-sm sm:text-sm text-text-secondary dark:text-[#8B9199]">Catalogue</span>
                  <div className="flex items-baseline gap-2 sm:gap-3 mt-2">
                    <p className="font-heading font-800 text-fluid-3xl sm:text-4xl text-text-primary dark:text-[#E4E6E9]">
                      <CountUp value={resume?.total_produits_disponibles || 0} />
                    </p>
                    <span className="text-fluid-sm sm:text-sm text-text-secondary dark:text-[#8B9199]">produits</span>
                  </div>
                  <div className="flex items-baseline gap-1.5 mt-1">
                    <p className="font-heading font-600 text-fluid-lg sm:text-lg text-accent dark:text-[#3ECF8E]">
                      <CountUp value={resume?.total_stock_general || 0} />
                    </p>
                    <span className="text-fluid-sm sm:text-sm text-text-secondary dark:text-[#8B9199]">unités en stock</span>
                  </div>
                  <p className="text-xs text-text-secondary dark:text-[#8B9199] mt-2 flex items-center gap-1">
                    Toutes catégories confondues
                    <ChevronRight size={12} className="group-hover:translate-x-1 transition-transform" />
                  </p>
                </div>
                <div className="p-3 sm:p-4 bg-accent/5 dark:bg-[#3ECF8E]/10 rounded-card group-hover:bg-accent/10 dark:bg-[#3ECF8E]/15 transition-colors">
                  <Package size={24} className="text-accent dark:text-[#3ECF8E] sm:w-7 sm:h-7" />
                </div>
              </div>
            </motion.div>

            {/* Métriques journalières */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {[
                { label: 'Entrées du jour', value: resume?.entrees_du_jour || 0, icon: ArrowDownToLine, color: 'text-stock-normal', bg: 'bg-stock-normal/5' },
                { label: 'Ventes du jour', value: resume?.ventes_du_jour || 0, icon: ShoppingCart, color: 'text-accent dark:text-[#3ECF8E]', bg: 'bg-accent/5 dark:bg-[#3ECF8E]/10' },
                { label: 'Unités vendues', value: resume?.unites_vendues_du_jour || 0, icon: Package, color: 'text-accent dark:text-[#3ECF8E]', bg: 'bg-accent/5 dark:bg-[#3ECF8E]/10' },
                { label: 'Produits en alerte', value: resume?.produits_en_alerte || 0, icon: AlertTriangle, color: (resume?.produits_en_alerte || 0) > 0 ? 'text-stock-faible' : 'text-text-secondary dark:text-[#8B9199]', bg: (resume?.produits_en_alerte || 0) > 0 ? 'bg-stock-faible/5' : 'bg-porcelaine' },
              ].map((card, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3 sm:p-6">
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <span className="text-xs sm:text-sm text-text-secondary dark:text-[#8B9199] truncate pr-2">{card.label}</span>
                      <div className={`p-1.5 sm:p-2 ${card.bg} rounded-button shrink-0`}>
                        <card.icon size={16} className={card.color} />
                      </div>
                    </div>
                    <p className="font-heading font-800 text-xl sm:text-3xl text-text-primary dark:text-[#E4E6E9]">
                      <CountUp value={card.value} />
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stock par catégorie */}
            {resume?.stock_par_categorie && resume.stock_par_categorie.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <h2 className="font-heading font-600 text-fluid-lg sm:text-lg mb-4">Stock par catégorie</h2>
                {/* Desktop table */}
                <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Catégorie</th>
                        <th className="text-center px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Produits</th>
                        <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Stock total</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {resume.stock_par_categorie.map((cat, i) => {
                        const dotColor = cat.total_stock <= 0 ? 'bg-stock-rupture' : cat.total_stock <= 50 ? 'bg-stock-faible' : 'bg-stock-normal';
                        return (
                          <motion.tr
                            key={cat.name}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-border last:border-0 hover:bg-porcelaine/50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                            onClick={() => handleCategoryClick({ id: cat.id, name: cat.name, count: cat.product_count }, 'global')}
                          >
                            <td className="px-6 py-3 text-sm font-medium flex items-center gap-2.5">
                              <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                              {cat.name}
                            </td>
                            <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199] text-center">{cat.product_count}</td>
                            <td className="px-6 py-3 text-sm font-semibold text-right">{cat.total_stock}</td>
                            <td className="px-3">
                              <ChevronRight size={14} className="text-text-secondary dark:text-[#8B9199]" />
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {resume.stock_par_categorie.map((cat, i) => {
                    const dotColor = cat.total_stock <= 0 ? 'bg-stock-rupture' : cat.total_stock <= 50 ? 'bg-stock-faible' : 'bg-stock-normal';
                    return (
                      <motion.div
                        key={cat.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4 cursor-pointer active:bg-porcelaine/50 dark:active:bg-white/[0.05] transition-colors"
                        onClick={() => handleCategoryClick({ id: cat.id, name: cat.name, count: cat.product_count }, 'global')}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                            <span className="text-sm font-medium">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-text-secondary dark:text-[#8B9199]">{cat.product_count} produits</span>
                            <span className="text-sm font-semibold">{cat.total_stock}</span>
                            <ChevronRight size={14} className="text-text-secondary dark:text-[#8B9199]" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Produits à surveiller */}
            {resume?.produits_a_surveiller && resume.produits_a_surveiller.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <h2 className="font-heading font-600 text-fluid-lg sm:text-lg mb-4">Produits à surveiller</h2>
                {/* Desktop table */}
                <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Produit</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Stock</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resume.produits_a_surveiller.map((a, i) => (
                        <motion.tr
                          key={a.produit_id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border last:border-0 hover:bg-porcelaine/50 transition-colors"
                        >
                          <td className="px-6 py-3 text-sm font-medium">{a.produit_nom}</td>
                          <td className="px-6 py-3 text-sm">{a.stock_actuel}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${getStatutColor(a.statut)}`}>
                              {a.statut === 'rupture' ? 'Rupture' : a.statut === 'faible' ? 'Faible' : 'Critique'}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {resume.produits_a_surveiller.map((a, i) => (
                    <motion.div
                      key={a.produit_id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate pr-2">{a.produit_nom}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-text-secondary dark:text-[#8B9199]">{a.stock_actuel}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${getStatutColor(a.statut)}`}>
                            {a.statut === 'rupture' ? 'Rupture' : a.statut === 'faible' ? 'Faible' : 'Critique'}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Derniers mouvements */}
            {resume?.derniers_mouvements && resume.derniers_mouvements.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                <h2 className="font-heading font-600 text-fluid-lg sm:text-lg mb-4">Activité de stock</h2>
                {/* Desktop table */}
                <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Heure</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Type</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Produit</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Quantité</th>
                        <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Utilisateur</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resume.derniers_mouvements.map((m, i) => (
                        <motion.tr
                          key={m.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border last:border-0 hover:bg-porcelaine/50 transition-colors"
                        >
                          <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{formatTime(m.created_at)}</td>
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-2">
                              <span>{getTypeMouvementEmoji(m.type)}</span>
                              <span className="text-sm">{m.type_label}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3 text-sm font-medium">{m.produit_nom}</td>
                          <td className={`px-6 py-3 text-sm font-medium ${m.type === 'IN' || m.type === 'RETURN' ? 'text-stock-normal' : 'text-stock-rupture'}`}>
                            {m.type === 'IN' || m.type === 'RETURN' ? '+' : '-'}{m.quantity}
                          </td>
                          <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{m.user_nom}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {resume.derniers_mouvements.map((m, i) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span>{getTypeMouvementEmoji(m.type)}</span>
                          <span className="text-xs font-medium">{m.type_label}</span>
                        </div>
                        <span className={`text-sm font-medium ${m.type === 'IN' || m.type === 'RETURN' ? 'text-stock-normal' : 'text-stock-rupture'}`}>
                          {m.type === 'IN' || m.type === 'RETURN' ? '+' : '-'}{m.quantity}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-primary dark:text-[#E4E6E9] truncate pr-2">{m.produit_nom}</span>
                        <span className="text-xs text-text-secondary dark:text-[#8B9199] shrink-0">{formatTime(m.created_at)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* NIVEAU 2 : Categories */}
        {view === 'categories' && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:text-[#E4E6E9] transition-colors"
            >
              <ArrowLeft size={16} />
              Retour au total ({resume?.total_produits_disponibles || 0} produits)
            </button>

            <h2 className="font-heading font-600 text-fluid-lg sm:text-lg">Répartition par catégorie</h2>

            {loadingCat ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {Array.from({length:3}).map((_,i)=><CardSkeleton key={i} />)}
              </div>
            ) : categories.length === 0 ? (
              <EmptyState icon={Package} title="Aucune catégorie" description="Créez des catégories pour organiser vos produits." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {categories.map((cat, i) => (
                  <motion.div
                    key={cat.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4 sm:p-5 cursor-pointer hover:shadow-md active:bg-porcelaine/50 transition-all duration-200 group"
                    onClick={() => handleCategoryClick(cat)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-heading font-600 text-fluid-base sm:text-base">{cat.name}</h3>
                        <p className="text-xs text-text-secondary dark:text-[#8B9199] mt-0.5">{cat.count} produit{cat.count > 1 ? 's' : ''}</p>
                      </div>
                      <ChevronRight size={18} className="text-text-secondary dark:text-[#8B9199] group-hover:translate-x-1 transition-transform" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* NIVEAU 3 : Produits d'une categorie */}
        {view === 'produits' && selectedCat && (
          <motion.div
            key="produits"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-sm text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:text-[#E4E6E9] transition-colors"
            >
              <ArrowLeft size={16} />
              Retour aux catégories
            </button>

            <h2 className="font-heading font-600 text-fluid-lg sm:text-lg">{selectedCat.name} — {catProduits.length} produit{catProduits.length > 1 ? 's' : ''}</h2>

            {loadingCat ? (
              <div className="space-y-3">
                {Array.from({length:3}).map((_,i)=><div key={i} className="h-12 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}
              </div>
            ) : catProduits.length === 0 ? (
              <EmptyState icon={Package} title="Aucun produit" description="Cette catégorie ne contient pas de produit actif." />
            ) : (
              <>
                {/* Desktop table */}
                <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
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
                          className="border-b border-border last:border-0 hover:bg-porcelaine/50 dark:hover:bg-white/[0.05] transition-colors cursor-pointer"
                          onClick={() => openDetail(p)}
                        >
                          <td className="px-6 py-3 text-sm font-medium">{p.name}</td>
                          <td className="px-6 py-3 text-sm">{formatQuantity(p.stock_quantity)}</td>
                          <td className="px-6 py-3 text-sm text-text-secondary dark:text-[#8B9199]">{p.alert_threshold}</td>
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${getStatutColor(p.statut)}`}>
                              {p.statut === 'rupture' ? 'Rupture' : p.statut === 'faible' ? 'Faible' : 'Normal'}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {catProduits.map((p, i) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-4 cursor-pointer active:bg-porcelaine/50 dark:active:bg-white/[0.05] transition-colors"
                      onClick={() => openDetail(p)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate pr-2">{p.name}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge shrink-0 ${getStatutColor(p.statut)}`}>
                          {p.statut === 'rupture' ? 'Rupture' : p.statut === 'faible' ? 'Faible' : 'Normal'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary dark:text-[#8B9199]">Stock: {formatQuantity(p.stock_quantity)}</span>
                        <span className="text-xs text-text-secondary dark:text-[#8B9199]">Seuil: {p.alert_threshold}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={!!detailProduit} onClose={() => { setDetailProduit(null); setStockInfo(null); setMouvements([]); }} title={detailProduit?.name || ''} maxWidth="max-w-2xl">
        {detailProduit && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] dark:text-[#8B9199] mb-1">Catégorie</p>
                <p className="font-medium text-sm">{selectedCat?.name || ''}</p>
              </div>
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] dark:text-[#8B9199] mb-1">Seuil d'alerte</p>
                <p className="font-medium text-sm">{detailProduit.alert_threshold}</p>
              </div>
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] dark:text-[#8B9199] mb-1">Stock actuel</p>
                <p className="font-heading font-700 text-fluid-xl sm:text-xl">{stockInfo?.stock_actuel ?? detailProduit.stock_quantity}</p>
              </div>
              <div className="bg-porcelaine dark:bg-white/[0.05] rounded-button p-3 sm:p-4">
                <p className="text-xs text-text-secondary dark:text-[#8B9199] dark:text-[#8B9199] mb-1">Statut</p>
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
                      <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
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
    </div>
  );
}
