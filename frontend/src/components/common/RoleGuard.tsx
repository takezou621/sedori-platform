'use client';

import React from 'react';
import { useAuthStore } from '@/store/auth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Array<'admin' | 'user' | 'seller'>;
  fallback?: React.ReactNode;
  requireAll?: boolean; // If true, user must have ALL roles, if false (default), user needs ANY role
}

export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback = null,
  requireAll = false 
}: RoleGuardProps) {
  const { user } = useAuthStore();

  if (!user) {
    return <>{fallback}</>;
  }

  const hasAccess = requireAll 
    ? allowedRoles.every(role => user.role === role)
    : allowedRoles.includes(user.role);

  if (!hasAccess) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// Helper components for specific roles
export function AdminOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return (
    <RoleGuard allowedRoles={['admin']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function SellerOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return (
    <RoleGuard allowedRoles={['seller']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function AdminOrSeller({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return (
    <RoleGuard allowedRoles={['admin', 'seller']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}

export function UserOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode; 
}) {
  return (
    <RoleGuard allowedRoles={['user']} fallback={fallback}>
      {children}
    </RoleGuard>
  );
}