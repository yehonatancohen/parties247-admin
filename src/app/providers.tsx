"use client";

import React from 'react';
import { PartyProvider } from '@/hooks/useParties';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <PartyProvider>{children}</PartyProvider>;
}
