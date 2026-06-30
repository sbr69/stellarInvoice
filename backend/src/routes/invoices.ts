import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';
import { startMonitoringInvoice, stopMonitoringInvoice } from '../lib/payment-monitor.js';

const allowedStatuses = new Set(['Pending', 'Paid', 'Expired', 'Cancelled']);

const router = Router();

router.get('/', async (req: Request<unknown, unknown, unknown, { userId?: string }>, res: Response) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      res.status(400).json({ error: 'userId query parameter is required' });
      return;
    }
    const invoices = await db.getInvoices(userId);
    res.json(invoices);
  } catch (err) {
    console.error('GET /api/invoices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const invoice = await db.getInvoice(req.params.id);
    if (!invoice) {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    res.json(invoice);
  } catch (err) {
    console.error('GET /api/invoices/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { invoice, items } = req.body;
    if (!invoice || !items) {
      res.status(400).json({ error: 'invoice and items are required' });
      return;
    }
    if (!invoice.user_id || !invoice.client_name || !invoice.recipient_wallet_address) {
      res.status(400).json({ error: 'user_id, client_name, and recipient_wallet_address are required' });
      return;
    }
    const created = await db.createInvoice(invoice, items);
    startMonitoringInvoice(created);
    res.status(201).json(created);
  } catch (err) {
    console.error('POST /api/invoices error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/status', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { status, transaction_hash } = req.body;
    if (!status) {
      res.status(400).json({ error: 'status is required' });
      return;
    }
    if (!allowedStatuses.has(status)) {
      res.status(400).json({ error: 'Invalid status value' });
      return;
    }
    const updated = await db.updateInvoiceStatus(req.params.id, status, transaction_hash);
    if (status === 'Paid' || status === 'Cancelled') {
      stopMonitoringInvoice(req.params.id);
    }
    res.json(updated);
  } catch (err: any) {
    if (err.message === 'Invoice not found') {
      res.status(404).json({ error: 'Invoice not found' });
      return;
    }
    console.error('PATCH /api/invoices/:id/status error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
