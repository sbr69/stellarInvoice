import { Router, Request, Response } from 'express';
import { db } from '../lib/db.js';

const router = Router();

router.get('/:walletAddress', async (req: Request<{ walletAddress: string }>, res: Response) => {
  try {
    const user = await db.getUser(req.params.walletAddress);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error('GET /api/users/:walletAddress error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { wallet_address, business_name, email } = req.body;
    if (!wallet_address) {
      res.status(400).json({ error: 'wallet_address is required' });
      return;
    }
    const user = await db.createUser(wallet_address, business_name, email);
    res.status(201).json(user);
  } catch (err) {
    console.error('POST /api/users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req: Request<{ id: string }>, res: Response) => {
  try {
    const user = await db.updateUser(req.params.id, req.body);
    res.json(user);
  } catch (err: any) {
    if (err.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error('PATCH /api/users/:id error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
