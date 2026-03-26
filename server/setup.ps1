# Quick Setup Script for whole Sale ERP Server
# Run this script to set up and start the server

Write-Host "
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   whole Sale ERP Server - Quick Setup                  ║
║   Phase 2.1 - License Management Backend              ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
" -ForegroundColor Cyan

# Navigate to server directory
Write-Host "`n[1/7] Navigating to server directory..." -ForegroundColor Yellow
Set-Location server

# Install dependencies
Write-Host "`n[2/7] Installing dependencies..." -ForegroundColor Yellow
npm install

# Copy environment file
Write-Host "`n[3/7] Setting up environment variables..." -ForegroundColor Yellow
if (!(Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "✅ Created .env file from template" -ForegroundColor Green
    Write-Host "⚠️  Please edit .env file with your PostgreSQL credentials!" -ForegroundColor Red
    Write-Host "   Then run this script again.`n" -ForegroundColor Red
    
    # Open .env file for editing
    notepad .env
    exit
} else {
    Write-Host "✅ .env file already exists" -ForegroundColor Green
}

# Generate Prisma Client
Write-Host "`n[4/7] Generating Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate

# Run database migrations
Write-Host "`n[5/7] Running database migrations..." -ForegroundColor Yellow
Write-Host "⚠️  Make sure PostgreSQL is running!" -ForegroundColor Yellow
try {
    npm run prisma:migrate
    Write-Host "✅ Database migrations completed" -ForegroundColor Green
} catch {
    Write-Host "❌ Migration failed. Please check your database connection." -ForegroundColor Red
    Write-Host "   Verify DATABASE_URL in .env file" -ForegroundColor Red
    exit
}

# Build the application
Write-Host "`n[6/7] Building application..." -ForegroundColor Yellow
npm run build

# Start the server
Write-Host "`n[7/7] Starting development server..." -ForegroundColor Yellow
Write-Host "`n✨ Server setup complete! Starting server...`n" -ForegroundColor Green

npm run dev
