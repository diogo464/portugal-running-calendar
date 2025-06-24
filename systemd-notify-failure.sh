#!/bin/bash

# Systemd failure notification script for Portugal Running services
# This script is called by systemd when a service fails

set -e

# Get service name from environment or argument
SERVICE_NAME="${1:-$SYSTEMD_SERVICE_NAME}"
if [[ -z "$SERVICE_NAME" ]]; then
    echo "Error: No service name provided"
    exit 1
fi

# Configuration
DEPLOY_PATH="/opt/portugal-running"
PUSHOVER_SCRIPT="$DEPLOY_PATH/pushover-notify.sh"

# Check if pushover script exists
if [[ ! -f "$PUSHOVER_SCRIPT" ]]; then
    echo "Error: Pushover notification script not found at $PUSHOVER_SCRIPT"
    exit 1
fi

# Get service status and logs
SERVICE_STATUS=$(systemctl status "$SERVICE_NAME" --no-pager -l || true)
SERVICE_LOGS=$(journalctl -u "$SERVICE_NAME" -n 10 --no-pager || true)

# Create notification message
case "$SERVICE_NAME" in
    "portugal-run-server.service")
        TITLE="Portugal Running Server Failed"
        MESSAGE="The Portugal Running server service has failed and stopped running.

Status:
$SERVICE_STATUS

Recent logs:
$SERVICE_LOGS"
        ;;
    "portugal-run-scraper.service")
        TITLE="Portugal Running Scraper Failed"
        MESSAGE="The Portugal Running scraper service has failed during execution.

Status:
$SERVICE_STATUS

Recent logs:
$SERVICE_LOGS"
        ;;
    *)
        TITLE="Portugal Running Service Failed"
        MESSAGE="Service $SERVICE_NAME has failed.

Status:
$SERVICE_STATUS

Recent logs:
$SERVICE_LOGS"
        ;;
esac

# Send notification
"$PUSHOVER_SCRIPT" "$TITLE" "$MESSAGE" 2