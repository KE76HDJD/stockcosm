import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, Package } from 'lucide-react';
import type { Produit } from '../types';

interface ProductSelectProps {
  value: string;
  onChange: (value: string) => void;
  produits: Produit[];
  placeholder?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

const statutConfig: Record<string, { color: string; label: string }> = {
  normal: { color: 'bg-stock-normal/10 text-stock-normal', label: 'Normal' },
  faible: { color: 'bg-stock-faible/10 text-stock-faible', label: 'Faible' },
  critique: { color: 'bg-stock-critique/10 text-stock-critique', label: 'Critique' },
  rupture: { color: 'bg-stock-rupture/10 text-stock-rupture', label: 'Rupture' },
};

function getStatut(produit: Produit): string {
  if (produit.stock_quantity <= 0) return 'rupture';
  if (produit.stock_quantity <= produit.alert_threshold) return 'faible';
  return 'normal';
}

export function ProductSelect({
  value,
  onChange,
  produits,
  placeholder = 'Rechercher un produit...',
  showAllOption = false,
  allOptionLabel = 'Tous les produits',
}: ProductSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedProduit = produits.find((p) => p.id === value);

  const filteredProduits = useMemo(() => {
    if (!search) return produits;
    const q = search.toLowerCase();
    return produits.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.categorie_nom && p.categorie_nom.toLowerCase().includes(q))
    );
  }, [produits, search]);

  const groupedProduits = useMemo(() => {
    const groups: Record<string, Produit[]> = {};
    for (const p of filteredProduits) {
      const cat = p.categorie_nom || 'Sans catégorie';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    }
    return groups;
  }, [filteredProduits]);

  const flatList = useMemo(() => {
    const items: { type: 'all' | 'category' | 'product'; id: string; label: string; produit?: Produit; category?: string }[] = [];
    if (showAllOption) {
      items.push({ type: 'all', id: '', label: allOptionLabel });
    }
    for (const [cat, prods] of Object.entries(groupedProduits)) {
      items.push({ type: 'category', id: `cat-${cat}`, label: cat });
      for (const p of prods) {
        items.push({ type: 'product', id: p.id, label: p.name, produit: p, category: cat });
      }
    }
    return items;
  }, [groupedProduits, showAllOption, allOptionLabel]);

  const selectableItems = flatList.filter((item) => item.type !== 'category');

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.min(prev + 1, selectableItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectableItems[highlightedIndex]) {
          handleSelect(selectableItems[highlightedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearch('');
  };

  useEffect(() => {
    const highlighted = listRef.current?.querySelector('[data-highlighted="true"]');
    if (highlighted) {
      highlighted.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  let selectableIndex = -1;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border rounded-button text-sm text-left transition-colors ${
          isOpen
            ? 'border-accent dark:border-[#3ECF8E]/40 ring-2 ring-accent/20'
            : 'border-border dark:border-white/[0.08] hover:border-border dark:hover:border-white/[0.15]'
        } ${selectedProduit ? 'dark:text-[#E4E6E9]' : 'text-text-secondary dark:text-[#8B9199]'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Package size={14} className="shrink-0 text-text-secondary dark:text-[#8B9199]" />
          {selectedProduit ? (
            <span className="truncate">{selectedProduit.name}</span>
          ) : (
            <span className="truncate">{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectedProduit && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/[0.1] cursor-pointer"
            >
              <X size={12} className="text-text-secondary dark:text-[#8B9199]" />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-text-secondary dark:text-[#8B9199] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute z-[60] mt-1 w-full bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-card shadow-lg overflow-hidden">
          <div className="p-2 border-b border-border dark:border-white/[0.08]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199]" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Filtrer par nom ou catégorie..."
                className="w-full pl-8 pr-3 py-2 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
              />
            </div>
          </div>

          <div ref={listRef} className="max-h-60 overflow-y-auto">
            {selectableItems.length === 0 && (
              <div className="px-3 py-4 text-center text-sm text-text-secondary dark:text-[#8B9199]">
                Aucun produit trouvé
              </div>
            )}

            {flatList.map((item) => {
              if (item.type === 'category') {
                return (
                  <div
                    key={item.id}
                    className="px-3 py-1.5 text-xs font-medium text-text-secondary dark:text-[#8B9199] uppercase tracking-wide bg-porcelaine/50 dark:bg-white/[0.03] border-b border-border dark:border-white/[0.05]"
                  >
                    {item.label}
                  </div>
                );
              }

              selectableIndex++;
              const isSelected = item.type === 'all' ? value === '' : value === item.id;
              const isHighlighted = highlightedIndex === selectableIndex;
              const produit = item.produit;
              const statut = produit ? getStatut(produit) : null;
              const config = statut ? statutConfig[statut] : null;

              return (
                <button
                  key={item.id || 'all'}
                  type="button"
                  data-highlighted={isHighlighted}
                  onClick={() => handleSelect(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm text-left transition-colors ${
                    isSelected
                      ? 'bg-accent/5 dark:bg-[#3ECF8E]/5 text-accent dark:text-[#3ECF8E]'
                      : isHighlighted
                      ? 'bg-porcelaine dark:bg-white/[0.05]'
                      : 'hover:bg-porcelaine/50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {produit && (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {config && (
                          <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-badge shrink-0 ${config.color}`}>
                            {config.label}
                          </span>
                        )}
                      </div>
                    )}
                    {!produit && <span className="truncate font-medium">{item.label}</span>}
                  </div>
                  {produit && (
                    <span className={`text-xs font-medium shrink-0 ${statut === 'rupture' ? 'text-stock-rupture' : 'text-text-secondary dark:text-[#8B9199]'}`}>
                      {produit.stock_quantity} en stock
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
