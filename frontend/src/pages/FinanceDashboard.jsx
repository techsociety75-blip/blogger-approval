/**
 * Finance Department Dashboard
 * Review checking-approved applications, approve/reject, manage budget
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, FileText, TrendingUp } from 'lucide-react';
import { apiService } from '../services/apiService';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function FinanceDashboard() {
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
        <h1 className="text-4xl font-bold text-gray-900">Finance Department</h1>
        <p className="text-gray-600 mt-2">Approve Applications & Manage Budget</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard
          icon={<FileText className="w-8 h-8" />}
          label="Pending Approval"
          value={dashboard?.pendingForFinance || 0}
          color="yellow"
        />
        <StatsCard
          icon={<DollarSign className="w-8 h-8" />}
          label="Total Budget Allocated"
          value={`₨${dashboard?.totalBudgetAllocated || 0}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          color="green"
        />
        <StatsCard
          icon={<TrendingUp className="w-8 h-8" />}
          label="Active Bookings Created"
          value={dashboard?.activeBookingsCreated || 0}
          color="blue"
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
            Ready for Approval
          </button>
          <button
            onClick={() => setActiveTab('budget')}
            className={`px-4 py-2 rounded ${
              activeTab === 'budget'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Budget Status
          </button>
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded ${
              activeTab === 'bookings'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Bookings
          </button>
        </div>

        <div className="p-6 min-h-96">
          {activeTab === 'pending' && (
            <div>
              <h3 className="font-semibold mb-4">Applications Ready for Approval</h3>
              <p className="text-gray-600">Finance approval creates automatic 7-day booking</p>
            </div>
          )}

          {activeTab === 'budget' && (
            <div>
              <h3 className="font-semibold mb-4">Budget Utilization</h3>
              <p className="text-gray-600">Team budget allocation and spending</p>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              <h3 className="font-semibold mb-4">Active Bookings</h3>
              <p className="text-gray-600">7-day exclusive blogger bookings created by finance approvals</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
