/**
 * Team Leader Dashboard
 * Team performance, escalations, analytics
 */

import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function TeamLeaderDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await apiService.getRoleDashboard();
      setDashboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Team Leader Dashboard</h1>
        <p className="text-gray-600 mt-2">Team Performance & Escalations</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard
          icon={<Users className="w-8 h-8" />}
          label="Team Members"
          value={dashboard?.teamMembers || 0}
          color="blue"
        />
        <StatsCard
          icon={<TrendingUp className="w-8 h-8" />}
          label="Team Success Rate"
          value={`${dashboard?.teamSuccessRate || 0}%`}
          color="green"
        />
        <StatsCard
          icon={<AlertCircle className="w-8 h-8" />}
          label="Escalations Pending"
          value={dashboard?.escalationsPending || 0}
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
            Team Overview
          </button>
          <button
            onClick={() => setActiveTab('escalations')}
            className={`px-4 py-2 rounded ${
              activeTab === 'escalations'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Escalations
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 rounded ${
              activeTab === 'performance'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Performance Analytics
          </button>
        </div>

        <div className="p-6 min-h-96">
          {activeTab === 'overview' && (
            <div>
              <h3 className="font-semibold mb-4">Team Overview</h3>
              <p className="text-gray-600">View team member performance and metrics</p>
            </div>
          )}

          {activeTab === 'escalations' && (
            <div>
              <h3 className="font-semibold mb-4">Escalated Applications</h3>
              <p className="text-gray-600">Review and resolve escalations for your team</p>
            </div>
          )}

          {activeTab === 'performance' && (
            <div>
              <h3 className="font-semibold mb-4">Team Performance</h3>
              <p className="text-gray-600">Analytics and trends for your team</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
