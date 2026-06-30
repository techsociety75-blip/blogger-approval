/**
 * Checking Department Dashboard
 * Review and approve/reject applications
 */

import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, XCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CheckingDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

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
        <h1 className="text-4xl font-bold text-gray-900">Checking Department</h1>
        <p className="text-gray-600 mt-2">Review Applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard
          icon={<FileText className="w-8 h-8" />}
          label="Pending Review"
          value={dashboard?.pendingForChecking || 0}
          color="yellow"
        />
        <StatsCard
          icon={<CheckCircle className="w-8 h-8" />}
          label="Approved This Month"
          value={dashboard?.approvedThisMonth || 0}
          color="green"
        />
        <StatsCard
          icon={<XCircle className="w-8 h-8" />}
          label="Rejected This Month"
          value={dashboard?.rejectedThisMonth || 0}
          color="red"
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200 p-4 flex gap-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded ${
              activeTab === 'pending'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending Applications
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded ${
              activeTab === 'history'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Review History
          </button>
        </div>

        <div className="p-6 min-h-96">
          {activeTab === 'pending' && (
            <div>
              <h3 className="font-semibold mb-4">Pending Applications</h3>
              <p className="text-gray-600">No pending applications</p>
            </div>
          )}

          {activeTab === 'history' && (
            <div>
              <h3 className="font-semibold mb-4">Review History</h3>
              <p className="text-gray-600">No reviews completed</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
