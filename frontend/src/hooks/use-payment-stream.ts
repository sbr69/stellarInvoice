'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Invoice } from '@/lib/types';
import { db } from '@/lib/api-client';
import { xlmToStroops } from '@/lib/stellar';
import { verifyPaymentOnChain, isContractConfigured } from '@/lib/soroban-client';

type StreamStatus = 'idle' | 'streaming' | 'error' | 'verified';

interface PaymentStreamResult {
  /** Current invoice status (tracks real-time changes) */
  status: Invoice['status'];
  /** Transaction hash if payment verified */
  txHash: string | null;
  /** Whether the Horizon stream is active */
  streamStatus: StreamStatus;
  /** Error message if stream failed */
  streamError: string | null;
}

/**
 * Hook that monitors the Stellar Horizon network for incoming payments
 * matching a specific invoice. When a payment is detected with the correct
 * memo, amount, and destination, it verifies and updates the invoice status.
 *
 * Uses Horizon's streaming API (Server-Sent Events) for real-time detection
 * with a polling fallback every 30 seconds.
 */
export function usePaymentStream(invoice: Invoice | null, signTransaction?: (xdr: string) => Promise<string>): PaymentStreamResult {
  const [status, setStatus] = useState<Invoice['status']>(invoice?.status || 'Pending');
  const [txHash, setTxHash] = useState<string | null>(invoice?.transaction_hash || null);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [streamError, setStreamError] = useState<string | null>(null);
  const closeStreamRef = useRef<(() => void) | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isVerifyingRef = useRef(false);
  const invoiceAmountStroopsRef = useRef<bigint>(0n);

  // Sync state when invoice prop changes
  useEffect(() => {
    if (invoice) {
      setStatus(invoice.status);
      setTxHash(invoice.transaction_hash || null);
      invoiceAmountStroopsRef.current = invoice.total_amount_stroops
        ? BigInt(invoice.total_amount_stroops)
        : xlmToStroops(invoice.total_amount.toString());
    }
  }, [invoice?.status, invoice?.transaction_hash]);

  const verifyAndUpdateInvoice = useCallback(async (
    invoiceData: Invoice,
    detectedTxHash: string
  ): Promise<boolean> => {
    // Prevent concurrent verification calls
    if (isVerifyingRef.current) return false;
    isVerifyingRef.current = true;

    try {
      await db.updateInvoiceStatus(invoiceData.id, 'Paid', detectedTxHash);

      if (isContractConfigured() && signTransaction) {
        try {
          await verifyPaymentOnChain(
            invoiceData.recipient_wallet_address,
            invoiceData.id,
            detectedTxHash,
            signTransaction
          );
        } catch (contractErr) {
          console.error('On-chain payment verification failed:', contractErr);
        }
      }

      setStatus('Paid');
      setTxHash(detectedTxHash);
      setStreamStatus('verified');
      return true;
    } catch (err) {
      console.error('Failed to update invoice status:', err);
      return false;
    } finally {
      isVerifyingRef.current = false;
    }
  }, []);

  // Main streaming effect
  useEffect(() => {
    if (!invoice || invoice.status !== 'Pending') return;

    let isCancelled = false;

    const startStream = async () => {
      try {
        // Dynamically import Stellar SDK (heavy, only load when needed)
        const StellarSdk = await import('@stellar/stellar-sdk');
        const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

        setStreamStatus('streaming');
        setStreamError(null);

        // Start Horizon payment stream for the recipient wallet
        const closeStream = server
          .payments()
          .forAccount(invoice.recipient_wallet_address)
          .cursor('now')
          .stream({
            onmessage: async (payment: any) => {
              if (isCancelled) return;

              // Only process payment operations
              const paymentType = payment.type as string;
              if (paymentType !== 'payment') return;

              try {
                // Fetch the full transaction to get the memo
                const txHashValue = payment.transaction_hash as string;
                const tx = await server
                  .transactions()
                  .transaction(txHashValue)
                  .call();

                // Check if the memo matches our invoice's memo_id
                if (tx.memo !== invoice.memo_id) return;

                // Verify the payment details
                const paymentAmount = xlmToStroops(payment.amount as string);
                const invoiceAmount = invoiceAmountStroopsRef.current;
                const paymentTo = payment.to as string;
                const assetType = payment.asset_type as string;

                const isRecipientMatch = paymentTo === invoice.recipient_wallet_address;
                const isAmountSufficient = paymentAmount >= invoiceAmount;
                const isNativeAsset = assetType === 'native';

                if (isRecipientMatch && isAmountSufficient && isNativeAsset) {
                  // Payment verified! Update the invoice
                  const success = await verifyAndUpdateInvoice(invoice, tx.hash);
                  if (success) {
                    // Close the stream — we're done
                    closeStreamRef.current?.();
                  }
                }
              } catch (err) {
                console.error('Error processing payment event:', err);
              }
            },
            onerror: (err: unknown) => {
              if (isCancelled) return;
              console.error('Horizon stream error:', err);
              setStreamError('Payment stream disconnected. Falling back to polling.');
              setStreamStatus('error');
              // Stream will auto-reconnect via Horizon's EventSource
            },
          });

        closeStreamRef.current = closeStream;
      } catch (err) {
        if (isCancelled) return;
        console.error('Failed to start payment stream:', err);
        setStreamError('Could not start payment monitoring. Using polling fallback.');
        setStreamStatus('error');
      }
    };

    startStream();

    // Polling fallback: every 30 seconds, re-fetch the invoice from our DB
    // in case the stream missed something or Supabase Realtime pushed an update
    pollIntervalRef.current = setInterval(async () => {
      if (isCancelled || status === 'Paid') return;

      try {
        const refreshed = await db.getInvoice(invoice.id);
        if (refreshed && refreshed.status === 'Paid') {
          setStatus('Paid');
          setTxHash(refreshed.transaction_hash || null);
          setStreamStatus('verified');
          closeStreamRef.current?.();
        }
      } catch {
        // Silent polling failure
      }
    }, 30000);

    return () => {
      isCancelled = true;
      closeStreamRef.current?.();
      closeStreamRef.current = null;
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [invoice?.id, invoice?.status, invoice?.recipient_wallet_address, invoice?.memo_id, status, verifyAndUpdateInvoice]);

  return {
    status,
    txHash,
    streamStatus,
    streamError,
  };
}
