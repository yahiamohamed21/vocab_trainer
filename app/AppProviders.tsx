// app/AppProviders.tsx
'use client';

import React from 'react';
import { UiSettingsProvider } from '@/context/UiSettingsContext';
import { AppStateProvider } from '@/context/AppStateContext';
import { AuthProvider } from '@/context/AuthContext';

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <UiSettingsProvider>
      <AppStateProvider>
        <AuthProvider>
          {/* هنا نفس اللفّة اللي كانت في layout علشان التصميم مايباظش */}
          <div className="min-h-screen flex justify-center">
            {children}
          </div>
        </AuthProvider>
      </AppStateProvider>
    </UiSettingsProvider>
  );
}
