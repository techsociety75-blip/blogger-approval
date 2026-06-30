/**
 * Staff Dashboard
 * Submit applications, view bookings, check blogger availability
 */

import React, { useState, useEffect } from 'react';
import { FileText, Users, Calendar, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';
import StatsCard from '../components/StatsCard';
import LoadingSpinner from '../components/LoadingSpinner';

export default function StaffDashboard() {
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
        <h1 className="text-4xl font-bold text-gray-900">Staff Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage Applications & Bookings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatsCard
          icon={<FileText className="w-8 h-8" />}
          label="My Applications"
          value={dashboard?.submittedApplications || 0}
          color="blue"
        />
        <StatsCard
          icon={<Calendar className="w-8 h-8" />}
          label="My Bookings"
          value={dashboard?.activeBookings || 0}
          color="green"
        />
        <StatsCard
          icon={<Users className="w-8 h-8" />}
          label="Available Bloggers"
          value={dashboard?.availableBloggers || 0}
          color="purple"
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
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('submit')}
            className={`px-4 py-2 rounded ${
              activeTab === 'submit'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Submit Application
          </button>
          <button
            onClick={() => setActiveTab('applications')}
            className={`px-4 py-2 rounded ${
              activeTab === 'applications'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            My Applications
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
          {activeTab === 'overview' && (
            <div>
              <h3 className="font-semibold mb-4">Your Overview</h3>
              <div className="space-y-4">
                <p className="text-gray-600">
                  Welcome to your staff dashboard. Here you can:
                </p>
                <ul className="list-disc list-inside text-gray-600 space-y-2">
                  <li>Submit applications for bloggers</li>
                  <li>View the status of your submissions</li>
                  <li>See your active bookings (7-day exclusive access)</li>
                  <li>Check blogger availability</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'submit' && (
            <div>
              <h3 className="font-semibold mb-4">Submit New Application</h3>
              <p className="text-gray-600 mb-4">Select a blogger to start a new application</p>
              {/* Application form would go here */}
            </div>
          )}

          {activeTab === 'applications' && (
            <div>
              <h3 className="font-semibold mb-4">My Applications</h3>
              <p className="text-gray-600">No applications submitted yet</p>
            </div>
          )}

          {activeTab === 'bookings' && (
            <div>
              <h3 className="font-semibold mb-4">Active Bookings</h3>
              <p className="text-gray-600">You have no active bookings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
