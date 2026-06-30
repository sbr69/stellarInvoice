'use client';

import { useWallet } from '@/lib/wallet-context';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Header } from '@/components/header';
import { Sidebar } from '@/components/sidebar';
import { Loader2, LayoutDashboard, FileText, Settings } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isConnected, isConnecting } = useWallet();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (!isConnected && !isConnecting) {
      navigate('/');
    }
  }, [isConnected, isConnecting, navigate]);

  useEffect(() => {
    const handleVisualViewportResize = () => {
      if (window.visualViewport) {
        // Visual viewport height shrinks significantly when keyboard is open
        const isKeyboardUp = window.visualViewport.height < window.screen.height - 200;
        setIsKeyboardOpen(isKeyboardUp);
      }
    };

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setIsKeyboardOpen(true);
      }
    };

    const handleBlur = () => {
      setIsKeyboardOpen(false);
    };

    window.addEventListener('focus', handleFocus, true);
    window.addEventListener('blur', handleBlur, true);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }

    return () => {
      window.removeEventListener('focus', handleFocus, true);
      window.removeEventListener('blur', handleBlur, true);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
      }
    };
  }, []);

  if (isConnecting) {
    return (
      <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFAFA]">
      <Sidebar />
      <div className={`flex-1 flex flex-col min-w-0 md:pb-0 ${isKeyboardOpen ? 'pb-0' : 'pb-20'}`}>
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      {!isKeyboardOpen && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex items-center justify-around z-20 pb-safe">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex flex-col items-center justify-center w-full py-3 gap-1 ${
                  isActive ? 'text-violet-600' : 'text-gray-500'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
