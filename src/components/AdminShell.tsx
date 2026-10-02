"use client"
import React, { useState, useEffect } from 'react';
import NavLink from '@/components/NavLink';
import Auth from '@/components/Auth';
import LoadingSpinner from '@/components/LoadingSpinner';
import * as api from '@/services/api';

const JWT_TOKEN_STORAGE = 'jwtAuthToken';

const navItems = [
  { href: '/analytics', end: false, label: 'אנליטיקס' },
  { href: '/attribution', end: false, label: 'מקורות רכישה' },
  { href: '/', end: true, label: 'ניהול קטלוג' },
  { href: '/whatsapp', end: false, label: 'וואטסאפ' },
  { href: '/audit-log', end: false, label: 'יומן פעולות' },
];

const getNavLinkClass = (isActive: boolean) =>
  `shrink-0 px-4 h-12 inline-flex items-center text-[15px] font-medium border-b-2 transition-colors ${
    isActive
      ? 'border-ink-sales text-white'
      : 'border-transparent text-ink-dim hover:text-white'
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
      <header className="sticky top-0 z-40 bg-jungle-deep border-b border-wood-brown">
        <div className="w-full px-4 sm:px-6 lg:px-8 max-w-[1440px] mx-auto">
          <div className="flex items-center h-11">
            <span className="text-[13px] font-bold tracking-wide text-ink-dim">PARTIES 24/7 · ADMIN</span>
          </div>
          <nav className="-mx-4 px-4 sm:mx-0 sm:px-0 flex items-stretch overflow-x-auto" aria-label="ניווט ראשי">
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
      </header>
      <main className="w-full px-4 sm:px-6 lg:px-8 py-5 max-w-[1440px] mx-auto">{children}</main>
    </div>
  );
};

export default AdminShell;
