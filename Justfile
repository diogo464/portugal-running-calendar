default:
    just --list

stop:
    demon stop dev

dev:
    demon stop dev
    demon run dev npm run dev

logs:
    demon cat dev

tail:
    demon tail -f dev

lint:
    npm run lint

serve:
    cd .next && PORT=3000 node standalone/server.js

build:
    npm run prebuild
    npm run build
    cp -r public/ .next/standalone
    cp -r .next/static .next/standalone/.next

scrape:
    cd scraper && uv run python portugal-running-cli.py scrape
    rm -rf public/events && cp -r scraper/events public/

scrape-and-deploy:
    #!/usr/bin/env bash
    set -e
    
    # Function to send failure notification
    notify_failure() {
        if [[ -f "./pushover-notify.sh" ]]; then
            ./pushover-notify.sh "Portugal Running Local Deploy Failed" "$1" 2 >/dev/null 2>&1 || true
        fi
    }
    
    # Trap errors and send notifications
    trap 'notify_failure "Error occurred during scrape-and-deploy at line $LINENO"' ERR
    
    echo "Starting scrape and deploy process..."
    
    # Run scraper
    echo "Running scraper..."
    cd scraper && uv run python portugal-running-cli.py scrape || {
        notify_failure "Scraper failed to complete successfully"
        exit 1
    }
    cd ..
    
    # Copy events data
    echo "Copying events data..."
    cp scraper/portugal-running-events.json public/events.json || {
        notify_failure "Failed to copy events data from scraper to public directory"
        exit 1
    }
    
    # Build application
    echo "Building application..."
    just build || {
        notify_failure "Application build failed during scrape-and-deploy"
        exit 1
    }
    
    # Restart service
    echo "Restarting server service..."
    sudo systemctl restart portugal-run-server.service || {
        notify_failure "Failed to restart portugal-run-server.service"
        exit 1
    }
    
    # Check if service started successfully
    sleep 2
    if ! sudo systemctl is-active portugal-run-server.service >/dev/null; then
        notify_failure "portugal-run-server.service failed to start after restart"
        exit 1
    fi
    
    echo "Scrape and deploy completed successfully!"
