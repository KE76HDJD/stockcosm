import api from './client';
import type { Produit, Categorie, PaginatedMouvements } from '../types';

export const produitsApi = {
  list: async (params?: { search?: string; page?: number; limit?: number }): Promise<Produit[]> => {
    const { data } = await api.get('/produits', { params: params || {} });
    return data;
  },

  get: async (id: string): Promise<Produit> => {
    const { data } = await api.get(`/produits/${id}`);
    return data;
  },

  create: async (produit: { name: string; categorie_id: string; alert_threshold: number }): Promise<Produit> => {
    const { data } = await api.post('/produits', produit);
    return data;
  },

  update: async (id: string, updates: Partial<Produit>): Promise<Produit> => {
    const { data } = await api.put(`/produits/${id}`, updates);
    return data;
  },

  archive: async (id: string): Promise<void> => {
    await api.patch(`/produits/${id}/archive`);
  },

  getMouvements: async (id: string, page?: number, limit?: number): Promise<PaginatedMouvements> => {
    const params: Record<string, any> = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;
    const { data } = await api.get(`/produits/${id}/mouvements`, { params });
    return data;
  },
};

export const categoriesApi = {
  list: async (): Promise<Categorie[]> => {
    const { data } = await api.get('/categories');
    return data;
  },

  create: async (name: string): Promise<Categorie> => {
    const { data } = await api.post('/categories', { name });
    return data;
  },

  getProduits: async (id: string): Promise<{ categorie: string; produits: Produit[] }> => {
    const { data } = await api.get(`/categories/${id}/produits`);
    return data;
  },
};

export const ventesApi = {
  list: async (params?: { date_from?: string; date_to?: string; user_id?: string; page?: number; limit?: number }) => {
    const { data } = await api.get('/ventes', { params: params || {} });
    return data;
  },

  get: async (id: string) => {
    const { data } = await api.get(`/ventes/${id}`);
    return data;
  },

  create: async (vente: { type: string; lignes: { produit_id: string; quantity: number }[]; notes?: string }) => {
    const { data } = await api.post('/ventes', vente);
    return data;
  },

  annuler: async (id: string) => {
    const { data } = await api.post(`/ventes/${id}/annuler`);
    return data;
  },
};

export const stockApi = {
  entrer: async (entree: { produit_id: string; quantity: number }) => {
    const { data } = await api.post('/entrees', entree);
    return data;
  },

  listEntrees: async (): Promise<any[]> => {
    const { data } = await api.get('/entrees');
    return data;
  },

  sortir: async (sortie: { produit_id: string; quantity: number; raison?: string }) => {
    const { data } = await api.post('/sorties', sortie);
    return data;
  },

  ajuster: async (ajustement: { produit_id: string; nouvelle_quantite: number; raison?: string }) => {
    const { data } = await api.post('/ajustements', ajustement);
    return data;
  },

  listMouvements: async (params?: {
    produit_id?: string;
    type?: string;
    user_id?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
  }) => {
    const { data } = await api.get('/mouvements', { params: params || {} });
    return data;
  },
};

export const inventaireApi = {
  getQuotidien: async (date?: string) => {
    const params = date ? { date_jour: date } : {};
    const { data } = await api.get('/inventaire/quotidien', { params });
    return data;
  },

  downloadPdf: async (date?: string): Promise<Blob> => {
    const params = date ? { date_jour: date, format: 'pdf' } : { format: 'pdf' };
    const { data } = await api.get('/inventaire/quotidien', {
      params,
      responseType: 'blob',
    });
    return data;
  },
};
