'use client';

import { AuthGuard } from '@/components/auth-guard';
import { useWallet } from '@/lib/wallet-context';
import { db } from '@/lib/api-client';
import { Invoice, InvoiceItem } from '@/lib/types';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Trash2, Plus, CheckCircle2 } from 'lucide-react';
import { formatXlmAmount, stroopsToXlmString, xlmToStroops } from '@/lib/stellar';
import { createInvoiceOnChain, isContractConfigured } from '@/lib/soroban-client';
import { useToast } from '@/components/toast';

type InvoiceFormItem = {
  description: string;
  quantity: string;
  unit_price: string;
};

export default function CreateInvoicePage() {
  const { user, walletAddress, signTransaction } = useWallet();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [items, setItems] = useState<InvoiceFormItem[]>([{ description: '', quantity: '1', unit_price: '0' }]);
  const [recipientWallet, setRecipientWallet] = useState(walletAddress || '');
  const [dueDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  useEffect(() => {
    if (walletAddress && !recipientWallet) {
      setRecipientWallet(walletAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress]);

  const totalAmountStroops = items.reduce((sum, item) => {
    const quantity = BigInt(Number(item.quantity || '0'));
    const unitPriceStroops = xlmToStroops(item.unit_price || '0');
    return sum + quantity * unitPriceStroops;
  }, 0n);

  const totalAmountXlm = stroopsToXlmString(totalAmountStroops);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: '1', unit_price: '0' }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof InvoiceFormItem, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const isItemValid = (item: InvoiceFormItem) => {
    try {
      return item.description.trim().length > 0 && Number(item.quantity) > 0 && xlmToStroops(item.unit_price) > 0n;
    } catch {
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    
    try {
      const invoiceData: Partial<Invoice> = {
        user_id: user.id,
        client_name: clientName,
        client_email: clientEmail,
        recipient_wallet_address: recipientWallet,
        total_amount: Number(totalAmountXlm),
        total_amount_stroops: totalAmountStroops.toString(),
        asset: 'XLM',
        due_date: dueDate || undefined,
      };

      const invoiceItems: Partial<InvoiceItem>[] = items.map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
      }));
      
      const created = await db.createInvoice(invoiceData, invoiceItems);

      if (isContractConfigured() && walletAddress) {
        try {
          await createInvoiceOnChain(
            walletAddress,
            created.id,
            created.memo_id,
            recipientWallet,
            totalAmountStroops,
            signTransaction
          );
        } catch (contractErr) {
          console.error('On-chain registration failed (invoice still created off-chain):', contractErr);
        }
      }

      showToast('Invoice created successfully!', 'success');
      navigate(`/invoices/${created.id}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create invoice', 'error');
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Client Details</h2>
              <p className="text-sm text-gray-500">Who are you billing?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name / Business *</label>
                <input 
                  type="text" 
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Email (Optional)</label>
                <input 
                  type="email" 
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="billing@acme.com"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all"
                />
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setStep(2)}
                disabled={!clientName.trim()}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-all"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Line Items</h2>
                <p className="text-sm text-gray-500">What are you charging for?</p>
              </div>
              <button onClick={handleAddItem} className="flex items-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 bg-violet-50 px-3 py-1.5 rounded-lg">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>
            
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-4 p-4 border border-gray-200 rounded-xl bg-gray-50 relative group">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Description</label>
                    <input 
                      type="text" 
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      placeholder="Web Development Services"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div className="flex gap-4 w-full sm:w-auto shrink-0">
                    <div className="w-1/3 sm:w-24">
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Qty</label>
                      <input 
                        type="number" 
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                    <div className="w-2/3 sm:w-32">
                      <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">Price (XLM)</label>
                      <input 
                        type="number" 
                        min="0"
                        step="0.0000001"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button 
                      onClick={() => handleRemoveItem(index)}
                      className="absolute -right-2 -top-2 bg-red-100 text-red-600 p-1.5 rounded-full shadow-sm opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity sm:static sm:opacity-100 sm:self-end sm:mb-2 sm:bg-transparent sm:shadow-none sm:hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900">{formatXlmAmount(totalAmountStroops)} XLM</p>
              </div>
            </div>
            
            <div className="flex justify-between pt-4">
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button 
                onClick={() => setStep(3)}
                disabled={items.some(i => !isItemValid(i))}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-all"
              >
                Next <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Payment Config</h2>
              <p className="text-sm text-gray-500">Where should the funds go?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination Wallet (XLM) *</label>
                <input 
                  type="text" 
                  value={recipientWallet}
                  onChange={(e) => setRecipientWallet(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Pre-filled with your connected wallet.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date *</label>
                <input 
                  type="text" 
                  readOnly
                  value={new Date(dueDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl cursor-not-allowed text-gray-600 font-medium text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">Payment is due immediately (today).</p>
              </div>
            </div>
            
            <div className="flex justify-between pt-4 border-t border-gray-100">
              <button 
                onClick={() => setStep(2)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button 
                onClick={() => setStep(4)}
                disabled={!recipientWallet.trim()}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-medium transition-all"
              >
                Review <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Review & Create</h2>
              <p className="text-sm text-gray-500">Almost done. Check the details before generating.</p>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 space-y-6">
              <div className="flex justify-between">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Billed To</p>
                  <p className="font-medium text-gray-900">{clientName}</p>
                  {clientEmail && <p className="text-sm text-gray-600">{clientEmail}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 mb-1">Total Due</p>
                  <p className="text-2xl font-bold text-violet-600">{formatXlmAmount(totalAmountStroops)} XLM</p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="pb-2">Description</th>
                      <th className="pb-2 text-right">Qty</th>
                      <th className="pb-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 text-gray-900 font-medium">{item.description}</td>
                        <td className="py-2 text-right text-gray-600">{item.quantity}</td>
                        <td className="py-2 text-right text-gray-900 font-medium">{formatXlmAmount(BigInt(Number(item.quantity || '0')) * xlmToStroops(item.unit_price || '0'))} XLM</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-mono text-gray-900 text-xs break-all text-right max-w-[60%]">{recipientWallet}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Due Date</span>
                  <span className="text-gray-900">{new Date(dueDate + 'T00:00:00').toLocaleDateString()}</span>
                </div>
              </div>
            </div>


            
            <div className="flex justify-between pt-4">
              <button 
                onClick={() => setStep(3)}
                disabled={submitting}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl font-medium transition-all shadow-md shadow-violet-600/20"
              >
                {submitting ? 'Creating...' : 'Create Invoice'} <CheckCircle2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <AuthGuard>
      <div className="max-w-2xl mx-auto py-4 sm:py-8 px-4 sm:px-0">
        <Link to="/invoices" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </Link>
        
        {/* Progress */}
        <div className="flex items-center mb-8 relative z-0">
          <div className="absolute left-[12.5%] top-1/2 -translate-y-1/2 w-[75%] h-1 bg-gray-100 rounded-full -z-10"></div>
          <div 
            className="absolute left-[12.5%] top-1/2 -translate-y-1/2 h-1 bg-blue-600 rounded-full -z-10 transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 75}%` }}
          ></div>
          
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex-1 flex justify-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors relative z-10 ${
                step === s ? 'bg-white border-blue-600 text-blue-600' :
                step > s ? 'bg-blue-600 border-blue-600 text-white' :
                'bg-white border-gray-200 text-gray-400'
              }`}>
                {s}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white p-4 sm:p-8 rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm">
          {renderStepContent()}
        </div>
      </div>
    </AuthGuard>
  );
}
