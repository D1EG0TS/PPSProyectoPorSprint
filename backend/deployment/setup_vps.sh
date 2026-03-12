#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting deployment setup..."

# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Python, pip, and venv if missing
sudo apt install -y python3-pip python3-venv python3-dev build-essential libssl-dev libffi-dev

# 3. Create project directory (if not exists)
sudo mkdir -p /var/www/exproof-backend
sudo chown -R $USER:www-data /var/www/exproof-backend

# 4. Navigate to project directory (Assuming you clone/copy files here manually first)
cd /var/www/exproof-backend

# 5. Create virtual environment
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created."
fi

# 6. Activate venv and install dependencies
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# 7. Setup .env file
if [ ! -f ".env" ]; then
    cp deployment/.env.prod .env
    echo "⚠️  Created .env from production template. PLEASE UPDATE JWT_SECRET_KEY!"
fi

# 8. Run migrations
alembic upgrade head

# 9. Setup Systemd Service
echo "🔧 Configuring Systemd service..."
sudo cp deployment/exproof-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable exproof-backend
sudo systemctl restart exproof-backend

# 10. Check status
sudo systemctl status exproof-backend --no-pager

echo "✅ Deployment setup complete! Backend should be running on port 3000."
