'use client';

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@/lib/wallet-context';
import { LogOut, Wallet } from 'lucide-react';
import { truncateAddress } from '@/lib/stellar';
import { useToast } from '@/components/toast';

export function Header() {
  const { isConnected, walletAddress, isConnecting, connectWallet, disconnectWallet, error, clearError, network } = useWallet();
  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    if (error) {
      showToast(error, 'error');
      clearError();
    }
  }, [error, clearError, showToast]);

  const handleDisconnect = () => {
    disconnectWallet();
    navigate('/');
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {/* Logo is hidden on desktop if connected (since it's in sidebar) */}
              <Link to={isConnected ? '/dashboard' : '/'} className={`flex items-center gap-2 ${isConnected ? 'md:hidden' : ''}`}>
                <div className="w-8 h-8 flex items-center justify-center">
                  <img src="/logo.png" alt="InvoiceChain Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-semibold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                  InvoiceChain
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {isConnected ? (
                <>


                  {/* Wallet address badge */}
                  <div className="hidden sm:flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                    <span className="text-xs font-mono text-gray-600 font-medium">
                      {truncateAddress(walletAddress || '', 4)}
                    </span>
                  </div>

                  {/* Disconnect */}
                  <button
                    onClick={handleDisconnect}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    title="Disconnect Wallet"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-full font-medium transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Connect Wallet
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
