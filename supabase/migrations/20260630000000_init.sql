-- Supabase Database Schema for InvoiceChain

-- 1. Users Table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT UNIQUE NOT NULL,
  business_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for fast wallet lookups
CREATE INDEX idx_users_wallet_address ON users(wallet_address);

-- 2. Invoices Table
CREATE TYPE invoice_status AS ENUM ('Pending', 'Paid', 'Expired', 'Cancelled');

CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL, -- e.g., INV-0001
  memo_id TEXT UNIQUE NOT NULL, -- 8-character alphanumeric
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT,
  recipient_wallet_address TEXT NOT NULL,
  total_amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
  total_amount_stroops TEXT,
  asset TEXT DEFAULT 'XLM' NOT NULL,
  status invoice_status DEFAULT 'Pending' NOT NULL,
  paid_at TIMESTAMPTZ,
  transaction_hash TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index for searching invoices by user and memo_id
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_memo_id ON invoices(memo_id);

-- 3. Invoice Items Table
CREATE TABLE invoice_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(16, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Users can read and update their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Invoices policies
-- Anyone can view an invoice (for the public payment page)
CREATE POLICY "Public can view invoices" ON invoices
  FOR SELECT USING (true);

-- Users can insert/update their own invoices
CREATE POLICY "Users can manage own invoices" ON invoices
  FOR ALL USING (user_id = auth.uid());

-- Invoice items policies
CREATE POLICY "Public can view invoice items" ON invoice_items
  FOR SELECT USING (true);

CREATE POLICY "Users can manage own invoice items" ON invoice_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.user_id = auth.uid()
    )
  );

-- Enable Realtime for Invoices
alter publication supabase_realtime add table invoices;
