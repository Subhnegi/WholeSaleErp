# Server Deployment Guide

## 🚫 NEVER DO THIS IN PRODUCTION
```bash
npx prisma migrate dev      # ❌ Creates NEW migrations
npx prisma migrate reset    # ❌ Deletes all data
npx prisma db push          # ❌ Bypasses migration history
```

## ✅ Proper Migration Workflow

### Development (Local)
```bash
cd server

# 1. Make schema changes in prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_company_and_financial_year

# 3. Test migration
npm run dev

# 4. Commit to git
git add prisma/migrations
git commit -m "feat: add Company and FinancialYear models"
git push origin main
```

### Production (Server)
```bash
# 1. Pull latest code
git pull origin main

# 2. Install dependencies (if package.json changed)
npm install

# 3. Apply migrations (does NOT create new ones)
npm run prisma:migrate:deploy
# or: npx prisma migrate deploy

# 4. Regenerate Prisma Client
npm run prisma:generate

# 5. Restart server
pm2 restart whole-sale-erp-server
# or whatever process manager you use
```

## 📝 Migration Commands

| Command | Use Case | Environment |
|---------|----------|-------------|
| `prisma migrate dev` | Create + apply migrations | Development ONLY |
| `prisma migrate deploy` | Apply existing migrations | Production |
| `prisma migrate reset` | Drop DB + reapply all | Development ONLY |
| `prisma db push` | Prototype without migrations | Development (temporary) |
| `prisma migrate resolve` | Fix migration conflicts | Both (carefully) |

## 🔄 After Schema Changes

1. ✅ Run `npx prisma migrate dev` locally
2. ✅ Test thoroughly
3. ✅ Commit migration files to git
4. ✅ Push to repository
5. ✅ Pull on production server
6. ✅ Run `npx prisma migrate deploy` on production
7. ✅ Restart server

## 🆘 If Migration Conflicts Occur

### Scenario 1: Migration exists in DB but not in local files
```bash
# Option A: Reset dev database (loses data)
npx prisma migrate reset

# Option B: Mark as rolled back (production)
npx prisma migrate resolve --rolled-back MIGRATION_NAME
```

### Scenario 2: Schema drift detected
```bash
# Development: Reset and start fresh
npx prisma migrate reset

# Production: NEVER reset, contact team lead
```

## 📌 Golden Rules

1. **Development machine**: Use `prisma migrate dev`
2. **Production server**: Use `prisma migrate deploy`
3. **Always commit** migration files
4. **Never edit** migration files manually
5. **Never delete** migration files
6. **Test migrations** locally before deploying

## 🔐 Production Safety Checklist

Before running migrations on production:
- [ ] Backup database
- [ ] Test migration on staging/dev database
- [ ] Check migration doesn't drop data
- [ ] Plan downtime if needed
- [ ] Have rollback plan ready
- [ ] Notify team members

## 📞 Emergency Contacts

If something goes wrong:
- Database Admin: [contact]
- DevOps Lead: [contact]
- Backup location: [path]
