import * as StellarSdk from '@stellar/stellar-sdk';
import { db, Invoice } from './db.js';

const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';

const activeStreams = new Map<string, () => void>();

function getHorizonServer(): StellarSdk.Horizon.Server {
  return new StellarSdk.Horizon.Server(HORIZON_URL);
}

function xlmToStroops(amount: string): bigint {
  const [whole, frac = ''] = amount.split('.');
  return BigInt(whole || '0') * 10_000_000n + BigInt((frac || '').padEnd(7, '0'));
}

export function startMonitoringInvoice(invoice: Invoice): void {
  if (activeStreams.has(invoice.id)) return;
  if (invoice.status !== 'Pending') return;

  const server = getHorizonServer();
  let retryCount = 0;

  const startStream = () => {
    try {
      const close = server
        .payments()
        .forAccount(invoice.recipient_wallet_address)
        .cursor('now')
        .stream({
          onmessage: async (payment: any) => {
            if (payment.type !== 'payment') return;

            try {
              const txHash = payment.transaction_hash as string;
              const tx = await server.transactions().transaction(txHash).call();

              if (tx.memo !== invoice.memo_id) return;

              const paymentAmount = xlmToStroops(payment.amount as string);
              const invoiceAmount = invoice.total_amount_stroops
                ? BigInt(invoice.total_amount_stroops)
                : xlmToStroops(invoice.total_amount.toString());

              const isRecipientMatch = payment.to === invoice.recipient_wallet_address;
              const isAmountSufficient = paymentAmount >= invoiceAmount;
              const isNativeAsset = payment.asset_type === 'native';

              if (isRecipientMatch && isAmountSufficient && isNativeAsset) {
                await db.updateInvoiceStatus(invoice.id, 'Paid', tx.hash);
                console.log(`Payment verified for invoice ${invoice.invoice_number} (tx: ${tx.hash})`);
                stopMonitoringInvoice(invoice.id);
              }
            } catch (err) {
              console.error(`Error processing payment for invoice ${invoice.id}:`, err);
            }
          },
          onerror: (err: unknown) => {
            console.error(`Horizon stream error for invoice ${invoice.id}:`, err);
            retryCount++;
            const delay = Math.min(1000 * Math.pow(2, retryCount), 60000);
            setTimeout(() => {
              if (activeStreams.has(invoice.id)) {
                startStream();
              }
            }, delay);
          },
        });

      activeStreams.set(invoice.id, close);
      retryCount = 0;
    } catch (err) {
      console.error(`Failed to start stream for invoice ${invoice.id}:`, err);
    }
  };

  startStream();
}

export function stopMonitoringInvoice(invoiceId: string): void {
  const close = activeStreams.get(invoiceId);
  if (close) {
    close();
    activeStreams.delete(invoiceId);
  }
}

export async function startMonitoringAllPending(): Promise<void> {
  try {
    const allInvoices = await db.getAllPendingInvoices();
    console.log(`Starting payment monitoring for ${allInvoices.length} pending invoice(s)`);
    for (const invoice of allInvoices) {
      startMonitoringInvoice(invoice);
    }
  } catch (err) {
    console.error('Failed to start monitoring pending invoices:', err);
  }
}

export function getActiveMonitorCount(): number {
  return activeStreams.size;
}
