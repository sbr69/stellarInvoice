'use client';

import { AuthGuard } from '@/components/auth-guard';
import { useWallet } from '@/lib/wallet-context';
import { db } from '@/lib/api-client';
import { Invoice } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Copy, ExternalLink, RefreshCw, XCircle, FileText, CheckCircle2 } from 'lucide-react';
import { getExplorerTxUrl, getExplorerAccountUrl } from '@/lib/stellar';
import { format } from 'date-fns';
import { cancelInvoiceOnChain, isContractConfigured } from '@/lib/soroban-client';
import { useToast } from '@/components/toast';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { walletAddress, signTransaction } = useWallet();
  const { showToast } = useToast();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!id) return;
    try {
      const data = await db.getInvoice(id);
      setInvoice(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // (loadInvoice moved above)

  const handleCancel = async () => {
    if (!invoice) return;
    setCancelling(true);
    try {
      await db.updateInvoiceStatus(invoice.id, 'Cancelled');

      if (isContractConfigured() && walletAddress) {
        try {
          await cancelInvoiceOnChain(walletAddress, invoice.id, signTransaction);
        } catch (contractErr) {
          console.error('On-chain cancellation failed (invoice cancelled off-chain):', contractErr);
        }
      }

      showToast('Invoice cancelled', 'success');
      await loadInvoice();
    } catch (e) {
      console.error(e);
      showToast('Failed to cancel invoice', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/pay/${id}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex justify-center py-20"><RefreshCw className="w-8 h-8 text-violet-500 animate-spin" /></div>
      </AuthGuard>
    );
  }

  if (!invoice) {
    return (
      <AuthGuard>
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900">Invoice not found</h2>
          <Link to="/invoices" className="text-violet-600 hover:underline mt-2 inline-block">Return to Invoices</Link>
        </div>
      </AuthGuard>
    );
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Paid': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-50 text-green-700 border border-green-200"><CheckCircle2 className="w-4 h-4" /> Paid</span>;
      case 'Pending': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200"><RefreshCw className="w-4 h-4 animate-spin-slow" /> Pending</span>;
      case 'Cancelled': return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200"><XCircle className="w-4 h-4" /> Cancelled</span>;
      default: return <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">{status}</span>;
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link to="/invoices" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Invoices
          </Link>
          <div className="flex items-center gap-3">
            {invoice.status === 'Pending' && (
              <button 
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> {cancelling ? 'Cancelling...' : 'Cancel Invoice'}
              </button>
            )}
            <Link 
              to={`/pay/${invoice.id}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors shadow-sm"
            >
              <ExternalLink className="w-4 h-4" /> View Public Page
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{invoice.invoice_number}</h1>
                  {getStatusBadge(invoice.status)}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Issue Date</p>
                  <p className="font-medium text-gray-900">{format(new Date(invoice.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-8 mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Billed To</p>
                  <p className="font-semibold text-gray-900 text-lg">{invoice.client_name}</p>
                  {invoice.client_email && <p className="text-gray-600">{invoice.client_email}</p>}
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Amount Due</p>
                  <p className="text-3xl font-bold text-violet-600">{invoice.total_amount} <span className="text-xl text-violet-400">XLM</span></p>
                  {invoice.due_date && <p className="text-sm text-gray-500 mt-1">Due {format(new Date(invoice.due_date), 'MMM d, yyyy')}</p>}
                </div>
              </div>

              <div className="mb-8">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.items?.map(item => (
                      <tr key={item.id} className="group">
                        <td className="py-4 font-medium text-gray-900">{item.description}</td>
                        <td className="py-4 text-right text-gray-600">{item.quantity}</td>
                        <td className="py-4 text-right text-gray-600">{item.unit_price}</td>
                        <td className="py-4 text-right font-medium text-gray-900">{(item.quantity * item.unit_price).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td colSpan={3} className="py-4 text-right font-semibold text-gray-900">Total Amount</td>
                      <td className="py-4 text-right font-bold text-gray-900 text-lg">{invoice.total_amount} XLM</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Share with Client</h3>
              <p className="text-sm text-gray-500 mb-4">Send this link to your client to collect payment.</p>
              
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareUrl}
                  className="flex-1 w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none"
                />
                <button 
                  onClick={handleCopy}
                  className="p-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-colors shrink-0"
                  title="Copy link"
                >
                  {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-4">Blockchain Details</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Memo ID (Critical)</p>
                  <div className="bg-violet-50 text-violet-700 font-mono text-sm px-3 py-2 rounded-lg border border-violet-100 font-bold">
                    {invoice.memo_id}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used to automatically verify incoming payments.</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Destination Address</p>
                  <a href={getExplorerAccountUrl(invoice.recipient_wallet_address)} target="_blank" rel="noreferrer" className="font-mono text-xs text-violet-600 hover:underline break-all block bg-gray-50 p-2 rounded-lg border border-gray-100">
                    {invoice.recipient_wallet_address}
                  </a>
                </div>
                {invoice.transaction_hash && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tx Hash</p>
                    <a href={getExplorerTxUrl(invoice.transaction_hash)} target="_blank" rel="noreferrer" className="font-mono text-xs text-violet-600 hover:underline break-all flex items-center gap-1">
                      {invoice.transaction_hash} <ExternalLink className="w-3 h-3 shrink-0 inline" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
