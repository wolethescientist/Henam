# Deployment Checklist

## ✅ Files Created

All necessary deployment files have been created:

- ✅ `requirements.txt` - All Python dependencies
- ✅ `Procfile` - Railway deployment configuration
- ✅ `runtime.txt` - Python version specification
- ✅ `.env.example` - Environment variables template
- ✅ `henam-frontend/vercel.json` - Vercel configuration
- ✅ `DEPLOYMENT.md` - Complete deployment guide

## 📋 Pre-Deployment Checklist

### Backend Preparation

- [ ] Review `requirements.txt` - all packages are included
- [ ] Verify `.env` has all required variables
- [ ] Test backend locally: `uvicorn app.main:app --reload`
- [ ] Commit all changes to Git
- [ ] Push to GitHub/GitLab

### Frontend Preparation

- [ ] Update `henam-frontend/.env` with production API URL (after Railway deployment)
- [ ] Test frontend build: `cd henam-frontend && npm run build`
- [ ] Verify all environment variables start with `VITE_`
- [ ] Commit all changes to Git

## 🚀 Deployment Steps

### Step 1: Deploy Backend to Railway (Do This First)

1. [ ] Go to [Railway.app](https://railway.app)
2. [ ] Create new project from GitHub repo
3. [ ] Add Redis database to project
4. [ ] Configure environment variables (see DEPLOYMENT.md)
5. [ ] Wait for deployment to complete
6. [ ] Copy your Railway backend URL (e.g., `https://your-app.up.railway.app`)
7. [ ] Test health endpoint: `https://your-app.up.railway.app/health`

**Important Environment Variables for Railway:**
```
DATABASE_URL=<your-supabase-url>
SECRET_KEY=<your-secret-key>
REDIS_HOST=<from-railway-redis>
REDIS_PORT=6379
SMTP_USERNAME=henamcleaning@gmail.com
SMTP_PASSWORD=<your-smtp-password>
FRONTEND_URL=<will-update-after-vercel>
DEBUG=False
ENVIRONMENT=production
```

### Step 2: Deploy Frontend to Vercel

1. [ ] Go to [Vercel.com](https://vercel.com)
2. [ ] Import your GitHub repository
3. [ ] Set root directory to `henam-frontend`
4. [ ] Configure environment variables:
   ```
   VITE_API_URL=<your-railway-backend-url>
   VITE_APP_NAME=Henam Task Management
   VITE_DEBUG=false
   ```
5. [ ] Deploy
6. [ ] Copy your Vercel URL (e.g., `https://your-app.vercel.app`)

### Step 3: Update CORS Configuration

1. [ ] Go back to Railway
2. [ ] Update `FRONTEND_URL` environment variable with your Vercel URL
3. [ ] Update `app/main.py` CORS settings:
   ```python
   allow_origins=[
       "http://localhost:5173",
       "https://your-app.vercel.app"  # Add your Vercel URL
   ]
   ```
4. [ ] Commit and push changes
5. [ ] Railway will auto-redeploy

### Step 4: Test Everything

- [ ] Visit your Vercel frontend URL
- [ ] Test login functionality
- [ ] Check API calls work (Network tab in DevTools)
- [ ] Test WebSocket connections (notifications)
- [ ] Verify email notifications work
- [ ] Test file uploads
- [ ] Check Redis caching (backend logs)

## 🔧 Configuration Details

### Required Environment Variables

#### Backend (Railway)
```env
# Database
DATABASE_URL=postgresql://postgres.xqzjawdleexutrtawxrc:henam@aws-1-us-east-2.pooler.supabase.com:6543/postgres

# Security
SECRET_KEY=<your-long-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis (from Railway Redis service)
REDIS_HOST=<railway-redis-host>
REDIS_PORT=6379
REDIS_DB=0
REDIS_MAX_CONNECTIONS=20

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USERNAME=henamcleaning@gmail.com
SMTP_PASSWORD=nutq rnov okdv tigd
EMAIL_FROM=henamcleaning@gmail.com
SMTP_USE_TLS=false
SMTP_USE_SSL=true

# App
APP_NAME=Henam Management System
FRONTEND_URL=<your-vercel-url>
DEBUG=False
ENVIRONMENT=production

# WebSocket
MAX_WS_CONNECTIONS_PER_USER=3

# Web Push (optional)
VAPID_PRIVATE_KEY=16MSmlEnbIe9Lc23cnKOVCJ4k2QQkY8fBYd7RRZGSFo
VAPID_PUBLIC_KEY=BIgSjL9q36lACT4oNsn_ZjzaU2-65rde1JLMYJORF_rv8UbhaH3JMMXhmC6r1BnMCyI8MlJA3dvcsa7CeRRSipo
VAPID_CLAIMS_EMAIL=davidaiyewumi1@gmail.com
```

#### Frontend (Vercel)
```env
VITE_API_URL=<your-railway-backend-url>
VITE_APP_NAME=Henam Task Management
VITE_APP_VERSION=1.0.0
VITE_ENABLE_PUSH_NOTIFICATIONS=true
VITE_ENABLE_ANALYTICS=false
VITE_DEBUG=false
```

## 🐛 Common Issues & Solutions

### Issue: CORS Errors

**Solution:**
1. Verify `FRONTEND_URL` is set in Railway
2. Check CORS origins in `app/main.py` include your Vercel URL
3. Ensure no trailing slashes in URLs
4. Redeploy backend after CORS changes

### Issue: Database Connection Failed

**Solution:**
1. Verify `DATABASE_URL` is correct in Railway
2. Check Supabase allows connections from Railway IPs
3. Test connection: `psql $DATABASE_URL`

### Issue: Redis Connection Failed

**Solution:**
1. Verify Redis service is running in Railway
2. Check `REDIS_HOST` and `REDIS_PORT` are correct
3. Note: App works without Redis (caching disabled)

### Issue: Environment Variables Not Working

**Solution:**
1. Frontend: Ensure all vars start with `VITE_`
2. Redeploy after changing environment variables
3. Clear browser cache
4. Check Vercel/Railway logs for errors

### Issue: Build Fails

**Backend:**
- Check `requirements.txt` has all dependencies
- Verify Python version in `runtime.txt` (3.11)
- Check Railway build logs

**Frontend:**
- Run `npm install` to ensure all deps are installed
- Test build locally: `npm run build`
- Check TypeScript errors: `npm run build`
- Review Vercel build logs

## 📊 Monitoring

### Railway Backend
- **Logs**: Railway Dashboard → Your Project → Deployments → Logs
- **Metrics**: Railway Dashboard → Your Project → Metrics
- **Health**: `https://your-backend.up.railway.app/health`
- **API Docs**: `https://your-backend.up.railway.app/docs`

### Vercel Frontend
- **Logs**: Vercel Dashboard → Your Project → Deployments → Logs
- **Analytics**: Vercel Dashboard → Your Project → Analytics
- **Preview**: Each PR gets a preview deployment

## 🔒 Security Checklist

- [ ] `SECRET_KEY` is strong and unique
- [ ] `DEBUG=False` in production
- [ ] All sensitive data in environment variables
- [ ] CORS configured with specific origins (no wildcards)
- [ ] HTTPS enabled (automatic on both platforms)
- [ ] Database password is strong
- [ ] SMTP credentials are secure
- [ ] Regular dependency updates scheduled

## 💰 Cost Estimates

### Railway (Backend)
- **Free Tier**: $5 credit/month, 500 hours
- **Hobby Plan**: $5/month for more resources
- **Redis**: Included in plan

### Vercel (Frontend)
- **Hobby (Free)**: Unlimited bandwidth for personal projects
- **Pro**: $20/month for commercial use

### Supabase (Database)
- **Free Tier**: 500MB database, 2GB bandwidth
- **Pro**: $25/month for more resources

**Total Estimated Cost (Free Tier)**: $0/month
**Total Estimated Cost (Production)**: ~$30-50/month

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Vite Production Build](https://vitejs.dev/guide/build.html)

## ✅ Post-Deployment

- [ ] Test all features thoroughly
- [ ] Set up monitoring/alerts
- [ ] Configure custom domains (optional)
- [ ] Set up automated backups
- [ ] Document any custom configurations
- [ ] Share URLs with team
- [ ] Update README with production URLs

## 🎉 Success Criteria

Your deployment is successful when:

- ✅ Backend health check returns 200 OK
- ✅ Frontend loads without errors
- ✅ Users can log in successfully
- ✅ API calls work from frontend to backend
- ✅ WebSocket connections establish
- ✅ Email notifications send correctly
- ✅ File uploads work
- ✅ Redis caching is operational
- ✅ No CORS errors in browser console

---

**Need Help?** Refer to the detailed `DEPLOYMENT.md` guide for step-by-step instructions.
