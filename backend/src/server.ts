import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import usersRouter from './routes/users.js';
import invoicesRouter from './routes/invoices.js';
import { isSupabaseConfigured } from './lib/supabase.js';
import { startMonitoringAllPending, getActiveMonitorCount } from './lib/payment-monitor.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/users', usersRouter);
app.use('/api/invoices', invoicesRouter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    supabase: isSupabaseConfigured ? 'connected' : 'using in-memory fallback',
    activePaymentMonitors: getActiveMonitorCount(),
  });
});

app.listen(PORT, () => {
  console.log(`InvoiceChain API running on http://localhost:${PORT}`);
  console.log(`Database: ${isSupabaseConfigured ? 'Supabase' : 'In-memory (set SUPABASE_URL to use Supabase)'}`);
  startMonitoringAllPending();
});
