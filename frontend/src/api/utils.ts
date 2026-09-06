export function formatQuantity(q: number): string {
  return q.toLocaleString('fr-FR');
}

export function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('fr-FR');
}

export function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('fr-FR');
}

export function formatTime(d: string): string {
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function getStatutLabel(statut: string): string {
  switch (statut) {
    case 'normal': return 'En stock';
    case 'faible': return 'Stock faible';
    case 'rupture': return 'Rupture';
    default: return statut;
  }
}

export function getStatutColor(statut: string): string {
  switch (statut) {
    case 'normal': return 'bg-emerald-100 text-emerald-800';
    case 'faible': return 'bg-amber-100 text-amber-800';
    case 'rupture': return 'bg-red-100 text-red-800';
    default: return 'bg-slate-100 text-slate-800';
  }
}

export function getTypeMouvementEmoji(type: string): string {
  switch (type) {
    case 'IN': return '📦';
    case 'OUT': return '🛒';
    case 'RETURN': return '🔄';
    case 'AUTRE_SORTIE': return '📤';
    case 'AJUSTEMENT': return '⚙️';
    default: return '📋';
  }
}

export function getTypeMouvementLabel(type: string): string {
  switch (type) {
    case 'IN': return 'Entrée';
    case 'OUT': return 'Vente';
    case 'RETURN': return 'Retour';
    case 'AUTRE_SORTIE': return 'Autre sortie';
    case 'AJUSTEMENT': return 'Ajustement';
    default: return type;
  }
}

export function getTypeMouvementColor(type: string): string {
  switch (type) {
    case 'IN': return 'bg-emerald-100 text-emerald-800';
    case 'OUT': return 'bg-red-100 text-red-800';
    case 'RETURN': return 'bg-blue-100 text-blue-800';
    case 'AUTRE_SORTIE': return 'bg-orange-100 text-orange-800';
    case 'AJUSTEMENT': return 'bg-purple-100 text-purple-800';
    default: return 'bg-slate-100 text-slate-800';
  }
}
