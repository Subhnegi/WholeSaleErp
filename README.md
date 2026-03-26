# whole-sale-erp

# Whole Sale ERP

An offline-first Enterprise Resource Planning (ERP) desktop application built with Electron, React, TypeScript, and SQLite.

## 🎯 Phase 1: Development Setup - COMPLETE ✅

This phase establishes the complete development scaffold with:
- ✅ Electron desktop application shell
- ✅ React + TypeScript frontend with Tailwind CSS + shadcn/ui
- ✅ SQLite database with Prisma ORM
- ✅ IPC communication between frontend and backend
- ✅ Proof of database connectivity

## 🚀 Quick Start

### Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd whole-sale-erp

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed
```

### Development

```bash
# Start the development server
npm run dev
```

The application will open in a new Electron window.

### Build

```bash
# Build for production
npm run build

# Build for Windows
npm run build:win

# Build for macOS
npm run build:mac

# Build for Linux
npm run build:linux
```

## 📚 Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build the application for production |
| `npm run build:win` | Build for Windows |
| `npm run build:mac` | Build for macOS |
| `npm run build:linux` | Build for Linux |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed the database with initial data |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

## 🏗️ Tech Stack

### Frontend
- **Electron**: Desktop application framework
- **React 19**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Build tool and dev server
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Component library
- **Lucide React**: Icon library

### Backend
- **SQLite**: Embedded database (offline-first)
- **Prisma**: Modern ORM for database operations
- **Electron IPC**: Inter-process communication

## 📁 Project Structure

```
whole-sale-erp/
├── src/
│   ├── main/               # Electron main process
│   │   ├── index.ts        # Main entry point
│   │   └── services/       # Backend services
│   │       └── database.ts # Database service
│   ├── preload/            # Electron preload scripts
│   │   ├── index.ts        # Preload entry point
│   │   └── index.d.ts      # TypeScript definitions
│   └── renderer/           # React frontend
│       ├── index.html
│       └── src/
│           ├── App.tsx
│           ├── components/ # React components
│           │   └── ui/     # shadcn/ui components
│           ├── lib/        # Utility functions
│           └── assets/     # Static assets
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts            # Database seed file
│   └── migrations/        # Database migrations
├── resources/             # App resources (icons, etc.)
├── build/                 # Build configuration
├── out/                   # Built application (generated)
└── docs/                  # Documentation

```

## 🗄️ Database Schema

The application uses SQLite with the following initial schema:

### Meta Table
Stores application metadata and configuration.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| key | TEXT | Unique metadata key |
| value | TEXT | Metadata value |
| createdAt | DATETIME | Creation timestamp |
| updatedAt | DATETIME | Last update timestamp |

**Initial Records:**
- `app_version`: "1.0.0"
- `db_version`: "1.0.0"
- `setup_status`: "phase_1_complete"

## 🔧 Configuration

### Database
The SQLite database is stored at `prisma/dev.db` during development. The location can be configured in `prisma/schema.prisma`.

### Electron
Main configuration is in `electron.vite.config.ts`. Window settings can be modified in `src/main/index.ts`.

## 📖 Documentation

Detailed documentation is available in the `/docs` folder:
- [Architecture Overview](./docs/architecture.md)
- [Setup Guide](./docs/setup-guide.md)
- [Development Workflow](./docs/development-workflow.md)

## 🛠️ Development

### Adding New Components

shadcn/ui components can be used directly from `src/renderer/src/components/ui/`.

### Database Operations

Use the `DatabaseService` singleton in the main process:

```typescript
import DatabaseService from './services/database'

const dbService = DatabaseService.getInstance()
const versionInfo = await dbService.getVersionInfo()
```

### IPC Communication

Frontend to Backend:

```typescript
// In renderer process
const versionInfo = await window.api.db.getVersionInfo()
```

Add new IPC handlers in `src/main/index.ts` and expose them in `src/preload/index.ts`.

## 🚧 Next Steps (Phase 2+)

- [ ] User authentication and authorization
- [ ] Inventory management module
- [ ] Sales and purchase tracking
- [ ] Reporting and analytics
- [ ] Multi-user support
- [ ] Data export/import functionality
- [ ] Backup and restore features

## 📝 License

[Your License Here]

## 👥 Contributors

[Your Name/Team]

---

**Status**: Phase 1 Complete ✅  
**Version**: 1.0.0  
**Last Updated**: October 24, 2025
