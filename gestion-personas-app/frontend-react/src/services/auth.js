import { authApi } from './api';

export const authService = {
  async login(credentials) {
    const response = await authApi.login(credentials);
    if (response.token) {
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  },

  async logout() {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('session_notifications');
      sessionStorage.clear();
    }
  },

  async register(userData) {
    return authApi.register(userData);
  },

  async validateToken() {
    return authApi.validateToken();
  },

  isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getToken() {
    return localStorage.getItem('token');
  }
};
