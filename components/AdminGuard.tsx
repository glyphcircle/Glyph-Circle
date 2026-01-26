
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Props {
  children: React.ReactNode;
}

const AdminGuard: React.FC<Props> = ({ children }) => {
  const { user, isAdminVerified, isLoading } = useAuth();
  
  if (isLoading) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
  }

  // 🛡️ DEFINITIVE SECURITY CHECK: Server-verified status only
  if (isAdminVerified) {
      return <>{children}</>;
  }

  console.warn("⛔ AdminGuard: Definitive Access Denied. User lacks server-side admin clearance.");
  return <Navigate to="/login" replace />;
};

export default AdminGuard;
