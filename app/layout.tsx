// app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';
import { ReactNode } from 'react';

import { UiSettingsProvider } from '@/context/UiSettingsContext';
import { AppStateProvider } from '@/context/AppStateContext';
import { AuthProvider } from '@/context/AuthContext';
import TopBar from '../components/TopBar';

export const metadata: Metadata = {
  title: 'Vocab Trainer',
  description:
    'Multi-language vocabulary and pronunciation trainer with TTS, quizzes, stats, and an admin dashboard.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <UiSettingsProvider>
          <AuthProvider>
            <AppStateProvider>
              {/* التوب بار + المحتوى */}
              <div className="min-h-screen flex flex-col">
                <TopBar />
                <main className="flex-1 flex justify-center">
                  {children}
                </main>
              </div>
            </AppStateProvider>
          </AuthProvider>
        </UiSettingsProvider>
      </body>
    </html>
  );
}
