export type InvoiceStatus = 'Pending' | 'Paid' | 'Expired' | 'Cancelled';

export interface User {
  id: string;
  wallet_address: string;
  business_name?: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  memo_id: string;
  user_id: string;
  client_name: string;
  client_email?: string;
  recipient_wallet_address: string;
  total_amount: number;
  total_amount_stroops?: string;
  asset: string;
  status: InvoiceStatus;
  paid_at?: string;
  transaction_hash?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
}
