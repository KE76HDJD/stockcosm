import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { inventaireApi } from '../api/produits';
import { useLoading } from '../hooks/useLoading';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { formatQuantity } from '../api/utils';
import type { InventaireJournalier } from '../types';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + n);
  return date.toISOString().split('T')[0];
}

export function InventairePage() {
  const { isLoading, error, withLoading } = useLoading(true);
  const [date, setDate] = useState(todayISO());
  const [inventaire, setInventaire] = useState<InventaireJournalier | null>(null);
  const [downloading, setDownloading] = useState(false);

  const load = (d: string) => withLoading(async () => {
    const inv = await inventaireApi.getQuotidien(d);
    setInventaire(inv);
  });

  useEffect(() => { load(date); }, []);

  const handleDateChange = (d: string) => {
    setDate(d);
    load(d);
  };

  const goToPreviousDay = () => {
    const prev = addDays(date, -1);
    setDate(prev);
    load(prev);
  };

  const goToNextDay = () => {
    const next = addDays(date, 1);
    if (next <= todayISO()) {
      setDate(next);
      load(next);
    }
  };

  const isToday = date === todayISO();
  const produitsConcernes = inventaire?.lignes.filter((l) => l.sorties > 0).length || 0;

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await inventaireApi.downloadPdf(date);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventaire_${date}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Erreur lors du téléchargement du PDF');
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) return <div className="space-y-4">{Array.from({length:4}).map((_,i)=><div key={i} className="h-16 bg-gray-200 dark:bg-white/[0.05] rounded animate-pulse" />)}</div>;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-heading font-700 text-fluid-2xl sm:text-2xl">Historique</h1>
          <p className="text-text-secondary dark:text-[#8B9199] text-fluid-sm sm:text-sm mt-1">Consultez les sorties jour par jour</p>
        </div>
        <Button onClick={handleDownloadPdf} loading={downloading} variant="secondary" className="w-full sm:w-auto">
          <Download size={16} />
          Télécharger PDF
        </Button>
      </div>

      {/* Navigation jour par jour */}
      <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={goToPreviousDay}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] hover:bg-porcelaine dark:hover:bg-white/[0.05] rounded-button transition-colors"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Jour précédent</span>
            <span className="sm:hidden">Préc.</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <Calendar size={14} className="text-text-secondary dark:text-[#8B9199] shrink-0" />
            <div className="text-center min-w-0">
              <p className="font-heading font-600 text-fluid-sm sm:text-base truncate">{formatDisplayDate(date)}</p>
              {isToday && <p className="text-xs text-accent dark:text-[#3ECF8E] font-medium">Aujourd'hui</p>}
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="px-2 sm:px-3 py-2 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-xs sm:text-sm shrink-0"
            />
          </div>

          <button
            onClick={goToNextDay}
            disabled={isToday}
            className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 text-xs sm:text-sm text-text-secondary dark:text-[#8B9199] hover:text-text-primary dark:hover:text-[#E4E6E9] hover:bg-porcelaine dark:hover:bg-white/[0.05] rounded-button transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="hidden sm:inline">Jour suivant</span>
            <span className="sm:hidden">Suiv.</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {error && (
        <ErrorState
          message={error}
          onRetry={() => load(date)}
        />
      )}

      {!error && inventaire && inventaire.lignes.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Aucune sortie ce jour-là"
          description="Aucun mouvement de sortie enregistré pour cette date. Le stock est stable pour tous les produits."
        />
      )}

      {!error && inventaire && inventaire.lignes.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3 sm:p-5">
              <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Total sorties</p>
              <p className="font-heading font-700 text-fluid-xl sm:text-xl">{inventaire.total_sorties} sortie{inventaire.total_sorties > 1 ? 's' : ''}</p>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3 sm:p-5">
              <p className="text-xs text-text-secondary dark:text-[#8B9199] mb-1">Produits concernés</p>
              <p className="font-heading font-700 text-fluid-xl sm:text-xl">{produitsConcernes} produit{produitsConcernes > 1 ? 's' : ''}</p>
            </motion.div>
          </div>

          {/* Desktop table */}
          <div className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] overflow-hidden hidden sm:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border dark:border-white/[0.08]">
                  <th className="text-left px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Produit</th>
                  <th className="text-center px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Sorties</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase">Stock restant</th>
                </tr>
              </thead>
              <tbody>
                {inventaire.lignes
                  .filter((l) => l.sorties > 0)
                  .map((l, i) => (
                  <motion.tr
                    key={l.produit_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border dark:border-white/[0.08] last:border-0 hover:bg-porcelaine/50 dark:hover:bg-white/[0.05] transition-colors"
                  >
                    <td className="px-6 py-3 text-sm font-medium">{l.produit_nom}</td>
                    <td className="px-6 py-3 text-sm text-stock-rupture text-center font-medium">{l.sorties}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-right">{formatQuantity(l.stock_cloture)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 sm:hidden">
            {inventaire.lignes
              .filter((l) => l.sorties > 0)
              .map((l, i) => (
              <motion.div
                key={l.produit_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white dark:bg-[#1C1F22] rounded-card border border-border dark:border-white/[0.08] p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium truncate pr-2">{l.produit_nom}</span>
                  <span className="text-sm font-medium text-stock-rupture shrink-0">{l.sorties}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary dark:text-[#8B9199]">Stock restant</span>
                  <span className="text-sm font-semibold">{formatQuantity(l.stock_cloture)}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
