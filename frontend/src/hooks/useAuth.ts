import { create } from 'zustand';
import type { User } from '../types';
import { authApi } from '../api/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  tempToken: string | null;
  twoFactorRequired: boolean;
  init: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  login2fa: (code: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  tempToken: null,
  twoFactorRequired: false,

  init: async () => {
    await useAuthStore.getState().fetchUser();
  },

  login: async (username: string, password: string) => {
    const res = await authApi.login({ username, password });

    if ('two_factor_required' in res && res.two_factor_required) {
      set({ tempToken: (res as any).temp_token, twoFactorRequired: true });
      return;
    }

    set({ tempToken: null, twoFactorRequired: false });
    await useAuthStore.getState().fetchUser();
  },

  login2fa: async (code: string) => {
    const state = useAuthStore.getState();
    if (!state.tempToken) throw new Error('Session expirée, reconnectez-vous');
    await authApi.login2fa(code, state.tempToken);
    set({ tempToken: null, twoFactorRequired: false });
    await useAuthStore.getState().fetchUser();
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    set({ user: null, isAuthenticated: false, tempToken: null, twoFactorRequired: false });
  },

  fetchUser: async () => {
    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
