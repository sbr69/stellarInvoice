import { User, Invoice, InvoiceItem } from './types';

// API Client for the frontend
export const db = {
  getUser: async (walletAddress: string): Promise<User | null> => {
    const res = await fetch(`/api/users/${walletAddress}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch user');
    return res.json();
  },
  
  createUser: async (walletAddress: string, businessName?: string, email?: string): Promise<User> => {
    const res = await fetch(`/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: walletAddress, business_name: businessName, email })
    });
    if (!res.ok) throw new Error('Failed to create user');
    return res.json();
  },

  updateUser: async (id: string, updates: Partial<User>): Promise<User> => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error('Failed to update user');
    return res.json();
  },

  getInvoices: async (userId: string): Promise<Invoice[]> => {
    const res = await fetch(`/api/invoices?userId=${userId}`);
    if (!res.ok) throw new Error('Failed to fetch invoices');
    return res.json();
  },

  getInvoice: async (id: string): Promise<Invoice | null> => {
    const res = await fetch(`/api/invoices/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Failed to fetch invoice');
    return res.json();
  },

  createInvoice: async (invoice: Partial<Invoice>, items: Partial<InvoiceItem>[]): Promise<Invoice> => {
    const res = await fetch(`/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice, items })
    });
    if (!res.ok) throw new Error('Failed to create invoice');
    return res.json();
  },

  updateInvoiceStatus: async (id: string, status: Invoice['status'], txHash?: string): Promise<Invoice> => {
    const res = await fetch(`/api/invoices/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, transaction_hash: txHash })
    });
    if (!res.ok) throw new Error('Failed to update invoice status');
    return res.json();
  }
};
