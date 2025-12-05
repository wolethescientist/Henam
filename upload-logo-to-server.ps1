# Upload Logo to Cloud Server
# This script uploads the company logo to your cloud server

Write-Host "=== Henam Logo Upload Script ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$SERVER_USER = "root"  # Change this to your server username
$SERVER_HOST = "henam.linkpc.net"  # Your server hostname
$LOCAL_LOGO = "uploads/company_logo/henam_logo.jpg"
$REMOTE_PATH = "/root/henam-backend/uploads/company_logo/"

Write-Host "Checking if logo file exists locally..." -ForegroundColor Yellow
if (-Not (Test-Path $LOCAL_LOGO)) {
    Write-Host "ERROR: Logo file not found at $LOCAL_LOGO" -ForegroundColor Red
    Write-Host "Please ensure the logo file exists before running this script." -ForegroundColor Red
    exit 1
}

Write-Host "Logo file found!" -ForegroundColor Green
Write-Host ""

Write-Host "This script will upload the logo to your server using SCP." -ForegroundColor Yellow
Write-Host "Server: $SERVER_USER@$SERVER_HOST" -ForegroundColor Cyan
Write-Host "Local file: $LOCAL_LOGO" -ForegroundColor Cyan
Write-Host "Remote path: $REMOTE_PATH" -ForegroundColor Cyan
Write-Host ""

$confirm = Read-Host "Do you want to proceed? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Upload cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Uploading logo to server..." -ForegroundColor Yellow
Write-Host ""

# Using SCP to upload the file
# Note: You'll need to have SSH access configured to your server
# If you're using password authentication, you'll be prompted for the password

Write-Host "Command: scp $LOCAL_LOGO ${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}" -ForegroundColor Gray
Write-Host ""

# Execute the SCP command
scp $LOCAL_LOGO "${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Logo uploaded successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Verify the logo is accessible at: https://henam.linkpc.net/uploads/company_logo/henam_logo.jpg" -ForegroundColor White
    Write-Host "2. Check file permissions on the server: chmod 644 $REMOTE_PATH/henam_logo.jpg" -ForegroundColor White
    Write-Host "3. Restart your backend service if needed: sudo systemctl restart henam" -ForegroundColor White
    Write-Host "4. Clear browser cache and test the login page" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "✗ Upload failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Ensure you have SSH access to the server" -ForegroundColor White
    Write-Host "2. Check if the remote directory exists" -ForegroundColor White
    Write-Host "3. Verify your SSH key or password is correct" -ForegroundColor White
    Write-Host "4. Try manual upload: scp $LOCAL_LOGO ${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}" -ForegroundColor White
}

Write-Host ""
