interface BadgeProps {
  variant: string;
  size?: 'sm' | 'md';
}

const statutColors: Record<string, string> = {
  normal: 'bg-stock-normal/10 text-stock-normal',
  faible: 'bg-stock-faible/10 text-stock-faible',
  critique: 'bg-stock-critique/10 text-stock-critique',
  rupture: 'bg-stock-rupture/10 text-stock-rupture',
  ACTIVE: 'bg-stock-normal/10 text-stock-normal',
  CANCELLED: 'bg-stock-rupture/10 text-stock-rupture',
  INACTIVE: 'bg-gray-100 text-gray-500 dark:bg-white/[0.05] dark:text-[#8B9199]',
};

export function StockBadge({ variant, size = 'sm' }: BadgeProps) {
  const color = statutColors[variant] || 'bg-gray-100 text-gray-600';
  const labels: Record<string, string> = {
    normal: 'Normal',
    faible: 'Faible',
    critique: 'Critique',
    rupture: 'Rupture',
    ACTIVE: 'Actif',
    CANCELLED: 'Annulé',
    INACTIVE: 'Archivé',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-badge ${color} ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
      }`}
    >
      {labels[variant] || variant}
    </span>
  );
}

export function TypeBadge({ type }: { type: string }) {
  const isKit = type === 'KIT';
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${
        isKit ? 'bg-accent/10 text-accent' : 'bg-blue-50 text-blue-600'
      }`}
    >
      {isKit ? 'Kit' : 'Simple'}
    </span>
  );
}

export function MouvementBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    IN: 'bg-stock-normal/10 text-stock-normal',
    OUT: 'bg-stock-rupture/10 text-stock-rupture',
    RETURN: 'bg-stock-faible/10 text-stock-faible',
  };
  const labels: Record<string, string> = {
    IN: 'Entrée',
    OUT: 'Sortie',
    RETURN: 'Retour',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-badge ${colors[type] || ''}`}>
      {labels[type] || type}
    </span>
  );
}
