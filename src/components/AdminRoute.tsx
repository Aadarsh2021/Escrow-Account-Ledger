import React from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { Navigate } from 'react-router-dom';
import { GlobalLoader } from './ui/GlobalLoader';

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { isAdminAuthenticated, isInitializing } = useAdmin();

  if (isInitializing) {
    return <GlobalLoader fullScreen={true} />;
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
