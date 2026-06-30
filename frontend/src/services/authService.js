/**
 * Authentication Service
 * Handles login, logout, token refresh, and user data
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const axiosInstance = axios.create({
  baseURL: API_BASE,
});

// Add authorization header to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', response.data.data.accessToken);
        axiosInstance.defaults.headers.common.Authorization = `Bearer ${response.data.data.accessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  /**
   * Login with username and password
   */
  async login(username, password) {
    try {
      const response = await axiosInstance.post('/auth/login', {
        username,
        password,
      });

      const { accessToken, refreshToken, user } = response.data.data;
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      return user;
    } catch (error) {
      throw error.response?.data?.error || { message: 'Login failed' };
    }
  },

  /**
   * Get current user info
   */
  async getCurrentUser() {
    try {
      const response = await axiosInstance.get('/auth/me');
      return response.data.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * Logout
   */
  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  },

  /**
   * Get axios instance for API calls
   */
  getAxios() {
    return axiosInstance;
  },
};

export default axiosInstance;
