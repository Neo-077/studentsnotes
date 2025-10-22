import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  sub: z.string().optional() // id del proveedor, opcional si ya validaste con Supabase
});

router.post('/login', (req, res)=>{
  const parse = loginSchema.safeParse(req.body);
  if(!parse.success) return res.status(400).json({ error: { message: 'Payload inválido' }});
  const token = jwt.sign({ email: parse.data.email, role: 'maestro' }, env.JWT_SECRET, { expiresIn: '2h' });
  res.json({ access_token: token, user: { email: parse.data.email, role: 'maestro' } });
});

export default router;
