# Whole sale ERP Server - Phase 2.1

## Overview

This is the backend server for Whole sale ERP's user onboarding and license management system. It handles user registration, authentication, and trial license generation.

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt

## Features

✅ User registration with automatic 7-day trial license  
✅ User login with JWT authentication  
✅ License validation and expiry tracking  
✅ Secure password hashing with bcrypt  
✅ PostgreSQL database with Prisma ORM  
✅ Configurable trial duration via constants  
✅ RESTful API design  

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- npm or yarn package manager

### Installation

1. **Navigate to server directory:**
   ```bash
   cd server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` file with your configuration:**
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/whole_sale_erp?schema=public"
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=*
   TRIAL_DURATION_DAYS=7
   ```

5. **Generate Prisma Client:**
   ```bash
   npm run prisma:generate
   ```

6. **Run database migrations:**
   ```bash
   npm run prisma:migrate
   ```

7. **Start the development server:**
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:3000`

---

## API Endpoints

### Health Check

**GET** `/health`

Check if the server is running.

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-10-26T00:00:00.000Z"
}
```

---

### Register User

**POST** `/api/register`

Register a new user and automatically create a 7-day trial license.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "createdAt": "2025-10-26T00:00:00.000Z"
    },
    "license": {
      "licenseKey": "A1B2-C3D4-E5F6-G7H8",
      "startDate": "2025-10-26T00:00:00.000Z",
      "endDate": "2025-11-02T00:00:00.000Z",
      "isTrial": true,
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `409 Conflict` - User with this email already exists
- `400 Bad Request` - Missing required fields

---

### Login User

**POST** `/api/login`

Authenticate user and return user info with license details.

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePassword123!"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "createdAt": "2025-10-26T00:00:00.000Z"
    },
    "license": {
      "licenseKey": "A1B2-C3D4-E5F6-G7H8",
      "startDate": "2025-10-26T00:00:00.000Z",
      "endDate": "2025-11-02T00:00:00.000Z",
      "isTrial": true,
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid email or password
- `404 Not Found` - License not found for user
- `400 Bad Request` - Missing required fields

---

### Validate License

**POST** `/api/validate-license`

Validate a license key and check if it's still active.

**Request Body:**
```json
{
  "licenseKey": "A1B2-C3D4-E5F6-G7H8"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "License is valid",
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "license": {
      "licenseKey": "A1B2-C3D4-E5F6-G7H8",
      "startDate": "2025-10-26T00:00:00.000Z",
      "endDate": "2025-11-02T00:00:00.000Z",
      "isTrial": true,
      "status": "active"
    }
  }
}
```

**Error Responses:**
- `403 Forbidden` - License has expired or been revoked
- `404 Not Found` - License not found
- `400 Bad Request` - Missing license key

---

## Configuration

### Trial Duration

To modify the trial license duration, update the `TRIAL_DURATION_DAYS` constant in:

**File:** `server/.env`
```env
TRIAL_DURATION_DAYS=7
```

Or modify the constant in:

**File:** `server/src/config/constants.ts`
```typescript
export const TRIAL_DURATION_DAYS = parseInt(process.env.TRIAL_DURATION_DAYS || '7', 10);
```

### JWT Configuration

Configure JWT settings in `.env`:
```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
```

### Database Configuration

Update PostgreSQL connection string in `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/whole_sale_erp?schema=public"
```

---

## Database Schema

### User Table

| Column    | Type     | Description                |
|-----------|----------|----------------------------|
| id        | UUID     | Primary key                |
| name      | String   | User's full name           |
| email     | String   | Unique email (login)       |
| password  | String   | Hashed password (bcrypt)   |
| createdAt | DateTime | Account creation timestamp |
| updatedAt | DateTime | Last update timestamp      |

### License Table

| Column     | Type     | Description                    |
|------------|----------|--------------------------------|
| id         | UUID     | Primary key                    |
| licenseKey | String   | Unique license key (XXXX-XXXX) |
| userId     | UUID     | Foreign key to User            |
| startDate  | DateTime | License start date             |
| endDate    | DateTime | License expiry date            |
| isTrial    | Boolean  | True for trial licenses        |
| status     | String   | active, expired, revoked       |
| createdAt  | DateTime | License creation timestamp     |
| updatedAt  | DateTime | Last update timestamp          |

---

## Postman Collection

Import the Postman collection for easy API testing:

**File:** `server/postman-collection.json`

### Import Steps:
1. Open Postman
2. Click **Import**
3. Select `server/postman-collection.json`
4. Collection "Whole Sale ERP - License Management API" will be added

The collection includes:
- ✅ Health check endpoint
- ✅ User registration with example request/response
- ✅ User login with example request/response
- ✅ License validation with multiple scenarios
- ✅ Error response examples

---

## Scripts

| Command                | Description                          |
|------------------------|--------------------------------------|
| `npm run dev`          | Start development server with watch |
| `npm run build`        | Build TypeScript to JavaScript       |
| `npm start`            | Run production server                |
| `npm run prisma:generate` | Generate Prisma Client            |
| `npm run prisma:migrate`  | Run database migrations           |
| `npm run prisma:studio`   | Open Prisma Studio GUI            |
| `npm run prisma:push`     | Push schema to database           |

---

## Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── constants.ts       # Application constants
│   │   └── database.ts        # Prisma client instance
│   ├── controllers/
│   │   └── auth.controller.ts # Auth logic (register, login, validate)
│   ├── middleware/
│   │   └── auth.ts            # JWT authentication middleware
│   ├── routes/
│   │   └── auth.routes.ts     # Auth routes definition
│   ├── utils/
│   │   ├── bcrypt.ts          # Password hashing utilities
│   │   ├── jwt.ts             # JWT token utilities
│   │   └── license.ts         # License generation utilities
│   └── index.ts               # Express app entry point
├── prisma/
│   └── schema.prisma          # Database schema
├── .env.example               # Environment variables template
├── .gitignore                 # Git ignore rules
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── postman-collection.json    # Postman API collection
```

---

## Security Considerations

### Password Security
- ✅ Passwords are hashed using bcrypt with 10 salt rounds
- ✅ Plain text passwords are never stored in the database
- ✅ Password comparison is done using constant-time comparison

### JWT Security
- ✅ JWT tokens expire after configured duration (default: 7 days)
- ✅ JWT secret should be a strong, random string in production
- ✅ Tokens are verified on protected routes using middleware

### Database Security
- ✅ Use environment variables for database credentials
- ✅ Enable SSL/TLS for PostgreSQL connections in production
- ✅ Use Prisma's parameterized queries to prevent SQL injection

### Environment Variables
- ✅ Never commit `.env` file to version control
- ✅ Use different secrets for development and production
- ✅ Rotate JWT secrets periodically

---

## Troubleshooting

### Cannot connect to PostgreSQL

**Error:** `Can't reach database server at localhost:5432`

**Solution:**
1. Ensure PostgreSQL is running: `pg_ctl status`
2. Check database credentials in `.env`
3. Verify database exists: `psql -l`
4. Create database if needed: `createdb whole_sale_erp`

### Prisma Client not found

**Error:** `@prisma/client did not initialize yet`

**Solution:**
```bash
npm run prisma:generate
```

### Port already in use

**Error:** `Port 3000 is already in use`

**Solution:**
1. Change PORT in `.env` to a different value
2. Or kill the process using port 3000

---

## Development Workflow

1. **Make schema changes** in `prisma/schema.prisma`
2. **Create migration:** `npm run prisma:migrate`
3. **Generate client:** `npm run prisma:generate`
4. **Update code** as needed
5. **Test endpoints** using Postman collection
6. **Check logs** for errors

---

## Production Deployment

### Environment Setup

1. **Set production environment variables:**
   ```env
   NODE_ENV=production
   DATABASE_URL=<production-postgres-url>
   JWT_SECRET=<strong-random-secret>
   CORS_ORIGIN=<your-electron-app-origin>
   ```

2. **Build the application:**
   ```bash
   npm run build
   ```

3. **Start production server:**
   ```bash
   npm start
   ```

### Recommended Production Setup

- Use a managed PostgreSQL service (AWS RDS, Heroku Postgres, etc.)
- Deploy behind a reverse proxy (Nginx, Caddy)
- Enable HTTPS/SSL
- Set up monitoring and logging
- Configure rate limiting
- Enable CORS only for your app's origin

---

## Next Steps (Phase 2.2)

After Phase 2.1 is complete, proceed to:

1. **Electron Main Process Integration**
   - Set up local SQLite database with Prisma
   - Create IPC handlers for communication
   - Implement license manager service

2. **React UI Implementation**
   - Build registration and login forms
   - Add trial status display
   - Implement routing

---

## Support

For issues or questions:
- Check the Postman collection for request examples
- Review error messages in server logs
- Verify environment variables are set correctly
- Ensure PostgreSQL is running and accessible

---

**Status:** ✅ Phase 2.1 Complete  
**Version:** 1.0.0  
**Last Updated:** October 26, 2025
