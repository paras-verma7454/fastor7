import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { corsOrigins, env, isTest } from './config/env.js';
import { pool } from './db/client.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { enquiriesRouter } from './modules/enquiries/enquiries.routes.js';
import { publicRouter } from './modules/public/public.routes.js';

export const app = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: corsOrigins }));
app.use(express.json({ limit: '64kb' }));

if (!isTest) {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

app.get('/health', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.status(200).json({
      status: 'ok',
      database: 'up',
      uptimeSeconds: Math.round(process.uptime()),
    });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down' });
  }
});

app.use('/api/auth', authRouter);
app.use('/api/public', publicRouter);
app.use('/api/enquiries', enquiriesRouter);

app.use(notFoundHandler);
app.use(errorHandler);
