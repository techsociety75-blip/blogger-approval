/**
 * Navigation Component
 * Top navigation bar with role-based links
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Navigation({ user, onLogout }) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  const getRoleDisplayName = (role) => {
    const names = {
      admin: 'Admin',
      staff: 'Staff',
      checking: 'Checking',
      finance: 'Finance',
      team_leader: 'Team Leader',
    };
    return names[role] || role;
  };

  const getRoleLink = (role) => {
    return role === 'team_leader' ? '/team-leader' : `/${role}`;
  };

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate(getRoleLink(user.role))}>
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-blue-600 font-bold">
              BA
            </div>
            <span className="font-bold text-lg hidden sm:inline">Blogger Approval</span>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <span className="text-sm font-medium">
              {getRoleDisplayName(user.role)} • {user.username}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <div className="text-sm font-medium">
              {getRoleDisplayName(user.role)} • {user.username}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-left"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
