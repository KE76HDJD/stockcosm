import api from './client';
import type { DashboardResume, DashboardCategorie, DashboardProduitCategorie, Alerte, StatsJour, StatsMois } from '../types';

export const dashboardApi = {
  getResume: async (): Promise<DashboardResume> => {
    const { data } = await api.get('/dashboard/resume');
    return data;
  },

  getCategories: async (): Promise<DashboardCategorie[]> => {
    const { data } = await api.get('/dashboard/categories');
    return data;
  },

  getProduitsByCategorie: async (categorieId: string): Promise<{ categorie: string; produits: DashboardProduitCategorie[] }> => {
    const { data } = await api.get(`/dashboard/categories/${categorieId}/produits`);
    return data;
  },

  getAlertes: async (): Promise<Alerte[]> => {
    const { data } = await api.get('/dashboard/alertes');
    return data;
  },

  getRupture: async (): Promise<Alerte[]> => {
    const { data } = await api.get('/dashboard/rupture');
    return data;
  },

  getStatsJour: async (date?: string): Promise<StatsJour> => {
    const params = date ? { date_jour: date } : {};
    const { data } = await api.get('/stats/jour', { params });
    return data;
  },

  getStatsMois: async (year?: number, month?: number): Promise<StatsMois> => {
    const params: Record<string, number> = {};
    if (year) params.year = year;
    if (month) params.month = month;
    const { data } = await api.get('/stats/mois', { params });
    return data;
  },
};
