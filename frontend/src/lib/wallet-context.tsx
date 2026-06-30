'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from './types';
import { db } from './api-client';

interface WalletContextType {
  walletAddress: string | null;
  user: User | null;
  isConnected: boolean;
  isConnecting: boolean;
  network: string | null;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
  signTransaction: (xdr: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize StellarWalletsKit once on the client
  useEffect(() => {
    const initKit = async () => {
      try {
        const { StellarWalletsKit } = await import('@creit-tech/stellar-wallets-kit/sdk');
        const { defaultModules } = await import('@creit-tech/stellar-wallets-kit/modules/utils');
        const { Networks } = await import('@creit-tech/stellar-wallets-kit/types');

        StellarWalletsKit.init({
          modules: defaultModules(),
          network: Networks.TESTNET,
        });
      } catch (err) {
        console.error('Failed to initialize StellarWalletsKit:', err);
      }
    };
    initKit();
  }, []);

  const fetchUser = useCallback(async (address: string) => {
    try {
      let u = await db.getUser(address);
      // Auto-create user if they are missing from the database but stored in localStorage
      if (!u) {
        u = await db.createUser(address);
      }
      setUser(u);
    } catch (e) {
      console.error('Error fetching user:', e);
    }
  }, []);

  const silentReconnect = useCallback(async (storedAddress: string) => {
    try {
      const { StellarWalletsKit } = await import('@creit-tech/stellar-wallets-kit/sdk');
      const result = await StellarWalletsKit.getAddress();
      if (result?.address && result.address !== storedAddress) {
        setWalletAddress(result.address);
        localStorage.setItem('invoicechain_wallet', result.address);
        await fetchUser(result.address);
      }
    } catch {
      // Fail silently is fine for background check
    }
  }, [fetchUser]);

  // Auto-load connected wallet from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('invoicechain_wallet');
    if (stored) {
      setWalletAddress(stored);
      fetchUser(stored);
      silentReconnect(stored);
    }
  }, [fetchUser, silentReconnect]);

  // (fetchUser and silentReconnect moved above)

  const connectWallet = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      const { StellarWalletsKit } = await import('@creit-tech/stellar-wallets-kit/sdk');

      // Request connection via the unified multi-wallet modal
      const result = await StellarWalletsKit.authModal({
        // Modal configs if needed
      });

      const address = result?.address;

      if (!address) {
        setError('No wallet address returned from connection.');
        return;
      }

      setWalletAddress(address);
      localStorage.setItem('invoicechain_wallet', address);

      // Get selected network from kit
      try {
        const netInfo = await StellarWalletsKit.getNetwork();
        setNetwork(netInfo.network || 'Testnet');
      } catch {
        setNetwork('Testnet');
      }

      // Fetch or create user record
      let u = await db.getUser(address);
      if (!u) {
        u = await db.createUser(address);
      }
      setUser(u);

    } catch (err: any) {
      console.error('StellarWalletsKit connection failed:', err);
      const message = err?.message || err || 'Wallet connection was cancelled or failed.';
      if (message.includes('closed') || message.includes('cancelled')) {
        setError('Connection request was closed.');
      } else {
        setError(message);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    const disconnectKit = async () => {
      try {
        const { StellarWalletsKit } = await import('@creit-tech/stellar-wallets-kit/sdk');
        await StellarWalletsKit.disconnect();
      } catch {
        // Fail silently
      }
    };
    disconnectKit();

    setWalletAddress(null);
    setUser(null);
    setNetwork(null);
    setError(null);
    localStorage.removeItem('invoicechain_wallet');
  };

  const refreshUser = async () => {
    if (walletAddress) {
      await fetchUser(walletAddress);
    }
  };

  const clearError = useCallback(() => setError(null), []);

  const signTransaction = useCallback(async (xdr: string): Promise<string> => {
    const { StellarWalletsKit } = await import('@creit-tech/stellar-wallets-kit/sdk');
    const result = await StellarWalletsKit.signTransaction(xdr);
    return result.signedTxXdr;
  }, []);

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        user,
        isConnected: !!walletAddress,
        isConnecting,
        network,
        error,
        connectWallet,
        disconnectWallet,
        refreshUser,
        clearError,
        signTransaction,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
