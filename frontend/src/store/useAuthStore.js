import { create } from 'zustand';
import { api } from '../services/api';

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', data.token);
      set({
        user: { _id: data._id, name: data.name, email: data.email, role: data.role },
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (name, email, password, role) => {
    set({ isLoading: true });
    try {
      const data = await api.post('/auth/register', { name, email, password, role });
      localStorage.setItem('token', data.token);
      set({
        user: { _id: data._id, name: data.name, email: data.email, role: data.role },
        token: data.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false, isAuthenticated: false, user: null });
      return;
    }

    try {
      const userData = await api.get('/auth/me');
      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      console.error('Session validation failed:', error.message);
      localStorage.removeItem('token');
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    }
  },
}));
