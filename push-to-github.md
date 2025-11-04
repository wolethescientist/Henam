# Push Code to GitHub Repository

## Step-by-Step Commands

### Option 1: If this is a fresh repository (first time)

```bash
# Initialize git repository (if not already initialized)
git init

# Add the remote repository
git remote add origin https://github.com/wolethescientist/Henam.git

# Add all files to staging
git add .

# Commit the changes
git commit -m "Initial commit: Add backend and frontend with deployment configs"

# Push to GitHub (main branch)
git push -u origin main
```

If the push fails because the branch is called "master" instead of "main", use:
```bash
git push -u origin master
```

---

### Option 2: If you already have a git repository

```bash
# Check current remote
git remote -v

# If no remote exists, add it
git remote add origin https://github.com/wolethescientist/Henam.git

# If remote already exists but is different, update it
git remote set-url origin https://github.com/wolethescientist/Henam.git

# Add all files
git add .

# Commit changes
git commit -m "Add deployment configurations and requirements"

# Push to GitHub
git push -u origin main
```

---

### Option 3: If remote repository already has content

If the GitHub repository already has files and you get a "rejected" error:

```bash
# Pull the existing content first
git pull origin main --allow-unrelated-histories

# Resolve any conflicts if they appear
# Then add and commit
git add .
git commit -m "Merge and add deployment configurations"

# Push to GitHub
git push -u origin main
```

---

## Quick Commands (Copy & Paste)

### For a brand new setup:
```bash
git init
git remote add origin https://github.com/wolethescientist/Henam.git
git add .
git commit -m "Initial commit: Add backend and frontend with deployment configs"
git push -u origin main
```

### For updating existing repository:
```bash
git add .
git commit -m "Add deployment configurations and requirements"
git push origin main
```

---

## Important Files Being Pushed

✅ Backend:
- `requirements.txt` - Python dependencies
- `Procfile` - Railway configuration
- `runtime.txt` - Python version
- `.env.example` - Environment variables template
- `app/` - All backend code

✅ Frontend:
- `henam-frontend/` - All frontend code
- `henam-frontend/vercel.json` - Vercel configuration

✅ Documentation:
- `DEPLOYMENT.md` - Deployment guide
- `DEPLOYMENT_CHECKLIST.md` - Quick checklist

---

## Troubleshooting

### Error: "fatal: not a git repository"
**Solution:** Run `git init` first

### Error: "remote origin already exists"
**Solution:** Run `git remote set-url origin https://github.com/wolethescientist/Henam.git`

### Error: "failed to push some refs"
**Solution:** Pull first with `git pull origin main --allow-unrelated-histories`

### Error: "Permission denied (publickey)"
**Solution:** You need to authenticate. Use one of these methods:
1. Use HTTPS with personal access token
2. Set up SSH keys
3. Use GitHub Desktop app

### Using Personal Access Token (Recommended)

If you get authentication errors:

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scopes: `repo` (full control)
4. Copy the token
5. When pushing, use:
   ```bash
   git push https://YOUR_TOKEN@github.com/wolethescientist/Henam.git main
   ```

Or configure credential helper:
```bash
git config --global credential.helper store
git push origin main
# Enter username and paste token as password
```

---

## Verify Push Success

After pushing, verify on GitHub:
1. Go to https://github.com/wolethescientist/Henam
2. Check that all files are present
3. Verify `requirements.txt`, `Procfile`, and other deployment files are there

---

## Next Steps After Pushing

1. ✅ Code is on GitHub
2. 🚀 Deploy backend to Railway (connect to this GitHub repo)
3. 🚀 Deploy frontend to Vercel (connect to this GitHub repo)
4. 🔧 Configure environment variables on both platforms
5. ✅ Test the deployed application

---

## Git Configuration (First Time Setup)

If this is your first time using Git on this machine:

```bash
# Set your name and email
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify configuration
git config --list
```

---

## Useful Git Commands

```bash
# Check status of files
git status

# View commit history
git log --oneline

# View remote repositories
git remote -v

# Create a new branch
git checkout -b feature-branch

# Switch branches
git checkout main

# Pull latest changes
git pull origin main

# View differences
git diff
```

---

## .gitignore Recommendations

Make sure you have a `.gitignore` file to exclude sensitive files:

```
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
build/
dist/
*.egg-info/

# Environment variables
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Uploads
uploads/

# Node modules (frontend)
henam-frontend/node_modules/
henam-frontend/dist/
henam-frontend/.env.local

# Logs
*.log
```

---

Good luck with your deployment! 🚀
