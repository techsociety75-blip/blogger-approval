/**
 * Protected Route Component
 * Ensures only authenticated users with correct role can access
 */

import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, requiredRole }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Normalize role comparison (team_leader vs team-leader)
  const userRole = user.role;
  const normalizedRequired = requiredRole === 'team-leader' ? 'team_leader' : requiredRole;
  const normalizedUser = userRole === 'team-leader' ? 'team_leader' : userRole;

  if (normalizedUser !== normalizedRequired && requiredRole !== 'all') {
    return <Navigate to={`/${normalizedUser === 'team_leader' ? 'team-leader' : normalizedUser}`} />;
  }

  return children;
}
