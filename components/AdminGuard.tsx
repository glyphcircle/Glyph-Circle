
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

const AdminGuard: React.FC<Props> = ({ children }) => {
  const { user } = useAuth();
  
  // 1. Check Layer: LocalStorage Session (Master Login)
  const sessionStr = localStorage.getItem('glyph_admin_session');
  if (sessionStr) {
      try {
          const session = JSON.parse(sessionStr);
          if (session.role === 'admin') return <>{children}</>;
      } catch (e) {
          localStorage.removeItem('glyph_admin_session');
      }
  }

  // 2. Check Layer: Standard Auth Context (Normal Login with Admin Role)
  if (user?.role === 'admin') {
      return <>{children}</>;
  }

  console.warn("⛔ AdminGuard: Access Denied. User role:", user?.role);
  return <Navigate to="/login" replace />;
};

export default AdminGuard;
