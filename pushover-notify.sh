#!/bin/bash

# Pushover notification script for Portugal Running deployment failures
# Usage: ./pushover-notify.sh "Title" "Message" [priority]

set -e

# Configuration
PUSHOVER_PASS="api/pushover/production"  # Pass entry contains token:user format
PUSHOVER_API_URL="https://api.pushover.net/1/messages.json"

# Default values
TITLE="${1:-Deployment Failure}"
MESSAGE="${2:-An error occurred during deployment}"
PRIORITY="${3:-2}"  # Emergency priority by default

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[NOTIFY]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[NOTIFY-WARN]${NC} $1"
}

error() {
    echo -e "${RED}[NOTIFY-ERROR]${NC} $1"
    exit 1
}

# Get pushover credentials from pass
get_pushover_credentials() {
    if ! command -v pass &> /dev/null; then
        error "pass command not found. Cannot retrieve pushover credentials."
    fi
    
    PUSHOVER_CREDS=$(pass "$PUSHOVER_PASS" 2>/dev/null || echo "")
    
    if [[ -z "$PUSHOVER_CREDS" ]]; then
        error "Cannot retrieve pushover credentials from pass: $PUSHOVER_PASS"
    fi
    
    # Check if credentials contain both token and user (token:user format)
    if [[ "$PUSHOVER_CREDS" == *":"* ]]; then
        PUSHOVER_TOKEN="${PUSHOVER_CREDS%%:*}"
        PUSHOVER_USER="${PUSHOVER_CREDS##*:}"
    else
        # If no colon, assume it's just a token and user needs to be provided differently
        PUSHOVER_TOKEN="$PUSHOVER_CREDS"
        PUSHOVER_USER="$PUSHOVER_CREDS"  # Fallback - might need adjustment
    fi
    
    if [[ -z "$PUSHOVER_TOKEN" || -z "$PUSHOVER_USER" ]]; then
        error "Invalid pushover credentials format. Expected 'token:user' or individual token/user"
    fi
}

# Send pushover notification
send_notification() {
    log "Sending pushover notification: $TITLE"
    
    local response
    response=$(curl -s \
        --form-string "token=$PUSHOVER_TOKEN" \
        --form-string "user=$PUSHOVER_USER" \
        --form-string "title=$TITLE" \
        --form-string "message=$MESSAGE" \
        --form-string "priority=$PRIORITY" \
        --form-string "sound=bugle" \
        "$PUSHOVER_API_URL")
    
    if echo "$response" | grep -q '"status":1'; then
        log "Notification sent successfully"
    else
        warn "Failed to send notification. Response: $response"
        return 1
    fi
}

# Main function
main() {
    if [[ "$1" == "--help" || "$1" == "-h" ]]; then
        echo "Pushover Notification Script"
        echo ""
        echo "Usage: $0 \"Title\" \"Message\" [priority]"
        echo ""
        echo "Arguments:"
        echo "  Title     Notification title"
        echo "  Message   Notification message"
        echo "  Priority  Pushover priority (default: 2 = emergency)"
        echo ""
        echo "Priority levels:"
        echo "  -2 = Lowest priority"
        echo "  -1 = Low priority"
        echo "   0 = Normal priority"
        echo "   1 = High priority"
        echo "   2 = Emergency priority (requires acknowledgment)"
        exit 0
    fi
    
    get_pushover_credentials
    send_notification
}

# Run if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi