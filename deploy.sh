#!/bin/bash

# Portugal Running Deployment Script
# Automates deployment to a remote server with systemd units

set -e  # Exit on any error

# Configuration
REMOTE_HOST="${1:-portugal-run-calendar}"
DEPLOY_USER="${2:-diogo464}"
DEPLOY_PATH="/opt/portugal-running"
ENV_FILE="/etc/systemd/system/portugal-run.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    # Send pushover notification for deployment failure
    if [[ -f "./pushover-notify.sh" ]]; then
        ./pushover-notify.sh "Portugal Running Deployment Failed" "$1" 2 >/dev/null 2>&1 || true
    fi
    exit 1
}

# Check if secrets are available
check_secrets() {
    log "Checking for required secrets..."
    
    if ! command -v pass &> /dev/null; then
        error "pass command not found. Please install pass password manager."
    fi
    
    GOOGLE_MAPS_API_KEY=$(pass google-geocoding-api-key 2>/dev/null || echo "")
    ANTHROPIC_API_KEY=$(pass api/anthropic 2>/dev/null || echo "")
    OPENROUTER_KEY=$(pass api/openrouter 2>/dev/null || echo "")
    
    if [[ -z "$GOOGLE_MAPS_API_KEY" || -z "$ANTHROPIC_API_KEY" || -z "$OPENROUTER_KEY" ]]; then
        error "Missing required secrets. Please ensure you have stored:
  - google-geocoding-api-key
  - api/anthropic
  - api/openrouter
in your pass password store."
    fi
    
    log "All required secrets found"
}

# Test SSH connection
test_ssh() {
    log "Testing SSH connection to $REMOTE_HOST..."
    if ! ssh "$REMOTE_HOST" "echo 'SSH connection successful'" >/dev/null 2>&1; then
        error "Cannot connect to $REMOTE_HOST via SSH. Please check your SSH configuration."
    fi
    log "SSH connection successful"
}

# Install uv on remote server
install_uv() {
    log "Installing uv on remote server..."
    ssh "$REMOTE_HOST" "curl -LsSf https://astral.sh/uv/install.sh | sh"
    log "uv installed successfully"
}

# Create deployment directory
create_deployment_dir() {
    log "Creating deployment directory..."
    ssh "$REMOTE_HOST" "sudo mkdir -p $DEPLOY_PATH && sudo chown $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH"
    log "Deployment directory created at $DEPLOY_PATH"
}

# Create environment file with secrets
create_env_file() {
    log "Creating systemd environment file with secrets..."
    ssh "$REMOTE_HOST" "sudo tee $ENV_FILE > /dev/null << 'EOF'
GOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
OPENROUTER_KEY=$OPENROUTER_KEY
EOF"
    ssh "$REMOTE_HOST" "sudo chmod 600 $ENV_FILE"
    log "Environment file created and secured"
}

# Create systemd service units
create_systemd_units() {
    log "Creating systemd service units..."
    
    # Failure notification service
    ssh "$REMOTE_HOST" "sudo tee /etc/systemd/system/portugal-run-notify-failure@.service > /dev/null << 'EOF'
[Unit]
Description=Portugal Running Failure Notification for %i
DefaultDependencies=false

[Service]
Type=oneshot
User=$DEPLOY_USER
Group=$DEPLOY_USER
ExecStart=$DEPLOY_PATH/systemd-notify-failure.sh %i
Environment=PATH=/home/$DEPLOY_USER/.local/bin:/usr/local/bin:/usr/bin:/bin
EOF"

    # Server service
    ssh "$REMOTE_HOST" "sudo tee /etc/systemd/system/portugal-run-server.service > /dev/null << 'EOF'
[Unit]
Description=Portugal Running Server
After=network.target
Requires=network.target
OnFailure=portugal-run-notify-failure@%n.service

[Service]
Type=simple
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$DEPLOY_PATH
ExecStart=/usr/bin/just serve
EnvironmentFile=$ENV_FILE
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF"

    # Scraper service
    ssh "$REMOTE_HOST" "sudo tee /etc/systemd/system/portugal-run-scraper.service > /dev/null << 'EOF'
[Unit]
Description=Portugal Running Scraper
After=network.target
Requires=network.target
OnFailure=portugal-run-notify-failure@%n.service

[Service]
Type=oneshot
User=$DEPLOY_USER
Group=$DEPLOY_USER
WorkingDirectory=$DEPLOY_PATH
ExecStart=/usr/bin/just scrape
EnvironmentFile=$ENV_FILE
Environment=PATH=/home/$DEPLOY_USER/.local/bin:/usr/local/bin:/usr/bin:/bin
StandardOutput=journal
StandardError=journal
EOF"

    # Scraper timer
    ssh "$REMOTE_HOST" "sudo tee /etc/systemd/system/portugal-run-scraper.timer > /dev/null << 'EOF'
[Unit]
Description=Portugal Running Scraper Timer
Requires=portugal-run-scraper.service

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF"

    log "Systemd units created successfully"
}

# Build application locally
build_app() {
    log "Building application locally..."
    if ! command -v just &> /dev/null; then
        error "just command not found. Please install just build tool."
    fi
    
    just build
    log "Application built successfully"
}

# Deploy application
deploy_app() {
    log "Deploying application to remote server..."
    rsync -avz --delete . "$REMOTE_HOST:$DEPLOY_PATH/" \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.next/cache' \
        --exclude='deploy.sh'
    
    # Install dependencies on remote server
    log "Installing dependencies on remote server..."
    ssh "$REMOTE_HOST" "cd $DEPLOY_PATH && npm install"
    
    log "Application deployed successfully"
}

# Enable and start services
enable_services() {
    log "Enabling and starting systemd services..."
    ssh "$REMOTE_HOST" "sudo systemctl daemon-reload"
    ssh "$REMOTE_HOST" "sudo systemctl enable portugal-run-server.service"
    ssh "$REMOTE_HOST" "sudo systemctl enable portugal-run-scraper.timer"
    ssh "$REMOTE_HOST" "sudo systemctl restart portugal-run-server.service"
    ssh "$REMOTE_HOST" "sudo systemctl restart portugal-run-scraper.timer"
    log "Services enabled and started"
}

# Test deployment
test_deployment() {
    log "Testing deployment..."
    
    # Wait a moment for service to start
    sleep 5
    
    local has_failures=false
    
    # Check service status
    if ssh "$REMOTE_HOST" "sudo systemctl is-active portugal-run-server.service" | grep -q "active"; then
        log "Server service is running"
    else
        warn "Server service may not be running properly"
        ssh "$REMOTE_HOST" "sudo journalctl -u portugal-run-server.service -n 10"
        has_failures=true
        if [[ -f "./pushover-notify.sh" ]]; then
            ./pushover-notify.sh "Portugal Running Server Failed" "Server service failed to start properly during deployment" 2 >/dev/null 2>&1 || true
        fi
    fi
    
    # Check timer status
    if ssh "$REMOTE_HOST" "sudo systemctl is-active portugal-run-scraper.timer" | grep -q "active"; then
        log "Scraper timer is active"
    else
        warn "Scraper timer may not be active"
        has_failures=true
        if [[ -f "./pushover-notify.sh" ]]; then
            ./pushover-notify.sh "Portugal Running Scraper Timer Failed" "Scraper timer failed to activate during deployment" 2 >/dev/null 2>&1 || true
        fi
    fi
    
    # Test HTTP response
    if ssh "$REMOTE_HOST" "curl -s http://localhost:3000" | grep -q "Portugal Run Calendar"; then
        log "Application is responding correctly"
    else
        warn "Application may not be responding correctly"
        has_failures=true
        if [[ -f "./pushover-notify.sh" ]]; then
            ./pushover-notify.sh "Portugal Running App Not Responding" "Application health check failed - not responding on port 3000" 2 >/dev/null 2>&1 || true
        fi
    fi
    
    if [[ "$has_failures" == "true" ]]; then
        error "Deployment testing failed - see warnings above"
    fi
    
    log "Deployment testing completed"
}

# Show status
show_status() {
    log "Deployment Status:"
    echo ""
    echo "Server Service:"
    ssh "$REMOTE_HOST" "sudo systemctl status portugal-run-server.service --no-pager -l"
    echo ""
    echo "Scraper Timer:"
    ssh "$REMOTE_HOST" "sudo systemctl status portugal-run-scraper.timer --no-pager -l"
    echo ""
    echo "Next scraper run:"
    ssh "$REMOTE_HOST" "sudo systemctl list-timers portugal-run-scraper.timer --no-pager"
}

# Main deployment function
main() {
    log "Starting Portugal Running deployment to $REMOTE_HOST"
    
    # Pre-flight checks
    check_secrets
    test_ssh
    
    # Server setup
    install_uv
    create_deployment_dir
    create_env_file
    create_systemd_units
    
    # Application deployment
    build_app
    deploy_app
    
    # Service management
    enable_services
    
    # Verification
    test_deployment
    show_status
    
    log "Deployment completed successfully!"
    log "Server is running on http://$REMOTE_HOST:3000"
    log "Scraper will run daily at 3:00 AM UTC"
}

# Handle script arguments
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    echo "Portugal Running Deployment Script"
    echo ""
    echo "Usage: $0 [REMOTE_HOST] [DEPLOY_USER]"
    echo ""
    echo "Arguments:"
    echo "  REMOTE_HOST   Remote server hostname (default: portugal-run-calendar)"
    echo "  DEPLOY_USER   Remote user for deployment (default: diogo464)"
    echo ""
    echo "Prerequisites:"
    echo "  - SSH access to remote server"
    echo "  - sudo privileges on remote server"
    echo "  - pass password manager with required secrets"
    echo "  - just build tool installed locally"
    echo ""
    echo "Required secrets in pass:"
    echo "  - google-geocoding-api-key"
    echo "  - api/anthropic"
    echo "  - api/openrouter"
    exit 0
fi

# Run main deployment
main "$@"
