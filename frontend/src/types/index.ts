export interface User {
  id: string;
  username: string;
  role: 'ADMIN' | 'ASSISTANT';
  is_active: boolean;
  created_at: string;
  two_factor_enabled?: boolean;
  profile_photo?: string | null;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  username: string;
}

export interface TwoFactorLoginResponse {
  temp_token: string;
  two_factor_required: boolean;
}

export interface TwoFactorSetupResponse {
  secret: string;
  otpauth_url: string;
  qr_code_base64: string;
}

export interface Categorie {
  id: string;
  name: string;
  product_count: number;
  created_at: string;
}

export interface Produit {
  id: string;
  name: string;
  categorie_id: string;
  categorie_nom: string | null;
  stock_quantity: number;
  alert_threshold: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ProduitStock {
  produit_id: string;
  produit_nom: string;
  stock_actuel: number;
  stock_reel: number;
  alert_threshold: number;
  statut: string;
}

export interface VenteLigne {
  id: string;
  produit_id: string;
  produit_nom: string | null;
  quantity: number;
}

export interface Vente {
  id: string;
  user_id: string;
  user_nom: string | null;
  type: string;
  status: string;
  notes: string | null;
  lignes: VenteLigne[];
  created_at: string;
}

export interface VenteCreate {
  type: string;
  lignes: { produit_id: string; quantity: number }[];
  notes?: string;
}

export interface VenteListResponse {
  ventes: Vente[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Mouvement {
  id: string;
  produit_id: string;
  produit_nom: string | null;
  vente_id: string | null;
  type: string;
  type_label: string;
  quantity: number;
  stock_before: number | null;
  stock_after: number | null;
  user_nom: string | null;
  created_at: string;
}

export interface EntreeCreate {
  produit_id: string;
  quantity: number;
}

export interface SortieCreate {
  produit_id: string;
  quantity: number;
  raison?: string;
}

export interface AjustementCreate {
  produit_id: string;
  nouvelle_quantite: number;
  raison?: string;
}

export interface LigneInventaire {
  produit_id: string;
  produit_nom: string;
  categorie_nom: string;
  stock_ouverture: number;
  entrees: number;
  sorties: number;
  retours: number;
  stock_cloture: number;
  alert_threshold: number;
  statut: string;
}

export interface InventaireJournalier {
  date: string;
  genere_a: string;
  lignes: LigneInventaire[];
  total_sorties: number;
}

export interface DashboardResume {
  total_produits_disponibles: number;
  total_stock_general: number;
  entrees_du_jour: number;
  unites_vendues_du_jour: number;
  ventes_du_jour: number;
  produits_en_alerte: number;
  produits_a_surveiller: Alerte[];
  derniers_mouvements: Mouvement[];
  stock_par_categorie: { id: string; name: string; total_stock: number; product_count: number }[];
}

export interface DashboardCategorie {
  id: string;
  name: string;
  count: number;
}

export interface DashboardProduitCategorie {
  id: string;
  name: string;
  stock_quantity: number;
  alert_threshold: number;
  statut: string;
}

export interface Alerte {
  produit_id: string;
  produit_nom: string;
  stock_actuel: number;
  seuil_alerte?: number;
  jours_estimes?: number;
  statut: string;
}

export interface StatsJour {
  date: string;
  total_sorties: number;
  par_produit: { produit: string; quantite: number }[];
}

export interface StatsMois {
  periode: string;
  total_sorties: number;
  top_produits: { produit: string; quantite: number }[];
}

export interface PaginatedMouvements {
  mouvements: Mouvement[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type AssistantIntent =
  | 'get_stock_produit'
  | 'get_stock_categorie'
  | 'get_alertes'
  | 'get_ventes_jour'
  | 'get_ventes_mois'
  | 'get_top_produit'
  | 'recherche_produit'
  | 'conversation'
  | 'config_missing'
  | 'error'
  | 'unknown';

export interface AssistantResponse {
  intent: AssistantIntent;
  answer: string;
  data: Record<string, unknown> | Array<Record<string, unknown>> | null;
  suggestion: string | null;
}
