@echo off
echo ========================================
echo  Push Code to GitHub Repository
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/download/win
    pause
    exit /b 1
)

echo Git is installed. Proceeding...
echo.

REM Check if .git directory exists
if not exist ".git" (
    echo Initializing Git repository...
    git init
    echo.
)

REM Check if remote exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo Adding remote repository...
    git remote add origin https://github.com/wolethescientist/Henam.git
    echo.
) else (
    echo Remote repository already exists. Updating URL...
    git remote set-url origin https://github.com/wolethescientist/Henam.git
    echo.
)

REM Add all files
echo Adding all files to staging...
git add .
echo.

REM Commit changes
echo Committing changes...
set /p commit_message="Enter commit message (or press Enter for default): "
if "%commit_message%"=="" (
    set commit_message=Add deployment configurations and requirements
)
git commit -m "%commit_message%"
echo.

REM Push to GitHub
echo Pushing to GitHub...
echo.
echo If this is your first push, you may need to authenticate.
echo.
git push -u origin main
if errorlevel 1 (
    echo.
    echo Push to 'main' branch failed. Trying 'master' branch...
    git push -u origin master
    if errorlevel 1 (
        echo.
        echo ========================================
        echo  Push Failed!
        echo ========================================
        echo.
        echo Possible reasons:
        echo 1. Authentication required - you may need a Personal Access Token
        echo 2. Remote repository has content - try pulling first
        echo 3. Branch name mismatch
        echo.
        echo Solutions:
        echo 1. Try: git pull origin main --allow-unrelated-histories
        echo 2. Then run this script again
        echo 3. Or check push-to-github.md for detailed instructions
        echo.
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo  Success! Code pushed to GitHub
echo ========================================
echo.
echo Repository: https://github.com/wolethescientist/Henam
echo.
echo Next steps:
echo 1. Verify files on GitHub
echo 2. Deploy backend to Railway
echo 3. Deploy frontend to Vercel
echo.
echo See DEPLOYMENT.md for detailed deployment instructions.
echo.
pause
