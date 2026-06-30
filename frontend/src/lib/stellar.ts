import * as StellarSdk from '@stellar/stellar-sdk';

// ---- Stellar Testnet Configuration ----
export const STELLAR_NETWORK = 'TESTNET';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
export const FRIENDBOT_URL = 'https://friendbot.stellar.org';
export const EXPLORER_BASE_URL = 'https://stellar.expert/explorer/testnet';
export const STROOPS_PER_XLM = 10_000_000n;

// Horizon server singleton
let _server: StellarSdk.Horizon.Server | null = null;
export function getHorizonServer(): StellarSdk.Horizon.Server {
  if (!_server) {
    _server = new StellarSdk.Horizon.Server(HORIZON_URL);
  }
  return _server;
}

// ---- Helpers ----

/** Validate a Stellar public key (starts with G, 56 characters, valid encoding) */
export function isValidStellarAddress(address: string): boolean {
  if (!address || !address.startsWith('G') || address.length !== 56) return false;
  try {
    StellarSdk.Keypair.fromPublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/** Truncate a wallet address for display: GABC...WXYZ */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

function addThousandsSeparators(value: string): string {
  return value.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function xlmToStroops(amount: string | number | bigint): bigint {
  const raw = String(amount).trim();
  if (!raw) {
    return 0n;
  }

  const isNegative = raw.startsWith('-');
  const unsigned = isNegative || raw.startsWith('+') ? raw.slice(1) : raw;
  const [wholePart, fractionalPart = ''] = unsigned.split('.');

  if (!/^\d+$/.test(wholePart) || !/^\d*$/.test(fractionalPart)) {
    throw new Error(`Invalid XLM amount: ${amount}`);
  }

  if (fractionalPart.length > 7) {
    throw new Error(`XLM amounts support at most 7 decimal places: ${amount}`);
  }

  const whole = BigInt(wholePart || '0');
  const fraction = BigInt((fractionalPart || '').padEnd(7, '0') || '0');
  const stroops = whole * STROOPS_PER_XLM + fraction;

  return isNegative ? -stroops : stroops;
}

export function stroopsToXlmString(stroops: string | number | bigint): string {
  const value = BigInt(stroops);
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / STROOPS_PER_XLM;
  const fraction = absolute % STROOPS_PER_XLM;

  if (fraction === 0n) {
    return `${sign}${whole.toString()}`;
  }

  const fractionText = fraction.toString().padStart(7, '0').replace(/0+$/, '');
  return `${sign}${whole.toString()}.${fractionText}`;
}

export function formatXlmAmount(amount: string | number | bigint): string {
  const amountText = stroopsToXlmString(amount);
  const [whole, fraction] = amountText.split('.');
  const formattedWhole = addThousandsSeparators(whole.replace('-', ''));
  const signedWhole = whole.startsWith('-') ? `-${formattedWhole}` : formattedWhole;
  return fraction ? `${signedWhole}.${fraction}` : signedWhole;
}

/** Build a Stellar SEP-0007 payment URI for QR codes */
export function buildPaymentURI(
  destination: string,
  amount: string | number | bigint,
  memoId: string,
  assetCode = 'XLM'
): string {
  const params = new URLSearchParams({
    destination,
    amount: String(amount),
    asset_code: assetCode,
    memo: memoId,
    memo_type: 'MEMO_TEXT',
  });
  return `web+stellar:pay?${params.toString()}`;
}

/** Get a Stellar Explorer link for a transaction hash */
export function getExplorerTxUrl(txHash: string): string {
  return `${EXPLORER_BASE_URL}/tx/${txHash}`;
}

/** Get a Stellar Explorer link for an account */
export function getExplorerAccountUrl(publicKey: string): string {
  return `${EXPLORER_BASE_URL}/account/${publicKey}`;
}

/** Fund an account on testnet using Friendbot */
export async function fundWithFriendbot(publicKey: string): Promise<boolean> {
  try {
    const response = await fetch(`${FRIENDBOT_URL}?addr=${publicKey}`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Build a payment transaction for an invoice.
 * Returns the transaction ready to be signed by Freighter.
 */
export async function buildPaymentTransaction(
  senderPublicKey: string,
  destinationWallet: string,
  amount: string | number | bigint,
  memoId: string
): Promise<StellarSdk.Transaction> {
  const server = getHorizonServer();
  const senderAccount = await server.loadAccount(senderPublicKey);

  const transaction = new StellarSdk.TransactionBuilder(senderAccount, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: destinationWallet,
        asset: StellarSdk.Asset.native(),
        amount: String(amount),
      })
    )
    .addMemo(StellarSdk.Memo.text(memoId))
    .setTimeout(300)
    .build();

  return transaction;
}

/**
 * Submit a signed transaction XDR to the Stellar network.
 * Returns the transaction result.
 */
export async function submitTransaction(
  signedXdr: string
): Promise<StellarSdk.Horizon.HorizonApi.SubmitTransactionResponse> {
  const server = getHorizonServer();
  const transaction = StellarSdk.TransactionBuilder.fromXDR(
    signedXdr,
    NETWORK_PASSPHRASE
  );
  return server.submitTransaction(transaction);
}
