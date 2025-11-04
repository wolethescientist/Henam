# Deployment Guide

This guide covers deploying the Henam Management System with the frontend on Vercel and the backend on Railway.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Railway account (free tier works)
- Supabase PostgreSQL database (already configured)
- Redis instance (Railway provides this)

---

## Backend Deployment (Railway)

### Step 1: Prepare Your Repository

1. Ensure all backend files are committed to your Git repository
2. Make sure these files exist in your root directory:
   - `requirements.txt` ✅
   - `Procfile` ✅
   - `runtime.txt` ✅
   - `.env.example` ✅

### Step 2: Deploy to Railway

1. Go to [Railway.app](https://railway.app) and sign in
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Railway will auto-detect it's a Python app

### Step 3: Configure Environment Variables

In Railway dashboard, go to your project → Variables tab and add:

```env
# Database
DATABASE_URL=postgresql://postgres.xqzjawdleexutrtawxrc:henam@aws-1-us-east-2.pooler.supabase.com:6543/postgres

# JWT
SECRET_KEY=<your-secret-key-from-.env>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Web Push
VAPID_PRIVATE_KEY=<your-vapid-private-key>
VAPID_PUBLIC_KEY=<your-vapid-public-key>
VAPID_CLAIMS_EMAIL=davidaiyewumi1@gmail.com

# App Settings
DEBUG=False
ENVIRONMENT=production

# Redis (Railway will provide this - see Step 4)
REDIS_HOST=<will-be-provided-by-railway>
REDIS_PORT=6379
REDIS_DB=0
REDIS_MAX_CONNECTIONS=20

# WebSocket
MAX_WS_CONNECTIONS_PER_USER=3

# Email/SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=henamcleaning@gmail.com
SMTP_PASSWORD=<your-smtp-password>
EMAIL_FROM=henamcleaning@gmail.com
SMTP_USE_TLS=false
SMTP_USE_SSL=true
APP_NAME=Henam Management System

# Frontend URL (will be updated after Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app
```

### Step 4: Add Redis to Railway

1. In your Railway project, click "New" → "Database" → "Add Redis"
2. Railway will automatically create a Redis instance
3. Copy the Redis connection details:
   - Go to Redis service → Variables tab
   - Copy `REDIS_PRIVATE_URL` or individual values (HOST, PORT)
4. Update your backend service environment variables:
   - `REDIS_HOST` = Redis host from Railway
   - `REDIS_PORT` = 6379 (default)

### Step 5: Configure CORS

After deploying frontend to Vercel, update `app/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://your-app.vercel.app",  # Add your Vercel URL
        "https://your-custom-domain.com"  # If you have a custom domain
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
```

### Step 6: Deploy

1. Railway will automatically deploy when you push to your main branch
2. Once deployed, you'll get a URL like: `https://your-app.up.railway.app`
3. Test the API: `https://your-app.up.railway.app/health`

---

## Frontend Deployment (Vercel)

### Step 1: Update Environment Variables

Create/update `henam-frontend/.env.production`:

```env
# API Configuration - Update with your Railway backend URL
VITE_API_URL=https://your-app.up.railway.app

# App Configuration
VITE_APP_NAME=Henam Task Management
VITE_APP_VERSION=1.0.0

# Feature Flags
VITE_ENABLE_PUSH_NOTIFICATIONS=true
VITE_ENABLE_ANALYTICS=false

# Production
VITE_DEBUG=false
```

### Step 2: Verify Build Configuration

Ensure `henam-frontend/package.json` has the correct build script:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```

### Step 3: Deploy to Vercel

#### Option A: Using Vercel CLI

```bash
cd henam-frontend
npm install -g vercel
vercel login
vercel
```

#### Option B: Using Vercel Dashboard

1. Go to [Vercel.com](https://vercel.com) and sign in
2. Click "Add New" → "Project"
3. Import your Git repository
4. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `henam-frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### Step 4: Configure Environment Variables in Vercel

In Vercel dashboard → Your Project → Settings → Environment Variables:

Add these variables:

```
VITE_API_URL = https://your-app.up.railway.app
VITE_APP_NAME = Henam Task Management
VITE_APP_VERSION = 1.0.0
VITE_ENABLE_PUSH_NOTIFICATIONS = true
VITE_ENABLE_ANALYTICS = false
VITE_DEBUG = false
```

### Step 5: Deploy

1. Vercel will automatically deploy
2. You'll get a URL like: `https://your-app.vercel.app`
3. Test the frontend by visiting the URL

---

## Post-Deployment Configuration

### 1. Update Backend CORS

Go back to Railway and update the `FRONTEND_URL` environment variable:

```env
FRONTEND_URL=https://your-app.vercel.app
```

Also update `app/main.py` CORS settings (commit and push):

```python
allow_origins=[
    "http://localhost:5173",
    "https://your-app.vercel.app"
]
```

### 2. Update Frontend API URL

If you haven't already, ensure the frontend `.env.production` has the correct Railway backend URL.

### 3. Test the Integration

1. Visit your Vercel frontend URL
2. Try logging in
3. Check that API calls work correctly
4. Test WebSocket connections
5. Verify email notifications work

---

## Custom Domains (Optional)

### For Vercel (Frontend)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow Vercel's DNS configuration instructions

### For Railway (Backend)

1. Go to Railway Dashboard → Your Project → Settings
2. Click "Generate Domain" or add a custom domain
3. Update CORS settings in backend to include the new domain

---

## Monitoring & Logs

### Railway (Backend)

- View logs: Railway Dashboard → Your Project → Deployments → View Logs
- Monitor metrics: Railway Dashboard → Your Project → Metrics

### Vercel (Frontend)

- View logs: Vercel Dashboard → Your Project → Deployments → View Function Logs
- Monitor analytics: Vercel Dashboard → Your Project → Analytics

---

## Troubleshooting

### Backend Issues

**Database Connection Errors:**
- Verify `DATABASE_URL` is correct in Railway environment variables
- Check Supabase connection pooler is accessible
- Ensure IP allowlist in Supabase includes Railway IPs (or set to allow all)

**Redis Connection Errors:**
- Verify Redis service is running in Railway
- Check `REDIS_HOST` and `REDIS_PORT` are correct
- Redis is optional - app will work without it (caching disabled)

**CORS Errors:**
- Ensure frontend URL is in CORS `allow_origins` list
- Check `FRONTEND_URL` environment variable is set correctly
- Verify no trailing slashes in URLs

### Frontend Issues

**API Connection Errors:**
- Verify `VITE_API_URL` points to correct Railway backend URL
- Check Railway backend is running and accessible
- Test backend health endpoint: `https://your-backend.up.railway.app/health`

**Build Errors:**
- Check all dependencies are installed: `npm install`
- Verify TypeScript compilation: `npm run build` locally
- Check Vercel build logs for specific errors

**Environment Variables Not Working:**
- Ensure all env vars start with `VITE_` prefix
- Redeploy after adding/changing environment variables
- Clear browser cache and hard refresh

---

## Scaling Considerations

### Railway Backend

- **Free Tier**: 500 hours/month, $5 credit
- **Upgrade**: For production, consider upgrading to Pro plan
- **Database**: Supabase handles scaling automatically
- **Redis**: Railway Redis scales with your plan

### Vercel Frontend

- **Free Tier**: Unlimited bandwidth for personal projects
- **Upgrade**: For commercial use, consider Pro plan
- **CDN**: Vercel automatically uses global CDN

---

## Security Checklist

- [ ] Change `SECRET_KEY` to a strong random value
- [ ] Set `DEBUG=False` in production
- [ ] Use environment variables for all sensitive data
- [ ] Enable HTTPS only (both platforms do this by default)
- [ ] Configure proper CORS origins (no wildcards in production)
- [ ] Use strong database passwords
- [ ] Enable Supabase Row Level Security (RLS) if needed
- [ ] Regularly update dependencies
- [ ] Monitor logs for suspicious activity
- [ ] Set up proper backup strategy for database

---

## Backup Strategy

### Database (Supabase)

1. Supabase provides automatic daily backups
2. For manual backups:
   ```bash
   pg_dump $DATABASE_URL > backup.sql
   ```

### Redis (Railway)

- Redis data is cache only (can be regenerated)
- No backup needed for cache data

---

## Continuous Deployment

Both Railway and Vercel support automatic deployments:

1. **Push to main branch** → Automatic deployment
2. **Pull requests** → Preview deployments (Vercel)
3. **Rollback** → Both platforms support instant rollback

---

## Support & Resources

- **Railway Docs**: https://docs.railway.app
- **Vercel Docs**: https://vercel.com/docs
- **FastAPI Docs**: https://fastapi.tiangolo.com
- **Vite Docs**: https://vitejs.dev

---

## Quick Reference

### Backend URLs
- Health Check: `https://your-backend.up.railway.app/health`
- API Docs: `https://your-backend.up.railway.app/docs`
- Database Health: `https://your-backend.up.railway.app/health/db`

### Frontend URLs
- Production: `https://your-app.vercel.app`
- Preview: `https://your-app-git-branch.vercel.app`

### Important Commands

```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd henam-frontend
npm install
npm run build
npm run preview

# Deploy
git add .
git commit -m "Deploy updates"
git push origin main
```

---

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Update CORS and environment variables
4. ✅ Test the full application
5. ✅ Set up custom domains (optional)
6. ✅ Configure monitoring and alerts
7. ✅ Set up backup strategy
8. ✅ Document any custom configurations

Good luck with your deployment! 🚀
