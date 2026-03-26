import app from './app.js';
import { SERVER_CONFIG } from './config/constants.js';

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

