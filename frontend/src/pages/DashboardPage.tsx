import { AuthGuard } from '@/components/auth-guard';
import { useWallet } from '@/lib/wallet-context';
import { db } from '@/lib/api-client';
import { Invoice } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Clock, FileText, CheckCircle2, Plus, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { SkeletonTableRow } from '@/components/skeleton';
import { useToast } from '@/components/toast';

export default function DashboardPage() {
  const { user } = useWallet();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const copyLink = (id: string) => {
    const url = `${window.location.origin}/pay/${id}`;
    navigator.clipboard.writeText(url);
    showToast('Shareable link copied to clipboard!', 'success');
  };

  useEffect(() => {
    if (user) {
      db.getInvoices(user.id).then(data => {
        setInvoices(data);
        setLoading(false);
      });
    }
  }, [user]);

  const totalRevenue = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + Number(i.total_amount), 0);
  const pendingCount = invoices.filter(i => i.status === 'Pending').length;
  const paidCount = invoices.filter(i => i.status === 'Paid').length;
  
  const recentInvoices = invoices.slice(0, 5);

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Paid': return 'bg-green-50 text-green-700 border-green-200';
      case 'Pending': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Cancelled': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Welcome back, {user?.business_name || 'Merchant'}</p>
          </div>
          <Link 
            to="/invoices/create"
            className="hidden sm:inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Invoice
          </Link>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 text-gray-500 mb-1 sm:mb-2">
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Total Revenue</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold text-gray-900 flex items-baseline gap-1">
              {totalRevenue.toLocaleString()} <span className="text-xs sm:text-base font-medium text-gray-500">XLM</span>
            </div>
          </div>
          
          <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 text-gray-500 mb-1 sm:mb-2">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Total Invoices</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold text-gray-900">
              {invoices.length}
            </div>
          </div>
          
          <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 text-gray-500 mb-1 sm:mb-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Pending</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold text-gray-900">
              {pendingCount}
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 text-gray-500 mb-1 sm:mb-2">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 shrink-0" />
              <span className="text-xs sm:text-sm font-medium">Paid</span>
            </div>
            <div className="text-xl sm:text-3xl font-bold text-gray-900">
              {paidCount}
            </div>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Invoices</h2>
            <Link to="/invoices" className="text-sm font-medium text-violet-600 hover:text-violet-700">View all</Link>
          </div>
          
          {loading ? (
            <div className="p-6">
              <table className="w-full"><tbody>{Array.from({ length: 3 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}</tbody></table>
            </div>
          ) : recentInvoices.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <p>No invoices created yet.</p>
              <Link to="/invoices/create" className="mt-4 text-violet-600 font-medium hover:underline">Create your first invoice</Link>
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
                    {recentInvoices.map(inv => (
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
                        <td className="py-4 px-6 text-gray-600">{inv.client_name}</td>
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
                {recentInvoices.map(inv => (
                  <div 
                    key={inv.id} 
                    onClick={() => navigate(`/invoices/${inv.id}`)}
                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <div className="space-y-1">
                      <span className="font-semibold text-gray-900 group-hover:text-violet-600 transition-colors block">
                        {inv.invoice_number}
                      </span>
                      <div className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap">
                        <span>{inv.client_name}</span>
                        <span>•</span>
                        <span>{format(new Date(inv.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-semibold text-gray-900 text-sm">{inv.total_amount} {inv.asset}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${getStatusColor(inv.status)}`}>
                        {inv.status}
                      </span>
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
