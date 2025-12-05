#!/bin/bash
# Upload Logo to Cloud Server
# This script uploads the company logo to your cloud server

echo "=== Henam Logo Upload Script ==="
echo ""

# Configuration
SERVER_USER="root"  # Change this to your server username
SERVER_HOST="henam.linkpc.net"  # Your server hostname
LOCAL_LOGO="uploads/company_logo/henam_logo.jpg"
REMOTE_PATH="/root/henam-backend/uploads/company_logo/"

echo "Checking if logo file exists locally..."
if [ ! -f "$LOCAL_LOGO" ]; then
    echo "ERROR: Logo file not found at $LOCAL_LOGO"
    echo "Please ensure the logo file exists before running this script."
    exit 1
fi

echo "✓ Logo file found!"
echo ""

echo "This script will upload the logo to your server using SCP."
echo "Server: $SERVER_USER@$SERVER_HOST"
echo "Local file: $LOCAL_LOGO"
echo "Remote path: $REMOTE_PATH"
echo ""

read -p "Do you want to proceed? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Upload cancelled."
    exit 0
fi

echo ""
echo "Uploading logo to server..."
echo ""

# Using SCP to upload the file
scp "$LOCAL_LOGO" "${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Logo uploaded successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Verify the logo is accessible at: https://henam.linkpc.net/uploads/company_logo/henam_logo.jpg"
    echo "2. Check file permissions on the server: chmod 644 ${REMOTE_PATH}henam_logo.jpg"
    echo "3. Restart your backend service if needed: sudo systemctl restart henam"
    echo "4. Clear browser cache and test the login page"
else
    echo ""
    echo "✗ Upload failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure you have SSH access to the server"
    echo "2. Check if the remote directory exists"
    echo "3. Verify your SSH key or password is correct"
    echo "4. Try manual upload: scp $LOCAL_LOGO ${SERVER_USER}@${SERVER_HOST}:${REMOTE_PATH}"
fi

echo ""
