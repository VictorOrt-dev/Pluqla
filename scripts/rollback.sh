#!/bin/bash

###############################################################################
# Rollback Script for Pluqla Deployment
#
# Performs automatic rollback to previous stable version in case of
# deployment failure or critical health check failures.
#
# Usage:
#   ./scripts/rollback.sh [environment] [version]
#
# Environments:
#   - staging
#   - production
#
# Version (optional):
#   - Specific version tag to rollback to (e.g., v1.2.0)
#   - If not specified, rolls back to previous stable version
#
# Exit codes:
#   0 - Rollback successful
#   1 - Rollback failed
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
TARGET_VERSION=${2:-}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Deployment directories (customize for your infrastructure)
STAGING_DIR="/var/www/pluqla-staging"
PRODUCTION_DIR="/var/www/pluqla-production"

# Backup directory
BACKUP_DIR="$PROJECT_ROOT/backups"

###############################################################################
# Helper Functions
###############################################################################

log_info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_header() {
    echo ""
    echo -e "${BOLD}${BLUE}$1${NC}"
    echo "$(printf '=%.0s' {1..80})"
}

###############################################################################
# Environment Configuration
###############################################################################

get_deployment_dir() {
    if [ "$ENVIRONMENT" = "production" ]; then
        echo "$PRODUCTION_DIR"
    else
        echo "$STAGING_DIR"
    fi
}

get_previous_version() {
    local deploy_dir=$1

    if [ -f "$deploy_dir/CURRENT_VERSION" ]; then
        cat "$deploy_dir/CURRENT_VERSION"
    else
        log_warning "No previous version found"
        echo "unknown"
    fi
}

get_backup_path() {
    local version=$1
    echo "$BACKUP_DIR/$ENVIRONMENT-$version.tar.gz"
}

###############################################################################
# Validation
###############################################################################

validate_environment() {
    log_header "VALIDATING ENVIRONMENT"

    if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
        log_error "Invalid environment: $ENVIRONMENT"
        log_info "Valid environments: staging, production"
        exit 1
    fi

    log_success "Environment: $ENVIRONMENT"

    if [ "$ENVIRONMENT" = "production" ]; then
        log_warning "PRODUCTION ROLLBACK - Proceeding with caution"

        # Require confirmation for production rollback
        if [ -z "$CI" ]; then
            read -p "Are you sure you want to rollback PRODUCTION? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                log_info "Rollback cancelled"
                exit 0
            fi
        fi
    fi
}

###############################################################################
# Rollback Process
###############################################################################

determine_rollback_version() {
    log_header "DETERMINING ROLLBACK VERSION"

    local deploy_dir=$(get_deployment_dir)

    if [ -n "$TARGET_VERSION" ]; then
        ROLLBACK_VERSION="$TARGET_VERSION"
        log_info "Using specified version: $ROLLBACK_VERSION"
    else
        ROLLBACK_VERSION=$(get_previous_version "$deploy_dir")
        log_info "Rolling back to previous version: $ROLLBACK_VERSION"
    fi

    if [ "$ROLLBACK_VERSION" = "unknown" ]; then
        log_error "Cannot determine rollback version"
        exit 1
    fi

    log_success "Rollback target: $ROLLBACK_VERSION"
}

create_current_backup() {
    log_header "CREATING BACKUP OF CURRENT STATE"

    local deploy_dir=$(get_deployment_dir)
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/$ENVIRONMENT-failed-$timestamp.tar.gz"

    mkdir -p "$BACKUP_DIR"

    if [ -d "$deploy_dir" ]; then
        log_info "Backing up current (failed) deployment..."
        tar -czf "$backup_file" -C "$deploy_dir" . 2>/dev/null || true
        log_success "Backup created: $backup_file"
    else
        log_warning "Deployment directory not found, skipping backup"
    fi
}

restore_previous_version() {
    log_header "RESTORING PREVIOUS VERSION"

    local deploy_dir=$(get_deployment_dir)
    local backup_path=$(get_backup_path "$ROLLBACK_VERSION")

    if [ ! -f "$backup_path" ]; then
        log_error "Backup not found: $backup_path"
        log_info "Available backups:"
        ls -lh "$BACKUP_DIR" 2>/dev/null || log_warning "No backups found"
        exit 1
    fi

    log_info "Extracting backup: $backup_path"

    # Stop services (example for PM2, adjust for your setup)
    log_info "Stopping services..."
    pm2 stop pluqla-$ENVIRONMENT 2>/dev/null || log_warning "PM2 app not running"

    # Clear current deployment
    log_info "Clearing current deployment..."
    rm -rf "$deploy_dir"/*

    # Extract backup
    log_info "Extracting previous version..."
    mkdir -p "$deploy_dir"
    tar -xzf "$backup_path" -C "$deploy_dir"

    log_success "Previous version restored"
}

restart_services() {
    log_header "RESTARTING SERVICES"

    local deploy_dir=$(get_deployment_dir)

    # Example: PM2 restart
    log_info "Restarting application..."
    cd "$deploy_dir/server" || exit 1

    if [ "$ENVIRONMENT" = "production" ]; then
        pm2 restart ecosystem.config.js --env production
    else
        pm2 restart ecosystem.config.js --env staging
    fi

    log_success "Services restarted"
}

verify_rollback() {
    log_header "VERIFYING ROLLBACK"

    log_info "Running health checks..."

    # Run health check script
    if node "$SCRIPT_DIR/health-check.js" "$ENVIRONMENT"; then
        log_success "Health checks passed"
        return 0
    else
        log_error "Health checks failed after rollback"
        return 1
    fi
}

update_version_markers() {
    log_header "UPDATING VERSION MARKERS"

    local deploy_dir=$(get_deployment_dir)

    echo "$ROLLBACK_VERSION" > "$deploy_dir/CURRENT_VERSION"
    echo "$(date -u +"%Y-%m-%d %H:%M:%S UTC")" > "$deploy_dir/ROLLBACK_TIMESTAMP"

    log_success "Version markers updated"
}

send_rollback_notification() {
    log_header "SENDING NOTIFICATIONS"

    local status=$1
    local message=""

    if [ "$status" = "success" ]; then
        message="✅ Rollback successful: $ENVIRONMENT to $ROLLBACK_VERSION"
        log_success "$message"
    else
        message="❌ Rollback failed: $ENVIRONMENT (attempted $ROLLBACK_VERSION)"
        log_error "$message"
    fi

    # Example: Send Slack notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK_URL" 2>/dev/null || log_warning "Slack notification failed"
    fi

    # Example: Send email (requires mail command)
    if command -v mail &> /dev/null; then
        echo "$message" | mail -s "[Pluqla] Rollback $status - $ENVIRONMENT" ops@pluqla.com 2>/dev/null || true
    fi
}

###############################################################################
# Main Rollback Process
###############################################################################

main() {
    log_header "🔄 PLUQLA DEPLOYMENT ROLLBACK"

    echo "Environment: $ENVIRONMENT"
    echo "Timestamp:   $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
    echo ""

    # Step 1: Validate
    validate_environment

    # Step 2: Determine rollback version
    determine_rollback_version

    # Step 3: Backup current state
    create_current_backup

    # Step 4: Restore previous version
    restore_previous_version

    # Step 5: Restart services
    restart_services

    # Step 6: Update version markers
    update_version_markers

    # Step 7: Verify rollback
    if verify_rollback; then
        send_rollback_notification "success"

        log_header "🎉 ROLLBACK COMPLETE"
        echo ""
        echo -e "${GREEN}${BOLD}Rollback successful!${NC}"
        echo "Environment: $ENVIRONMENT"
        echo "Rolled back to: $ROLLBACK_VERSION"
        echo "Timestamp: $(date -u +"%Y-%m-%d %H:%M:%S UTC")"
        echo ""
        exit 0
    else
        send_rollback_notification "failed"

        log_header "🚨 ROLLBACK VERIFICATION FAILED"
        echo ""
        echo -e "${RED}${BOLD}Rollback verification failed!${NC}"
        echo "Environment: $ENVIRONMENT"
        echo "Attempted version: $ROLLBACK_VERSION"
        echo ""
        log_error "Manual intervention required"
        exit 1
    fi
}

###############################################################################
# Dry Run Mode (for testing)
###############################################################################

if [ "${DRY_RUN:-}" = "true" ]; then
    log_header "🧪 DRY RUN MODE"
    log_info "Simulating rollback process..."
    log_success "Dry run complete - no changes made"
    exit 0
fi

###############################################################################
# Execute Main Function
###############################################################################

main "$@"
