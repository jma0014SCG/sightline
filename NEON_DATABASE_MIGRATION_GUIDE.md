# 🚀 Neon Database Production Migration Guide

## ✅ Migration Status: COMPLETE

Your Neon database schema has been successfully migrated from the development branch to the production branch!

## 📊 Schema Migration Summary

### Production Branch Tables (Now Complete)
- ✅ `Category` - Content categorization
- ✅ `Tag` - Content tagging with types
- ✅ `UsageEvent` - User activity tracking
- ✅ `User` - User accounts
- ✅ `Summary` - Video summaries
- ✅ `ShareLink` - Public share functionality
- ✅ `progress` - Task progress tracking
- ✅ `_SummaryCategories` - Many-to-many relations
- ✅ `_SummaryTags` - Many-to-many relations
- ✅ `neon_auth.users_sync` - Neon Auth integration
- ✅ Removed obsolete `Account` and `Session` tables

## 🔐 Connection Strings

### Development Branch (Current)
```
DATABASE_URL="postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-plain-king-aec6xvqs-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
```
- **Branch**: `br-still-mode-ae6vp2f4` (development)
- **Endpoint**: `ep-plain-king-aec6xvqs`
- **Status**: Used for local development

### Production Branch (Ready for Use)
```
DATABASE_URL="postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-royal-sun-aer2owja-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
```
- **Branch**: `br-square-grass-aevimefi` (production)
- **Endpoint**: `ep-royal-sun-aer2owja`
- **Status**: Schema migrated and ready

## 📋 Environment Configuration Steps

### 1. Update Local Production Environment
```bash
# Edit .env.production
DATABASE_URL="postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-royal-sun-aer2owja-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-royal-sun-aer2owja.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

### 2. Update Vercel Environment Variables
```bash
# Using Vercel CLI
vercel env add DATABASE_URL production
# When prompted, enter the production connection string above

# OR Update via Vercel Dashboard
# 1. Go to: https://vercel.com/jma0014-gmailcoms-projects/sightline-ai/settings/environment-variables
# 2. Find DATABASE_URL
# 3. Update the production value to the new connection string
```

### 3. Update Railway Backend (if applicable)
```bash
# Railway CLI
railway variables set DATABASE_URL="postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-royal-sun-aer2owja-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

# OR via Railway Dashboard
# 1. Go to your Railway project
# 2. Click on Variables
# 3. Update DATABASE_URL to the production connection string
```

## 🧪 Testing the Production Database

### 1. Test Connection Locally
```bash
# Set production environment
export DATABASE_URL="postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-royal-sun-aer2owja-pooler.c-2.us-east-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require"

# Test with Prisma
pnpm db:generate
pnpm db:studio

# OR Test with script
node scripts/test-db.js
```

### 2. Verify Schema
```bash
# Connect to production database
psql "postgresql://neondb_owner:npg_XsFhlf67yAHS@ep-royal-sun-aer2owja-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"

# List all tables
\\dt public.*
\\dt neon_auth.*
```

### 3. Deploy to Production
```bash
# Deploy with new database
vercel --prod --force

# Monitor deployment
vercel logs --prod
```

## 🔄 Branch Management

### Current Neon Project Structure
```
Project: sightline-production (bitter-forest-93357182)
├── production (br-square-grass-aevimefi) - READY FOR USE
│   └── Complete schema with all tables
├── development (br-still-mode-ae6vp2f4) - DEFAULT/PRIMARY
│   └── Active development branch
└── vercel-dev (br-bold-glade-aeomb9xz) - Preview branch
```

### Switching Between Branches
```bash
# For development (local)
DATABASE_URL="...ep-plain-king-aec6xvqs..."  # development endpoint

# For production (deployed)
DATABASE_URL="...ep-royal-sun-aer2owja..."   # production endpoint
```

## ⚠️ Important Notes

1. **Data Migration**: The schema has been migrated, but data from development branch hasn't been copied. If you need to migrate data:
   ```sql
   -- Connect to both databases and use pg_dump/pg_restore
   pg_dump -h ep-plain-king-aec6xvqs-pooler.c-2.us-east-2.aws.neon.tech ... | \\
   pg_restore -h ep-royal-sun-aer2owja-pooler.c-2.us-east-2.aws.neon.tech ...
   ```

2. **Prisma Migrations**: After switching to production, run:
   ```bash
   pnpm db:generate
   pnpm db:push  # For first time
   # OR
   pnpm db:migrate deploy  # For production deployments
   ```

3. **Connection Pooling**: The connection strings use pooled connections (`-pooler` endpoints) which are recommended for serverless environments like Vercel.

4. **Security**: Never commit the actual database credentials to git. Use environment variables.

## 🎯 Next Steps

1. [ ] Update `.env.production` with production DATABASE_URL
2. [ ] Update Vercel environment variables
3. [ ] Test connection locally with production database
4. [ ] Deploy to Vercel with `vercel --prod`
5. [ ] Monitor application for any database connectivity issues
6. [ ] Consider setting up database backups for production branch

## 🆘 Troubleshooting

### Connection Issues
- Verify the connection string endpoint matches the branch
- Check SSL mode is set to `require`
- Ensure channel_binding is included for pooled connections

### Schema Sync Issues
- Run `pnpm db:push` to sync Prisma schema with database
- Use `pnpm db:studio` to visually inspect the database

### Performance Issues
- Monitor connection pool usage in Neon dashboard
- Consider upgrading compute size if needed
- Enable connection pooling for better performance

## 📚 Resources

- [Neon Dashboard](https://console.neon.tech/app/projects/bitter-forest-93357182)
- [Neon Branching Documentation](https://neon.tech/docs/introduction/branching)
- [Prisma with Neon](https://neon.tech/docs/guides/prisma)
- [Connection Pooling](https://neon.tech/docs/connect/connection-pooling)

---
*Migration completed: 2025-08-26*
*Production branch ready for deployment*