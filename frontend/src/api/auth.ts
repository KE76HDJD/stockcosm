import api from './client';
import type { LoginRequest, TokenResponse, User, TwoFactorLoginResponse, TwoFactorSetupResponse } from '../types';

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },

  login2fa: async (code: string, tempToken: string): Promise<TokenResponse> => {
    const res = await api.post(`/auth/login/2fa?temp_token=${tempToken}`, { code });
    return res.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  me: async (): Promise<User> => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  updateProfile: async (data: { username: string }): Promise<User> => {
    const res = await api.put('/auth/me', data);
    return res.data;
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<{ message: string }> => {
    const res = await api.put('/auth/me/password', data);
    return res.data;
  },

  uploadPhoto: async (file: File): Promise<{ photo_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/auth/me/photo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  setup2fa: async (): Promise<TwoFactorSetupResponse> => {
    const res = await api.get('/auth/2fa/setup');
    return res.data;
  },

  verify2fa: async (code: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/2fa/verify', { code });
    return res.data;
  },

  disable2fa: async (code: string): Promise<{ message: string }> => {
    const res = await api.post('/auth/2fa/disable', { code });
    return res.data;
  },

  listUsers: async (): Promise<User[]> => {
    const res = await api.get('/auth/users');
    return res.data;
  },

  createUser: async (data: { username: string; password: string; role: string }): Promise<User> => {
    const res = await api.post('/auth/users', data);
    return res.data;
  },

  updateUser: async (id: string, data: { username?: string; role?: string; is_active?: boolean }): Promise<User> => {
    const res = await api.put(`/auth/users/${id}`, data);
    return res.data;
  },

  setupStatus: async (): Promise<{ needs_setup: boolean }> => {
    const res = await api.get('/auth/setup-status');
    return res.data;
  },

  setupAdmin: async (data: { username: string; password: string }): Promise<{ message: string }> => {
    const res = await api.post('/auth/setup', data);
    return res.data;
  },

  register: async (data: { username: string; password: string; role?: string }): Promise<{ message: string; role: string }> => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },
};
