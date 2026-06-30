'use client';

import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '@/lib/wallet-context';
import { LogOut, Wallet, AlertCircle, X, ExternalLink } from 'lucide-react';
import { truncateAddress } from '@/lib/stellar';
import { AnimatePresence, motion } from 'motion/react';

export function Header() {
  const { isConnected, walletAddress, isConnecting, connectWallet, disconnectWallet, error, clearError, network } = useWallet();
  const navigate = useNavigate();

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
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-teal-400 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg leading-none">I</span>
                </div>
                <span className="font-semibold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
                  InvoiceChain
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {isConnected ? (
                <>
                  {/* Network badge */}
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded-full bg-teal-50 text-teal-700 border border-teal-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    {network || 'Testnet'}
                  </span>

                  {/* Wallet address badge */}
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">
                    <div className="w-2 h-2 rounded-full bg-teal-400"></div>
                    <span className="text-xs font-mono text-gray-600 font-medium hidden sm:inline-block">
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

      {/* Wallet connection error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border-b border-red-100"
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
                {error.includes('freighter.app') && (
                  <a
                    href="https://freighter.app"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 underline font-medium hover:text-red-900"
                  >
                    Install Freighter <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <button onClick={clearError} className="text-red-400 hover:text-red-600 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
