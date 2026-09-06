import api from './client';

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

export const assistantApi = {
  query: async (question: string): Promise<AssistantResponse> => {
    const { data } = await api.post('/assistant/query', { question });
    return data;
  },
};
