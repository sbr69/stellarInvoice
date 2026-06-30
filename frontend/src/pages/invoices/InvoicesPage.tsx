'use client';

import { AuthGuard } from '@/components/auth-guard';
import { useWallet } from '@/lib/wallet-context';
import { db } from '@/lib/api-client';
import { Invoice } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Copy, Plus, FileText, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/components/toast';
import { SkeletonTableRow } from '@/components/skeleton';

export default function InvoicesPage() {
  const { user } = useWallet();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const navigate = useNavigate();
  
  const { showToast } = useToast();

  const loadInvoices = useCallback(async () => {
    if (user) {
      const data = await db.getInvoices(user.id);
      setInvoices(data);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadInvoices();
    }
  }, [user, loadInvoices]);

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/pay/${id}`;
    navigator.clipboard.writeText(url);
    showToast('Shareable link copied to clipboard!', 'success');
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-green-50 text-green-700 border-green-200';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelled': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filter !== 'All' && inv.status !== filter) return false;
    if (search && !inv.client_name.toLowerCase().includes(search.toLowerCase()) && !inv.invoice_number.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Invoices</h1>
          <Link 
            to="/invoices/create"
            className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {/* Controls */}
          <div className="p-4 border-b border-gray-100">
            {/* Mobile View: Dropdown left, Search right */}
            <div className="flex sm:hidden items-center gap-2 w-full">
              <div className="relative w-32 shrink-0">
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100/50 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-left shadow-sm"
                >
                  <span className="truncate">{filter}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform shrink-0 ml-1 ${isFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isFilterOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)}></div>
                    <div className="absolute left-0 mt-1.5 w-full bg-white border border-gray-100 shadow-xl rounded-xl py-1 z-20 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                      {['All', 'Pending', 'Paid', 'Expired', 'Cancelled'].map(f => (
                        <button
                          key={f}
                          onClick={() => {
                            setFilter(f);
                            setIsFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm font-semibold transition-colors ${
                            filter === f 
                              ? 'bg-violet-50 text-violet-700' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm"
                />
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden sm:flex flex-row items-center justify-between w-full gap-4">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl shrink-0 overflow-x-auto no-scrollbar">
                {['All', 'Pending', 'Paid', 'Expired', 'Cancelled'].map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              
              <div className="relative w-full max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search invoices..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all text-sm"
                />
              </div>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="p-6">
              <table className="w-full"><tbody>{Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</tbody></table>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="p-16 text-center text-gray-500 flex flex-col items-center">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No invoices found</h3>
              <p>Try adjusting your filters or search.</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="py-3 px-6 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredInvoices.map(inv => (
                      <tr 
                        key={inv.id} 
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 px-6">
                          <span className="font-medium text-gray-900 group-hover:text-violet-600 transition-colors">
                            {inv.invoice_number}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-600">
                          <div>{inv.client_name}</div>
                          {inv.client_email && <div className="text-xs text-gray-400">{inv.client_email}</div>}
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-900">{inv.total_amount} {inv.asset}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-500 text-sm">
                          {format(new Date(inv.created_at), 'MMM d, yyyy')}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button 
                              onClick={(e) => { e.stopPropagation(); copyLink(inv.id); }}
                              className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                              title="Copy Share Link"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredInvoices.map(inv => (
                  <div 
                    key={inv.id} 
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="p-4 space-y-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors">
                        {inv.invoice_number}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{inv.client_name}</p>
                        {inv.client_email && <p className="text-xs text-gray-500">{inv.client_email}</p>}
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">{inv.total_amount} {inv.asset}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100/50">
                      <span className="text-xs text-gray-400">
                        {format(new Date(inv.created_at), 'MMM d, yyyy')}
                      </span>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); copyLink(inv.id); }}
                          className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                          title="Copy Share Link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
