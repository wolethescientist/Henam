# 🚀 Quick Start Guide

## Push to GitHub (Choose One Method)

### Method 1: Use the Batch Script (Easiest for Windows)
```bash
push-to-github.bat
```
Just double-click the file or run it in Command Prompt.

---

### Method 2: Use PowerShell Script
```powershell
.\push-to-github.ps1
```
Right-click and "Run with PowerShell" or run in PowerShell terminal.

---

### Method 3: Manual Commands (Copy & Paste)

Open Command Prompt or PowerShell and run:

```bash
# Initialize and add remote
git init
git remote add origin https://github.com/wolethescientist/Henam.git

# Add, commit, and push
git add .
git commit -m "Initial commit with deployment configs"
git push -u origin main
```

If `main` doesn't work, try:
```bash
git push -u origin master
```

---

## After Pushing to GitHub

### 1. Deploy Backend to Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `wolethescientist/Henam`
4. Add Redis database (New → Database → Redis)
5. Configure environment variables (see below)
6. Deploy!

**Required Environment Variables:**
```
DATABASE_URL=<your-supabase-url>
SECRET_KEY=<your-secret-key>
REDIS_HOST=<from-railway-redis>
REDIS_PORT=6379
SMTP_USERNAME=henamcleaning@gmail.com
SMTP_PASSWORD=<your-smtp-password>
FRONTEND_URL=<will-update-later>
DEBUG=False
ENVIRONMENT=production
```

### 2. Deploy Frontend to Vercel

1. Go to [Vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import `wolethescientist/Henam`
4. Set **Root Directory**: `henam-frontend`
5. Add environment variable:
   ```
   VITE_API_URL=<your-railway-backend-url>
   ```
6. Deploy!

### 3. Update CORS

1. Go back to Railway
2. Update `FRONTEND_URL` to your Vercel URL
3. Update `app/main.py` CORS settings:
   ```python
   allow_origins=[
       "http://localhost:5173",
       "https://your-app.vercel.app"
   ]
   ```
4. Commit and push changes

---

## Troubleshooting

### Git Authentication Error?

**Option 1: Use Personal Access Token**
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic) with `repo` scope
3. When pushing, use token as password

**Option 2: Use GitHub Desktop**
Download and use [GitHub Desktop](https://desktop.github.com/)

### Push Rejected?

If the repository already has content:
```bash
git pull origin main --allow-unrelated-histories
git push origin main
```

### Wrong Branch Name?

Try both:
```bash
git push -u origin main
# or
git push -u origin master
```

---

## Files Created for Deployment

✅ **Backend:**
- `requirements.txt` - Python dependencies
- `Procfile` - Railway config
- `runtime.txt` - Python version
- `.env.example` - Environment template
- `.gitignore` - Ignore sensitive files

✅ **Frontend:**
- `henam-frontend/vercel.json` - Vercel config

✅ **Documentation:**
- `DEPLOYMENT.md` - Full deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Quick checklist
- `push-to-github.md` - Git instructions
- `QUICK-START.md` - This file!

---

## Need Help?

- **Detailed Instructions**: See `DEPLOYMENT.md`
- **Git Help**: See `push-to-github.md`
- **Checklist**: See `DEPLOYMENT_CHECKLIST.md`

---

## Quick Commands Reference

```bash
# Check git status
git status

# View commit history
git log --oneline

# Pull latest changes
git pull origin main

# Push changes
git add .
git commit -m "Your message"
git push origin main

# View remote URL
git remote -v
```

---

## Success Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed to Railway
- [ ] Redis added to Railway
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured
- [ ] CORS updated with Vercel URL
- [ ] Application tested and working

---

**Repository**: https://github.com/wolethescientist/Henam

Good luck! 🎉
