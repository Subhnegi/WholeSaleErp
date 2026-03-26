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

// Create Express application
const app: Application = express();

// Middleware
app.use(cors({
  origin: SERVER_CONFIG.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api', authRoutes);
app.use('/api', companyRoutes);
app.use('/api', accountGroupRoutes);
app.use('/api', accountRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/crates', crateRoutes);
app.use('/api/arrival-types', arrivalTypeRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Error Handler
app.use((err: Error, _req: Request, res: Response) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: SERVER_CONFIG.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Start server
const PORT = SERVER_CONFIG.PORT;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   whole Sale ERP Server                                ║
║   Version: 1.0.0                                      ║
║                                                        ║
║   Server running on: http://localhost:${PORT}           ║
║   Environment: ${SERVER_CONFIG.NODE_ENV}                            ║
║                                                        ║
║   Auth Endpoints:                                     ║
║   - POST /api/register                                ║
║   - POST /api/login                                   ║
║   - POST /api/validate-license                        ║
║                                                        ║
║   Company Endpoints:                                  ║
║   - POST   /api/companies                             ║
║   - GET    /api/companies/user/:userId                ║
║   - GET    /api/companies/:id                         ║
║   - PUT    /api/companies/:id                         ║
║   - DELETE /api/companies/:id                         ║
║                                                        ║
║   Financial Year Endpoints:                           ║
║   - POST   /api/financial-years                       ║
║   - GET    /api/financial-years                       ║
║   - POST   /api/companies/:id/financial-years         ║
║   - GET    /api/companies/:id/financial-years         ║
║   - PUT    /api/companies/:id/financial-years/:yearId/activate ║
║   - DELETE /api/companies/:id/financial-years/:yearId ║
║                                                        ║
║   - GET  /health                                      ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

export default app;
