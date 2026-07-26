"use client"
import React, { useState, useEffect } from 'react';
import NavLink from '@/components/NavLink';
import Auth from '@/components/Auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import * as api from '@/services/api';

const JWT_TOKEN_STORAGE = 'jwtAuthToken';

const getNavLinkClass = (isActive: boolean) =>
  `px-4 py-2 rounded-lg font-semibold transition-colors ${
    isActive
      ? 'bg-jungle-accent text-jungle-deep shadow-jungle-glow'
      : 'text-white/80 hover:text-white hover:bg-jungle-accent/20'
  }`;

const AdminShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authStatus, setAuthStatus] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');

  useEffect(() => {
    const verifyTokenOnLoad = async () => {
      const token = localStorage.getItem(JWT_TOKEN_STORAGE);
      if (token) {
        try {
          await api.verifyToken();
          setAuthStatus('authenticated');
        } catch {
          localStorage.removeItem(JWT_TOKEN_STORAGE);
          setAuthStatus('unauthenticated');
        }
      } else {
        setAuthStatus('unauthenticated');
      }
    };
    verifyTokenOnLoad();
  }, []);

  if (authStatus === 'checking') {
    return <div className="flex justify-center items-center h-64"><LoadingSpinner /></div>;
  }

  if (authStatus !== 'authenticated') {
    return <Auth onAuthSuccess={() => setAuthStatus('authenticated')} />;
  }

  return (
    <div className="py-8 space-y-6 max-w-7xl mx-auto px-4">
      <div className="bg-jungle-surface/60 border border-wood-brown/40 rounded-xl shadow-lg p-3 flex flex-wrap gap-2">
        <NavLink href="/" end className={({ isActive }) => getNavLinkClass(isActive)}>
          ניהול קטלוג
        </NavLink>
        <NavLink href="/analytics" className={({ isActive }) => getNavLinkClass(isActive)}>
          אנליטיקס
        </NavLink>
        <NavLink href="/audit-log" className={({ isActive }) => getNavLinkClass(isActive)}>
          יומן פעולות
        </NavLink>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
};

export default AdminShell;
