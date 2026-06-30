/**
 * Blogger Approval System - Frontend
 * Main Application Component with Routing
 */

import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './contexts/AuthContext';
import { authService } from './services/authService';

// Pages
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import CheckingDashboard from './pages/CheckingDashboard';
import FinanceDashboard from './pages/FinanceDashboard';
import TeamLeaderDashboard from './pages/TeamLeaderDashboard';

// Components
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      <Router>
        {user && <Navigation user={user} onLogout={handleLogout} />}
        <Routes>
          <Route
            path="/login"
            element={user ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />}
          />

          {/* Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/staff"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/checking"
            element={
              <ProtectedRoute requiredRole="checking">
                <CheckingDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/finance"
            element={
              <ProtectedRoute requiredRole="finance">
                <FinanceDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/team-leader"
            element={
              <ProtectedRoute requiredRole="team_leader">
                <TeamLeaderDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              user ? (
                <Navigate
                  to={`/${user.role === 'team_leader' ? 'team-leader' : user.role}`}
                />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
