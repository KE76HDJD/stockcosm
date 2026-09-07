import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, X, Package, Check } from 'lucide-react';
import type { Produit } from '../types';

interface ProductSelectProps {
  value: string;
  onChange: (value: string) => void;
  produits: Produit[];
  placeholder?: string;
  showAllOption?: boolean;
  allOptionLabel?: string;
}

const statutConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  normal: { bg: 'bg-stock-normal/8', text: 'text-stock-normal', dot: 'bg-stock-normal', label: 'Normal' },
  faible: { bg: 'bg-stock-faible/8', text: 'text-stock-faible', dot: 'bg-stock-faible', label: 'Faible' },
  critique: { bg: 'bg-stock-critique/8', text: 'text-stock-critique', dot: 'bg-stock-critique', label: 'Critique' },
  rupture: { bg: 'bg-stock-rupture/8', text: 'text-stock-rupture', dot: 'bg-stock-rupture', label: 'Rupture' },
};

function getStatut(produit: Produit): string {
  if (produit.stock_quantity <= 0) return 'rupture';
  if (produit.stock_quantity <= produit.alert_threshold) return 'faible';
  return 'normal';
}

const categoryColors: Record<string, string> = {
  'Savons': 'from-amber-500/10 to-orange-500/5 border-l-amber-500',
  'Laits et Teints': 'from-rose-500/10 to-pink-500/5 border-l-rose-500',
  'Beurres': 'from-yellow-500/10 to-amber-500/5 border-l-yellow-500',
  'Gels Douche': 'from-cyan-500/10 to-blue-500/5 border-l-cyan-500',
  'Huiles': 'from-emerald-500/10 to-green-500/5 border-l-emerald-500',
  'Cremes Visage': 'from-purple-500/10 to-violet-500/5 border-l-purple-500',
  'Pommades': 'from-rose-400/10 to-red-500/5 border-l-rose-400',
};

function getCategoryColor(name: string): string {
  for (const [key, val] of Object.entries(categoryColors)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 'from-gray-500/10 to-gray-400/5 border-l-gray-400';
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
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

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
    const sorted = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    return sorted;
  }, [filteredProduits]);

  const flatList = useMemo(() => {
    const items: { type: 'all' | 'category' | 'product'; id: string; label: string; produit?: Produit; category?: string }[] = [];
    if (showAllOption) {
      items.push({ type: 'all', id: '', label: allOptionLabel });
    }
    for (const [cat, prods] of groupedProduits) {
      items.push({ type: 'category', id: `cat-${cat}`, label: cat });
      for (const p of prods) {
        items.push({ type: 'product', id: p.id, label: p.name, produit: p, category: cat });
      }
    }
    return items;
  }, [groupedProduits, showAllOption, allOptionLabel]);

  const selectableItems = flatList.filter((item) => item.type !== 'category');

  const updatePosition = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 6,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(0);
      setSearch('');
      updatePosition();
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inDropdown = document.querySelector('[data-ps-dropdown]')?.contains(target);
      if (!inTrigger && !inDropdown) setIsOpen(false);
    };
    const handleScroll = () => { if (isOpen) updatePosition(); };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, updatePosition]);

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

  const triggerButton = (
    <button
      type="button"
      onClick={() => setIsOpen(!isOpen)}
      onKeyDown={handleKeyDown}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-porcelaine dark:bg-white/[0.05] border rounded-button text-sm text-left transition-all duration-200 ${
        isOpen
          ? 'border-accent dark:border-[#3ECF8E]/40 ring-2 ring-accent/20 shadow-sm'
          : 'border-border dark:border-white/[0.08] hover:border-accent/30 dark:hover:border-white/[0.15] hover:shadow-sm'
      } ${selectedProduit ? 'dark:text-[#E4E6E9]' : 'text-text-secondary dark:text-[#8B9199]'}`}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Package size={14} className="shrink-0 text-text-secondary dark:text-[#8B9199]" />
        {selectedProduit ? (
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate font-medium">{selectedProduit.name}</span>
            <span className="text-xs text-text-secondary dark:text-[#8B9199] hidden sm:inline">({selectedProduit.stock_quantity})</span>
          </div>
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
            className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/[0.1] cursor-pointer transition-colors"
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
  );

  const dropdown = isOpen ? createPortal(
    <div
      data-ps-dropdown
      style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
    >
      <div className="bg-white dark:bg-[#1C1F22] border border-border dark:border-white/[0.08] rounded-card shadow-xl overflow-hidden">
        <div className="p-2.5 border-b border-border dark:border-white/[0.08]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary dark:text-[#8B9199]" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher par nom ou catégorie..."
              className="w-full pl-9 pr-3 py-2 bg-porcelaine dark:bg-white/[0.05] border border-border dark:border-white/[0.08] rounded-button text-sm dark:text-[#E4E6E9] dark:placeholder:text-[#8B9199]/50 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent/40 transition-all"
            />
          </div>
        </div>

        <div ref={listRef} className="max-h-80 overflow-y-auto overscroll-contain">
          {selectableItems.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Package size={24} className="mx-auto mb-2 text-text-secondary/30 dark:text-[#8B9199]/30" />
              <p className="text-sm text-text-secondary dark:text-[#8B9199]">Aucun produit trouvé</p>
            </div>
          )}

          {showAllOption && !search && flatList[0]?.type === 'all' && (
            <button
              type="button"
              onClick={() => handleSelect('')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all border-b border-border dark:border-white/[0.05] ${
                value === ''
                  ? 'bg-accent/5 dark:bg-[#3ECF8E]/5 text-accent dark:text-[#3ECF8E]'
                  : 'hover:bg-porcelaine/60 dark:hover:bg-white/[0.04]'
              }`}
            >
              <div className="w-8 h-8 rounded-button bg-porcelaine dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                <Package size={14} className="text-text-secondary dark:text-[#8B9199]" />
              </div>
              <span className="font-medium">{allOptionLabel}</span>
            </button>
          )}

          {groupedProduits.map(([catName, catProduits]) => (
            <div key={catName}>
              <div className={`flex items-center justify-between px-4 py-2 bg-gradient-to-r ${getCategoryColor(catName)} border-l-[3px]`}>
                <span className="text-[11px] font-semibold text-text-secondary dark:text-[#8B9199] uppercase tracking-wider">{catName}</span>
                <span className="text-[10px] font-medium text-text-secondary/60 dark:text-[#8B9199]/60 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded-full">{catProduits.length}</span>
              </div>
              {catProduits.map((p) => {
                selectableIndex++;
                const isSelected = value === p.id;
                const isHighlighted = highlightedIndex === selectableIndex;
                const statut = getStatut(p);
                const config = statutConfig[statut];

                return (
                  <button
                    key={p.id}
                    type="button"
                    data-highlighted={isHighlighted}
                    onClick={() => handleSelect(p.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all duration-150 border-b border-border/50 dark:border-white/[0.03] last:border-0 ${
                      isSelected
                        ? 'bg-accent/5 dark:bg-[#3ECF8E]/5'
                        : isHighlighted
                        ? 'bg-porcelaine/80 dark:bg-white/[0.06]'
                        : 'hover:bg-porcelaine/40 dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-button flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-accent dark:bg-[#3ECF8E] text-white'
                        : `${config.bg} ${config.text}`
                    }`}>
                      {isSelected ? (
                        <Check size={16} />
                      ) : (
                        <span className="text-xs font-bold">{p.stock_quantity}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium truncate ${isSelected ? 'text-accent dark:text-[#3ECF8E]' : 'text-text-primary dark:text-[#E4E6E9]'}`}>{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] ${config.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`}></span>
                          {config.label}
                        </span>
                        {statut !== 'rupture' && (
                          <span className="text-[11px] text-text-secondary/50 dark:text-[#8B9199]/50">·</span>
                        )}
                        {statut !== 'rupture' && (
                          <span className="text-[11px] text-text-secondary dark:text-[#8B9199]">Seuil: {p.alert_threshold}</span>
                        )}
                      </div>
                    </div>
                    {isSelected && (
                      <Check size={16} className="text-accent dark:text-[#3ECF8E] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div ref={containerRef} className="relative">
      {triggerButton}
      {dropdown}
    </div>
  );
}
