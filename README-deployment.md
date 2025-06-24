# Deployment Guide - Portugal Running Frontend

This guide explains how to deploy the Portugal Running frontend as a standalone Node.js application.

## Prerequisites

- Node.js 18+ installed on your VPS
- PM2 (optional, for process management)

## Build for Production

1. Install dependencies:
```bash
npm install
```

2. Build the application:
```bash
npm run build
```

This creates a standalone build in `.next/standalone/` that includes:
- The Next.js server
- All necessary dependencies
- Your application code
- Static assets in `.next/standalone/public/`
- Server files in `.next/standalone/.next/`

## Deploy to VPS

1. Copy the standalone folder to your VPS:
```bash
rsync -avz .next/standalone/ user@your-vps:/path/to/app/
```

2. Copy static files (if any):
```bash
rsync -avz .next/static/ user@your-vps:/path/to/app/.next/static/
```

3. Copy public folder (if modified):
```bash
rsync -avz public/ user@your-vps:/path/to/app/public/
```

## Run the Application

### Option 1: Direct Node.js
```bash
cd /path/to/app
PORT=3000 node server.js
```

### Option 2: Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start the application
cd /path/to/app
pm2 start server.js --name "portugal-running" --env PORT=3000

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option 3: Using systemd
Create a service file `/etc/systemd/system/portugal-running.service`:

```ini
[Unit]
Description=Portugal Running Frontend
After=network.target

[Service]
Type=simple
User=youruser
WorkingDirectory=/path/to/app
Environment=PORT=3000
ExecStart=/usr/bin/node server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl enable portugal-running
sudo systemctl start portugal-running
```

## Environment Variables

Set any required environment variables before starting:
```bash
export PORT=3000
export NODE_ENV=production
```

## Nginx Configuration (Optional)

For production, you might want to use Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring

Monitor your application logs:
- PM2: `pm2 logs portugal-running`
- systemd: `journalctl -u portugal-running -f`
- Direct: Application logs will appear in console

## Updates

To update the application:
1. Build locally with `npm run build`
2. Stop the running application
3. Copy new files to VPS
4. Start the application again