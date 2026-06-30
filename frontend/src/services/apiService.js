/**
 * API Service
 * Handles all API calls to backend
 */

import axiosInstance from './authService';

export const apiService = {
  // ===== Applications =====
  async submitApplication(data) {
    const response = await axiosInstance.post('/applications', data);
    return response.data.data;
  },

  async getApplications(role = null) {
    const response = await axiosInstance.get('/applications');
    return response.data.data;
  },

  async getApplication(id) {
    const response = await axiosInstance.get(`/applications/${id}`);
    return response.data.data;
  },

  async approveByChecking(id, remarks) {
    const response = await axiosInstance.post(`/applications/${id}/approve`, {
      remarks,
    });
    return response.data.data;
  },

  async approveByFinance(id, approvedBudget, remarks) {
    const response = await axiosInstance.post(`/applications/${id}/finance-approve`, {
      approvedBudget,
      remarks,
    });
    return response.data.data;
  },

  async rejectApplication(id, remarks, source) {
    const response = await axiosInstance.post(`/applications/${id}/reject`, {
      remarks,
      source,
    });
    return response.data.data;
  },

  async escalateApplication(id, reason, teamLeaderId) {
    const response = await axiosInstance.post(`/applications/${id}/escalate`, {
      reason,
      teamLeaderId,
    });
    return response.data.data;
  },

  // ===== Bookings =====
  async getBookings() {
    const response = await axiosInstance.get('/bookings');
    return response.data.data;
  },

  async getBooking(id) {
    const response = await axiosInstance.get(`/bookings/${id}`);
    return response.data.data;
  },

  async extendBooking(id, daysToAdd) {
    const response = await axiosInstance.post(`/bookings/${id}/extend`, {
      daysToAdd,
    });
    return response.data.data;
  },

  async cancelBooking(id, reason) {
    const response = await axiosInstance.post(`/bookings/${id}/cancel`, {
      reason,
    });
    return response.data.data;
  },

  // ===== Admin =====
  async getDashboard() {
    const response = await axiosInstance.get('/admin/dashboard');
    return response.data.data;
  },

  async getUsers(role = null, teamId = null) {
    const params = new URLSearchParams();
    if (role) params.append('role', role);
    if (teamId) params.append('teamId', teamId);
    const response = await axiosInstance.get(`/admin/users?${params}`);
    return response.data.data;
  },

  async createUser(userData) {
    const response = await axiosInstance.post('/admin/users', userData);
    return response.data.data;
  },

  async updateUser(id, updateData) {
    const response = await axiosInstance.put(`/admin/users/${id}`, updateData);
    return response.data.data;
  },

  async deleteUser(id) {
    const response = await axiosInstance.delete(`/admin/users/${id}`);
    return response.data.data;
  },

  async getTeams() {
    const response = await axiosInstance.get('/admin/teams');
    return response.data.data;
  },

  async createTeam(teamData) {
    const response = await axiosInstance.post('/admin/teams', teamData);
    return response.data.data;
  },

  async updateTeam(id, updateData) {
    const response = await axiosInstance.put(`/admin/teams/${id}`, updateData);
    return response.data.data;
  },

  async getAuditLogs(limit = 50, offset = 0) {
    const response = await axiosInstance.get(`/admin/audit-logs?limit=${limit}&offset=${offset}`);
    return response.data.data;
  },

  async getStats(type) {
    const response = await axiosInstance.get(`/admin/stats/${type}`);
    return response.data.data;
  },

  // ===== Reports =====
  async getRoleDashboard() {
    const response = await axiosInstance.get('/reports/dashboard');
    return response.data.data;
  },

  async getTimeline(days = 30) {
    const response = await axiosInstance.get(`/reports/timeline?days=${days}`);
    return response.data.data;
  },

  async getBloggerReport() {
    const response = await axiosInstance.get('/reports/bloggers');
    return response.data.data;
  },

  async getBudgetReport() {
    const response = await axiosInstance.get('/reports/budget');
    return response.data.data;
  },

  async exportData(type = 'applications') {
    const response = await axiosInstance.get(`/reports/export?type=${type}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // ===== Bloggers =====
  async getBloggers() {
    const response = await axiosInstance.get('/bloggers');
    return response.data.data;
  },

  async getBlogger(id) {
    const response = await axiosInstance.get(`/bloggers/${id}`);
    return response.data.data;
  },

  async searchBloggers(query) {
    const response = await axiosInstance.get(`/bloggers/search?q=${query}`);
    return response.data.data;
  },
};

export default apiService;
