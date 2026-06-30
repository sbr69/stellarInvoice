import * as StellarSdk from '@stellar/stellar-sdk';
import { NETWORK_PASSPHRASE } from './stellar';

const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = import.meta.env.VITE_SOROBAN_CONTRACT_ID || '';

let _sorobanServer: StellarSdk.Soroban.Server | null = null;

function getSorobanServer(): StellarSdk.Soroban.Server {
  if (!_sorobanServer) {
    _sorobanServer = new StellarSdk.Soroban.Server(SOROBAN_RPC_URL);
  }
  return _sorobanServer;
}

export function isContractConfigured(): boolean {
  return Boolean(CONTRACT_ID);
}

function buildContract(): StellarSdk.Contract {
  return new StellarSdk.Contract(CONTRACT_ID);
}

async function prepareAndSubmitTx(
  sourcePublicKey: string,
  operation: StellarSdk.xdr.Operation,
  signTransaction: (xdr: string) => Promise<string>
): Promise<StellarSdk.Soroban.Api.GetTransactionResponse> {
  const server = getSorobanServer();
  const account = await server.getAccount(sourcePublicKey);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(300)
    .build();

  const prepared = await server.prepareTransaction(tx);
  const xdr = prepared.toXDR();
  const signedXdr = await signTransaction(xdr);
  const signed = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResponse = await server.sendTransaction(signed);

  if (sendResponse.status === 'ERROR') {
    throw new Error(`Transaction submission failed: ${sendResponse.status}`);
  }

  let getResponse = await server.getTransaction(sendResponse.hash);
  while (getResponse.status === 'NOT_FOUND') {
    await new Promise((r) => setTimeout(r, 1000));
    getResponse = await server.getTransaction(sendResponse.hash);
  }

  if (getResponse.status === 'FAILED') {
    throw new Error('Transaction failed on-chain');
  }

  return getResponse;
}

export async function createInvoiceOnChain(
  creatorPublicKey: string,
  invoiceId: string,
  memoId: string,
  recipientAddress: string,
  amountStroops: bigint,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  if (!isContractConfigured()) return;

  const contract = buildContract();
  const operation = contract.call(
    'create_invoice',
    StellarSdk.Address.fromString(creatorPublicKey).toScVal(),
    StellarSdk.nativeToScVal(invoiceId, { type: 'string' }),
    StellarSdk.nativeToScVal(memoId, { type: 'string' }),
    StellarSdk.Address.fromString(recipientAddress).toScVal(),
    StellarSdk.nativeToScVal(amountStroops, { type: 'i128' }),
    StellarSdk.nativeToScVal('XLM', { type: 'symbol' })
  );

  await prepareAndSubmitTx(creatorPublicKey, operation, signTransaction);
}

export async function verifyPaymentOnChain(
  callerPublicKey: string,
  invoiceId: string,
  txHash: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  if (!isContractConfigured()) return;

  const contract = buildContract();
  const operation = contract.call(
    'verify_payment',
    StellarSdk.nativeToScVal(invoiceId, { type: 'string' }),
    StellarSdk.nativeToScVal(txHash, { type: 'string' })
  );

  await prepareAndSubmitTx(callerPublicKey, operation, signTransaction);
}

export async function cancelInvoiceOnChain(
  creatorPublicKey: string,
  invoiceId: string,
  signTransaction: (xdr: string) => Promise<string>
): Promise<void> {
  if (!isContractConfigured()) return;

  const contract = buildContract();
  const operation = contract.call(
    'cancel_invoice',
    StellarSdk.Address.fromString(creatorPublicKey).toScVal(),
    StellarSdk.nativeToScVal(invoiceId, { type: 'string' })
  );

  await prepareAndSubmitTx(creatorPublicKey, operation, signTransaction);
}

export async function getInvoiceFromChain(
  invoiceId: string
): Promise<unknown | null> {
  if (!isContractConfigured()) return null;

  const server = getSorobanServer();
  const contract = buildContract();
  const dummyKeypair = StellarSdk.Keypair.random();
  const account = new StellarSdk.Account(dummyKeypair.publicKey(), '0');

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'get_invoice',
        StellarSdk.nativeToScVal(invoiceId, { type: 'string' })
      )
    )
    .setTimeout(30)
    .build();

  try {
    const response = await server.simulateTransaction(tx);
    if (StellarSdk.Soroban.Api.isSimulationSuccess(response)) {
      return StellarSdk.scValToNative(response.result!.retval);
    }
    return null;
  } catch {
    return null;
  }
}
