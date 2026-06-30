/**
 * Admin Dashboard
 * System overview, user management, team management, analytics
 */

import React, { useState, useEffect } from 'react';
import { Users, Team, FileText, TrendingUp, Settings } from 'lucide-react';
import { apiService } from '../services/apiService';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await apiService.getDashboard();
      setDashboard(data);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">System Overview & Management</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard
          icon={<Users className="w-8 h-8" />}
          label="Total Users"
          value={dashboard?.users || 0}
          color="blue"
        />
        <StatsCard
          icon={<FileText className="w-8 h-8" />}
          label="Applications"
          value={dashboard?.applications || 0}
          color="green"
        />
        <StatsCard
          icon={<TrendingUp className="w-8 h-8" />}
          label="Active Bookings"
          value={dashboard?.bookings || 0}
          color="purple"
        />
        <StatsCard
          icon={<Team className="w-8 h-8" />}
          label="Bloggers"
          value={dashboard?.bloggers || 0}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 p-4 flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded ${
              activeTab === 'overview'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded ${
              activeTab === 'users'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-4 py-2 rounded ${
              activeTab === 'teams'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Teams
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded ${
              activeTab === 'audit'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Audit Logs
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Approved Applications</p>
                  <p className="text-2xl font-bold text-green-600">{dashboard?.approvedApplications || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Pending Applications</p>
                  <p className="text-2xl font-bold text-yellow-600">{dashboard?.pendingApplications || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Rejected Applications</p>
                  <p className="text-2xl font-bold text-red-600">{dashboard?.rejectedApplications || 0}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded">
                  <p className="text-sm text-gray-600">Blacklisted Bloggers</p>
                  <p className="text-2xl font-bold text-red-600">{dashboard?.blacklistedBloggers || 0}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h3 className="font-semibold mb-4">User Management</h3>
              <p className="text-gray-600">Click "Edit Users" to manage system users</p>
            </div>
          )}

          {activeTab === 'teams' && (
            <div>
              <h3 className="font-semibold mb-4">Team Management</h3>
              <p className="text-gray-600">Click "Edit Teams" to manage teams and budgets</p>
            </div>
          )}

          {activeTab === 'audit' && (
            <div>
              <h3 className="font-semibold mb-4">Audit Trail</h3>
              <p className="text-gray-600">View all system audit logs here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
