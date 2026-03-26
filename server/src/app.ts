import './config/env.js';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import companyRoutes from './routes/company.routes.js';
import accountGroupRoutes from './routes/accountGroup.routes.js';
import accountRoutes from './routes/account.routes.js';
import itemRoutes from './routes/item.routes.js';
import crateRoutes from './routes/crate.routes.js';
import arrivalTypeRoutes from './routes/arrivalType.routes.js';
import { SERVER_CONFIG } from './config/constants.js';

const app: Application = express();

app.use(cors({
  origin: SERVER_CONFIG.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'whole Sale ERP Server is running',
    health: '/health',
  });
});

app.get('/favicon.ico', (_req: Request, res: Response) => {
  res.status(204).end();
});

app.get('/favicon.png', (_req: Request, res: Response) => {
  res.status(204).end();
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', authRoutes);
app.use('/api', companyRoutes);
app.use('/api', accountGroupRoutes);
app.use('/api', accountRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/crates', crateRoutes);
app.use('/api/arrival-types', arrivalTypeRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((err: Error, _req: Request, res: Response) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: SERVER_CONFIG.NODE_ENV === 'development' ? err.message : undefined,
  });
});

export default app;
