"use client"
import React, { useState, useEffect } from 'react';
import NavLink from '@/components/NavLink';
import Auth from '@/components/Auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import * as api from '@/services/api';

const JWT_TOKEN_STORAGE = 'jwtAuthToken';

const navItems = [
  { href: '/', end: true, label: 'ניהול קטלוג' },
  { href: '/analytics', end: false, label: 'אנליטיקס' },
  { href: '/audit-log', end: false, label: 'יומן פעולות' },
];

const getNavLinkClass = (isActive: boolean) =>
  `shrink-0 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-jungle-accent text-white'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
    return <div className="flex justify-center items-center min-h-screen"><LoadingSpinner /></div>;
  }

  if (authStatus !== 'authenticated') {
    return <Auth onAuthSuccess={() => setAuthStatus('authenticated')} />;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <span className="font-display text-lg font-bold text-slate-900 shrink-0">Parties 24/7 · Admin</span>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  end={item.end}
                  className={({ isActive }) => getNavLinkClass(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
};

export default AdminShell;
