'use client';

import { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/api-client';
import { Invoice } from '@/lib/types';
import { buildPaymentURI, getExplorerTxUrl, buildPaymentTransaction, submitTransaction, NETWORK_PASSPHRASE, stroopsToXlmString } from '@/lib/stellar';
import { usePaymentStream } from '@/hooks/use-payment-stream';
import { useParams } from 'react-router-dom';
import {
  CheckCircle2,
  Wallet,
  RefreshCw,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Zap,
  ExternalLink,
  Radio,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

type PaymentState = 'idle' | 'connecting' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

export default function PublicInvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Pay Now state machine
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Real-time Horizon payment streaming
  const { status: liveStatus, txHash: liveTxHash, streamStatus } = usePaymentStream(invoice);

  const invoiceAmountXlm = invoice
    ? invoice.total_amount_stroops
      ? stroopsToXlmString(invoice.total_amount_stroops)
      : invoice.total_amount.toString()
    : '0';

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

  // Load invoice on mount
  useEffect(() => {
    loadInvoice();
  }, [loadInvoice]);

  // ---- Real StellarWalletsKit Payment Flow ----
  const handlePayWithWallet = async () => {
    if (!invoice) return;
    setPaymentError(null);

    try {
      // Step 1: Connect Wallet via StellarWalletsKit Modal
      setPaymentState('connecting');
      const { StellarWalletsKit } = await import('@creit-tech/stellar-wallets-kit/sdk');
      
      const result = await StellarWalletsKit.authModal();
      const senderAddress = result?.address;

      if (!senderAddress) {
        setPaymentError('Could not get wallet address. Please try again.');
        setPaymentState('error');
        return;
      }

      // Step 2: Build the transaction
      setPaymentState('building');
      const transaction = await buildPaymentTransaction(
        senderAddress,
        invoice.recipient_wallet_address,
        invoiceAmountXlm,
        invoice.memo_id
      );

      // Step 3: Sign with StellarWalletsKit
      setPaymentState('signing');
      const signResult = await StellarWalletsKit.signTransaction(transaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: senderAddress,
      });
      const signedXdr = signResult.signedTxXdr;

      if (!signedXdr) {
        setPaymentError('Transaction signing was rejected.');
        setPaymentState('error');
        return;
      }

      // Step 4: Submit to Stellar network
      setPaymentState('submitting');
      const submitResult = await submitTransaction(signedXdr);

      if (submitResult.successful) {
        setPaymentState('success');
        // The Horizon stream will detect this payment and update the DB automatically.
        // But let's also do it here for immediate feedback.
        await db.updateInvoiceStatus(invoice.id, 'Paid', submitResult.hash);
        await loadInvoice();
      } else {
        setPaymentError('Transaction failed on the Stellar network. Please try again.');
        setPaymentState('error');
      }
    } catch (err: unknown) {
      console.error('Payment failed:', err);
      const message = err instanceof Error ? err.message : 'Payment failed';

      if (message.includes('declined') || message.includes('rejected') || message.includes('cancelled')) {
        setPaymentError('Transaction was rejected in your wallet.');
      } else if (message.includes('op_underfunded') || message.includes('insufficient')) {
        setPaymentError('Insufficient XLM balance. Fund your wallet using Friendbot on testnet.');
      } else if (message.includes('op_no_destination') || message.includes('not found')) {
        setPaymentError('Destination account does not exist on the Stellar network. It needs to be funded first.');
      } else {
        setPaymentError(message);
      }
      setPaymentState('error');
    }
  };

  // ---- Simulate Payment (Dev) ----
  const handleSimulatePayment = async () => {
    if (!invoice) return;
    setSimulating(true);
    try {
      const fakeTxHash = 'SIM_' + crypto.randomUUID().replace(/-/g, '').substring(0, 32);
      await db.updateInvoiceStatus(invoice.id, 'Paid', fakeTxHash);
      await loadInvoice();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  // ---- Copy to clipboard ----
  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
    }
  };

  // ---- Derive final display status from live stream ----
  const displayStatus = liveStatus || invoice?.status || 'Pending';
  const displayTxHash = liveTxHash || invoice?.transaction_hash || null;
  const isPaid = displayStatus === 'Paid';
  const isCancelled = displayStatus === 'Cancelled';
  const isExpired = displayStatus === 'Expired';
  const isPayable = !isPaid && !isCancelled && !isExpired;

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-violet-500 animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center max-w-sm w-full shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Invoice Not Found</h2>
          <p className="text-gray-500 text-sm">The invoice you are looking for does not exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  // SEP-0007 payment URI for QR code
  const stellarUri = buildPaymentURI(
    invoice.recipient_wallet_address,
    invoiceAmountXlm,
    invoice.memo_id
  );

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header Branding */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-violet-500 to-teal-400 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-xs leading-none">I</span>
            </div>
            <span className="font-semibold text-gray-900 tracking-tight">InvoiceChain</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {isPaid ? (
            /* ===== PAID SUCCESS STATE ===== */
            <motion.div
              key="paid"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="bg-white p-10 rounded-3xl border border-green-100 shadow-xl shadow-green-900/5 text-center relative overflow-hidden"
            >
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-green-400/20 blur-3xl rounded-full"></div>
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-teal-400/20 blur-3xl rounded-full"></div>

              <div className="w-20 h-20 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 relative z-10">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2 relative z-10">Payment Successful!</h2>
              <p className="text-gray-500 mb-8 relative z-10">Thank you for your payment of {invoiceAmountXlm} XLM.</p>

              <div className="bg-gray-50 rounded-2xl p-6 text-left max-w-sm mx-auto border border-gray-100 relative z-10">
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-500">Invoice No</span>
                  <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between text-sm mb-3">
                  <span className="text-gray-500">Date Paid</span>
                  <span className="font-medium text-gray-900">
                    {invoice.paid_at ? format(new Date(invoice.paid_at), 'MMM d, yyyy HH:mm') : 'Just now'}
                  </span>
                </div>
                {displayTxHash && (
                  <div className="flex justify-between text-sm pt-3 border-t border-gray-200">
                    <span className="text-gray-500">Tx Hash</span>
                    <a
                      href={getExplorerTxUrl(displayTxHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-violet-600 hover:underline truncate ml-4 flex items-center gap-1"
                    >
                      {displayTxHash.slice(0, 12)}...
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            /* ===== UNPAID / PENDING STATE ===== */
            <motion.div
              key="unpaid"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-5 gap-6"
            >
              {/* Left: Invoice Details */}
              <div className="md:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{invoice.invoice_number}</h1>
                    {isPayable && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Payment Pending
                      </span>
                    )}
                    {isCancelled && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                        Cancelled
                      </span>
                    )}
                    {isExpired && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Due</p>
                    <p className="text-2xl font-bold text-violet-600">{invoiceAmountXlm} <span className="text-lg">XLM</span></p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Billed To</p>
                    <p className="font-medium text-gray-900">{invoice.client_name}</p>
                    {invoice.client_email && <p className="text-sm text-gray-600">{invoice.client_email}</p>}
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Line Items</p>
                    <div className="space-y-4">
                      {invoice.items?.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <div>
                            <p className="font-medium text-gray-900">{item.description}</p>
                            <p className="text-gray-500">{item.quantity} × {item.unit_price} XLM</p>
                          </div>
                          <p className="font-medium text-gray-900">{(item.quantity * item.unit_price).toLocaleString()} XLM</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Horizon stream status indicator */}
                {isPayable && (
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Radio className={`w-3 h-3 ${streamStatus === 'streaming' ? 'text-green-500 animate-pulse' : streamStatus === 'error' ? 'text-amber-500' : 'text-gray-400'}`} />
                      {streamStatus === 'streaming' && 'Monitoring Stellar network for payments...'}
                      {streamStatus === 'error' && 'Stream reconnecting... (polling as fallback)'}
                      {streamStatus === 'idle' && 'Connecting to Stellar network...'}
                      {streamStatus === 'verified' && 'Payment verified!'}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Payment Controls */}
              <div className="md:col-span-2 space-y-4">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm text-center">
                  <h3 className="font-semibold text-gray-900 mb-6">Pay this Invoice</h3>

                  {(isCancelled || isExpired) ? (
                    <div className="bg-gray-50 text-gray-500 p-4 rounded-xl border border-gray-200">
                      This invoice has been {isCancelled ? 'cancelled' : 'expired'}.
                    </div>
                  ) : (
                    <>
                      {/* ===== QR Code (Real SEP-0007 URI) ===== */}
                      <div className="w-52 h-52 bg-white border border-gray-200 mx-auto rounded-xl p-3 flex flex-col items-center justify-center mb-4 shadow-sm">
                        <QRCodeSVG
                          value={stellarUri}
                          size={180}
                          level="M"
                          bgColor="#ffffff"
                          fgColor="#1a1a1a"
                          includeMargin={false}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mb-4">Scan with any Stellar-compatible wallet</p>

                      <button
                        onClick={() => handleCopy(stellarUri, 'uri')}
                        className="text-xs text-violet-600 hover:text-violet-700 font-medium mb-6 flex items-center gap-1 mx-auto"
                      >
                        {copiedField === 'uri' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        {copiedField === 'uri' ? 'Copied!' : 'Copy Payment URI'}
                      </button>

                      {/* ===== Pay with Wallet Button ===== */}
                      <button
                        onClick={handlePayWithWallet}
                        disabled={paymentState !== 'idle' && paymentState !== 'error'}
                        className={`w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-medium transition-all shadow-sm mb-2 ${
                          paymentState === 'success'
                            ? 'bg-green-600 text-white'
                            : paymentState === 'error'
                            ? 'bg-gray-900 hover:bg-gray-800 text-white'
                            : 'bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-60 disabled:cursor-not-allowed'
                        }`}
                      >
                        {paymentState === 'idle' && <><Wallet className="w-5 h-5" /> Pay with Wallet</>}
                        {paymentState === 'connecting' && <><Loader2 className="w-5 h-5 animate-spin" /> Connecting Wallet...</>}
                        {paymentState === 'building' && <><Loader2 className="w-5 h-5 animate-spin" /> Building Transaction...</>}
                        {paymentState === 'signing' && <><Loader2 className="w-5 h-5 animate-spin" /> Sign transaction...</>}
                        {paymentState === 'submitting' && <><Loader2 className="w-5 h-5 animate-spin" /> Submitting to Stellar...</>}
                        {paymentState === 'success' && <><CheckCircle2 className="w-5 h-5" /> Payment Sent!</>}
                        {paymentState === 'error' && <><Wallet className="w-5 h-5" /> Try Again</>}
                      </button>

                      {/* Payment error message */}
                      {paymentError && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 p-3 bg-red-50 border border-red-100 rounded-lg text-left"
                        >
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-700">{paymentError}</p>
                          </div>
                        </motion.div>
                      )}

                      {/* Divider */}
                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-gray-200"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="px-2 bg-white text-gray-500">or</span>
                        </div>
                      </div>

                      {/* ===== Manual Payment Instructions ===== */}
                      <button
                        onClick={() => setShowManual(!showManual)}
                        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
                      >
                        Manual Payment
                        {showManual ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>

                      <AnimatePresence>
                        {showManual && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 text-left space-y-4 p-4 bg-gray-50 rounded-xl border border-gray-100 text-sm">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Amount</p>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-900">{invoiceAmountXlm} XLM</p>
                                  <button onClick={() => handleCopy(invoiceAmountXlm, 'amount')} className="text-gray-400 hover:text-violet-600">
                                    {copiedField === 'amount' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Destination Address</p>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-xs text-gray-700 break-all">{invoice.recipient_wallet_address}</p>
                                  <button onClick={() => handleCopy(invoice.recipient_wallet_address, 'address')} className="text-gray-400 hover:text-violet-600 shrink-0">
                                    {copiedField === 'address' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              </div>
                              <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                                <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> Required Memo
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="font-mono text-amber-900 font-bold">{invoice.memo_id}</p>
                                  <button onClick={() => handleCopy(invoice.memo_id, 'memo')} className="text-amber-600 hover:text-amber-800">
                                    {copiedField === 'memo' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                                <p className="text-[10px] text-amber-600 mt-1">You MUST include this memo. Without it, the payment cannot be matched to this invoice.</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>

                {/* Simulate Payment (Dev Only) */}
                {isPayable && import.meta.env.DEV && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={handleSimulatePayment}
                      disabled={simulating}
                      className="text-[10px] px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-400 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 transition-colors font-medium flex items-center gap-1.5"
                    >
                      {simulating ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Simulate Payment (Dev)
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 pt-4">
          Powered by <span className="font-medium text-gray-500">InvoiceChain</span> — Built on Stellar
        </div>
      </div>
    </div>
  );
}
