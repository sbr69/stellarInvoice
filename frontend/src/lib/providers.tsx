'use client';

import { ReactNode } from 'react';
import { WalletProvider } from './wallet-context';
import { ToastProvider } from '@/components/toast';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ToastProvider>{children}</ToastProvider>
    </WalletProvider>
  );
}
