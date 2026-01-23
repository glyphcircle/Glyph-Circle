
import React from 'react';
import { Navigate } from 'react-router-dom';

interface Props {
  children: React.ReactNode;
}

const AdminGuard: React.FC<Props> = ({ children }) => {
  // Check Layer 4: LocalStorage Session
  const sessionStr = localStorage.getItem('glyph_admin_session');
  
  if (!sessionStr) {
      // Redirect to standard Login instead of Master Login to keep Failsafe hidden
      console.warn("⛔ AdminGuard: No session found. Redirecting to Login.");
      return <Navigate to="/login" replace />;
  }

  try {
      const session = JSON.parse(sessionStr);
      if (session.role !== 'admin') {
          throw new Error("Role is not admin");
      }
      console.log(`🔐 AdminGuard: Access Granted via ${session.method}`);
  } catch (e) {
      console.error("⛔ AdminGuard: Invalid session");
      localStorage.removeItem('glyph_admin_session');
      return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AdminGuard;
