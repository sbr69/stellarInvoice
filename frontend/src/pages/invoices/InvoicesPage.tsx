'use client';

import { AuthGuard } from '@/components/auth-guard';
import { useWallet } from '@/lib/wallet-context';
import { db } from '@/lib/api-client';
import { Invoice } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, MoreVertical, Copy, Eye, XCircle, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { cancelInvoiceOnChain, isContractConfigured } from '@/lib/soroban-client';
import { useToast } from '@/components/toast';
import { SkeletonTableRow } from '@/components/skeleton';

export default function InvoicesPage() {
  const { user, walletAddress, signTransaction } = useWallet();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  // State for active dropdown menu
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
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

  // (loadInvoices moved above)

  const handleCancel = async (id: string) => {
    try {
      await db.updateInvoiceStatus(id, 'Cancelled');

      if (isContractConfigured() && walletAddress) {
        try {
          await cancelInvoiceOnChain(walletAddress, id, signTransaction);
        } catch (contractErr) {
          console.error('On-chain cancellation failed:', contractErr);
        }
      }

      showToast('Invoice cancelled', 'success');
      await loadInvoices();
    } catch (e) {
      console.error(e);
      showToast('Failed to cancel invoice', 'error');
    }
  };

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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Invoices</h1>
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
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
            
            <div className="relative w-full sm:max-w-xs">
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
            <div className="overflow-x-auto pb-32">
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
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 px-6">
                        <Link to={`/invoices/${inv.id}`} className="font-medium text-gray-900 hover:text-violet-600 transition-colors">
                          {inv.invoice_number}
                        </Link>
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
                      <td className="py-4 px-6 text-right relative">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === inv.id ? null : inv.id)}
                          className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        {openMenuId === inv.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                            <div className="absolute right-6 top-12 w-48 bg-white border border-gray-100 shadow-xl rounded-xl py-1.5 z-20 overflow-hidden">
                              <Link 
                                to={`/invoices/${inv.id}`}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Eye className="w-4 h-4 text-gray-400" /> View Details
                              </Link>
                              <button 
                                onClick={() => { copyLink(inv.id); setOpenMenuId(null); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Copy className="w-4 h-4 text-gray-400" /> Copy Link
                              </button>
                              {inv.status === 'Pending' && (
                                <button 
                                  onClick={() => { handleCancel(inv.id); setOpenMenuId(null); }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                >
                                  <XCircle className="w-4 h-4 text-red-400" /> Cancel Invoice
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
