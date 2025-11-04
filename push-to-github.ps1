# PowerShell script to push code to GitHub
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Push Code to GitHub Repository" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
try {
    $gitVersion = git --version
    Write-Host "✓ Git is installed: $gitVersion" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "✗ ERROR: Git is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Git from https://git-scm.com/download/win" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if .git directory exists
if (-not (Test-Path ".git")) {
    Write-Host "Initializing Git repository..." -ForegroundColor Yellow
    git init
    Write-Host ""
}

# Check if remote exists
$remoteExists = git remote get-url origin 2>$null
if (-not $remoteExists) {
    Write-Host "Adding remote repository..." -ForegroundColor Yellow
    git remote add origin https://github.com/wolethescientist/Henam.git
    Write-Host ""
} else {
    Write-Host "Remote repository already exists. Updating URL..." -ForegroundColor Yellow
    git remote set-url origin https://github.com/wolethescientist/Henam.git
    Write-Host ""
}

# Add all files
Write-Host "Adding all files to staging..." -ForegroundColor Yellow
git add .
Write-Host ""

# Commit changes
$commitMessage = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "Add deployment configurations and requirements"
}
Write-Host "Committing changes..." -ForegroundColor Yellow
git commit -m $commitMessage
Write-Host ""

# Push to GitHub
Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
Write-Host ""
Write-Host "If this is your first push, you may need to authenticate." -ForegroundColor Cyan
Write-Host ""

try {
    git push -u origin main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Push to 'main' branch failed. Trying 'master' branch..." -ForegroundColor Yellow
        git push -u origin master 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            throw "Push failed"
        }
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Success! Code pushed to GitHub" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Repository: https://github.com/wolethescientist/Henam" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Verify files on GitHub" -ForegroundColor White
    Write-Host "2. Deploy backend to Railway" -ForegroundColor White
    Write-Host "3. Deploy frontend to Vercel" -ForegroundColor White
    Write-Host ""
    Write-Host "See DEPLOYMENT.md for detailed deployment instructions." -ForegroundColor Cyan
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host " Push Failed!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "1. Authentication required - you may need a Personal Access Token" -ForegroundColor White
    Write-Host "2. Remote repository has content - try pulling first" -ForegroundColor White
    Write-Host "3. Branch name mismatch" -ForegroundColor White
    Write-Host ""
    Write-Host "Solutions:" -ForegroundColor Yellow
    Write-Host "1. Try: git pull origin main --allow-unrelated-histories" -ForegroundColor White
    Write-Host "2. Then run this script again" -ForegroundColor White
    Write-Host "3. Or check push-to-github.md for detailed instructions" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Read-Host "Press Enter to exit"
