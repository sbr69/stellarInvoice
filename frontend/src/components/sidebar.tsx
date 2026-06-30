'use client';

import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings } from 'lucide-react';

export function Sidebar() {
  const location = useLocation();
  const pathname = location.pathname;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col h-screen sticky top-0 shrink-0">
      <div className="p-6">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-500 to-teal-400 flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg leading-none">I</span>
          </div>
          <span className="font-semibold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            InvoiceChain
          </span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-colors ${
                isActive 
                  ? 'bg-violet-50 text-violet-700' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-violet-600' : 'text-gray-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
