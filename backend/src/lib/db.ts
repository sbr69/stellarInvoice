import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from './supabase.js';

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

// In-memory fallback store
let users: User[] = [];
let invoices: Invoice[] = [];
let invoiceItems: InvoiceItem[] = [];

const generateMemoId = () => Math.random().toString(36).substring(2, 10).toUpperCase();
const generateInvoiceNumber = () => `INV-${Math.floor(1000 + Math.random() * 9000)}`;

export const db = {
  getUser: async (walletAddress: string): Promise<User | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!.from('users').select('*').eq('wallet_address', walletAddress).single();
      if (error) return null;
      return data;
    }
    return users.find(u => u.wallet_address === walletAddress) || null;
  },

  createUser: async (walletAddress: string, businessName?: string, email?: string): Promise<User> => {
    const newUser: User = {
      id: uuidv4(),
      wallet_address: walletAddress,
      business_name: businessName || '',
      email: email || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!.from('users').insert([newUser]).select().single();
      if (error) throw error;
      return data;
    }
    users.push(newUser);
    return newUser;
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('User not found');
    users[idx] = { ...users[idx], ...updates, updated_at: new Date().toISOString() };
    return users[idx];
  },

  getInvoices: async (userId: string): Promise<Invoice[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('invoices')
        .select('*, items:invoice_items(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
    return invoices
      .filter(i => i.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(inv => ({
        ...inv,
        items: invoiceItems.filter(item => item.invoice_id === inv.id),
      }));
  },

  getInvoice: async (id: string): Promise<Invoice | null> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('invoices')
        .select('*, items:invoice_items(*)')
        .eq('id', id)
        .single();
      if (error) return null;
      return data;
    }
    const inv = invoices.find(i => i.id === id);
    if (!inv) return null;
    return { ...inv, items: invoiceItems.filter(item => item.invoice_id === inv.id) };
  },

  createInvoice: async (invoiceData: Partial<Invoice>, items: Partial<InvoiceItem>[]): Promise<Invoice> => {
    const newInvoice: Invoice = {
      id: invoiceData.id || uuidv4(),
      invoice_number: generateInvoiceNumber(),
      memo_id: invoiceData.memo_id || generateMemoId(),
      user_id: invoiceData.user_id!,
      client_name: invoiceData.client_name!,
      client_email: invoiceData.client_email || '',
      recipient_wallet_address: invoiceData.recipient_wallet_address!,
      total_amount: invoiceData.total_amount || 0,
      total_amount_stroops: invoiceData.total_amount_stroops,
      asset: invoiceData.asset || 'XLM',
      status: 'Pending',
      transaction_hash: invoiceData.transaction_hash,
      due_date: invoiceData.due_date,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newItems: InvoiceItem[] = items.map(item => ({
      id: uuidv4(),
      invoice_id: newInvoice.id,
      description: item.description!,
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
      created_at: new Date().toISOString(),
    }));

    if (isSupabaseConfigured) {
      const { data: createdInv, error: invError } = await supabase!
        .from('invoices')
        .insert([newInvoice])
        .select()
        .single();
      if (invError) throw invError;

      const { error: itemsError } = await supabase!
        .from('invoice_items')
        .insert(newItems.map(i => ({ ...i, invoice_id: createdInv.id })));
      if (itemsError) throw itemsError;

      return { ...createdInv, items: newItems };
    }

    invoices.push(newInvoice);
    invoiceItems.push(...newItems);
    return { ...newInvoice, items: newItems };
  },

  getAllPendingInvoices: async (): Promise<Invoice[]> => {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('invoices')
        .select('*')
        .eq('status', 'Pending');
      if (error) throw error;
      return data;
    }
    return invoices.filter(i => i.status === 'Pending');
  },

  updateInvoiceStatus: async (id: string, status: InvoiceStatus, txHash?: string): Promise<Invoice> => {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'Paid') {
      updates.paid_at = new Date().toISOString();
      if (txHash) updates.transaction_hash = txHash;
    }

    if (isSupabaseConfigured) {
      const { data, error } = await supabase!
        .from('invoices')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }

    const idx = invoices.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Invoice not found');

    const current = invoices[idx];
    if (current.status === status && (!txHash || current.transaction_hash === txHash)) {
      return current;
    }

    invoices[idx] = { ...invoices[idx], ...updates } as Invoice;
    return invoices[idx];
  },
};
