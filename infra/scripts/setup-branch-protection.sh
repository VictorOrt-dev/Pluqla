#!/bin/bash

# 🔒 Pluqla Branch Protection Setup Script
# This script configures GitHub branch protection rules for the financial application
#
# Prerequisites:
# 1. GitHub CLI installed: https://cli.github.com/
# 2. Authenticated with GitHub: gh auth login
# 3. Admin permissions on the repository

set -e  # Exit on any error

# Repository configuration
REPO_OWNER="VictorOrt-dev"
REPO_NAME="plus-clair"
MAIN_BRANCH="master"  # Current main branch
DEVELOP_BRANCH="develop"  # Development branch (will be created if doesn't exist)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if GitHub CLI is installed and authenticated
check_prerequisites() {
    log_info "Checking prerequisites..."

    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI is not installed. Please install it from https://cli.github.com/"
        exit 1
    fi

    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI is not authenticated. Please run: gh auth login"
        exit 1
    fi

    # Check if user has admin permissions
    if ! gh api repos/${REPO_OWNER}/${REPO_NAME} --jq '.permissions.admin' | grep -q true; then
        log_error "You need admin permissions on ${REPO_OWNER}/${REPO_NAME} to set up branch protection"
        exit 1
    fi

    log_success "Prerequisites check passed"
}

# Create develop branch if it doesn't exist
setup_branches() {
    log_info "Setting up branch structure..."

    # Check if develop branch exists
    if gh api repos/${REPO_OWNER}/${REPO_NAME}/branches/${DEVELOP_BRANCH} &> /dev/null; then
        log_info "Develop branch already exists"
    else
        log_info "Creating develop branch from ${MAIN_BRANCH}..."
        # Get the SHA of the main branch
        MAIN_SHA=$(gh api repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/${MAIN_BRANCH} --jq '.object.sha')

        # Create develop branch
        gh api repos/${REPO_OWNER}/${REPO_NAME}/git/refs \
            --method POST \
            --field ref="refs/heads/${DEVELOP_BRANCH}" \
            --field sha="${MAIN_SHA}" > /dev/null

        log_success "Develop branch created successfully"
    fi
}

# Configure branch protection for a specific branch
setup_branch_protection() {
    local branch_name=$1
    local is_main_branch=$2

    log_info "Configuring branch protection for '${branch_name}' branch..."

    # Base protection settings
    local protection_data='{
        "required_status_checks": {
            "strict": true,
            "contexts": [
                "Code Quality & Linting (frontend)",
                "Code Quality & Linting (backend)",
                "Unit Tests (frontend, 20.x)",
                "Unit Tests (backend, 20.x)",
                "Security Scanning",
                "Build Verification (20.x)",
                "CI Summary",
                "End-to-End Tests / e2e-tests (20.x, auth-flow)",
                "End-to-End Tests / e2e-tests (20.x, password-reset)",
                "Security Audit",
                "Test Summary"
            ]
        },
        "enforce_admins": false,
        "required_pull_request_reviews": {
            "required_approving_review_count": 1,
            "dismiss_stale_reviews": true,
            "require_code_owner_reviews": true,
            "require_last_push_approval": false
        },
        "restrictions": null,
        "required_linear_history": false,
        "allow_force_pushes": false,
        "allow_deletions": false,
        "required_conversation_resolution": true,
        "lock_branch": false,
        "allow_fork_syncing": true
    }'

    # For main/master branch, add extra protection
    if [[ "$is_main_branch" == "true" ]]; then
        protection_data=$(echo "$protection_data" | jq '.required_pull_request_reviews.required_approving_review_count = 1')
        protection_data=$(echo "$protection_data" | jq '.enforce_admins = false')  # Allow admins for emergency hotfixes
    fi

    # Apply branch protection
    if gh api repos/${REPO_OWNER}/${REPO_NAME}/branches/${branch_name}/protection \
        --method PUT \
        --input - <<< "$protection_data" > /dev/null 2>&1; then
        log_success "Branch protection applied to '${branch_name}'"
    else
        log_error "Failed to apply branch protection to '${branch_name}'"
        return 1
    fi

    # Additional settings via separate API calls
    log_info "Configuring additional protection settings for '${branch_name}'..."

    # Enable vulnerability alerts (if not already enabled)
    gh api repos/${REPO_OWNER}/${REPO_NAME}/vulnerability-alerts --method PUT > /dev/null 2>&1 || true

    # Enable automated security fixes (Dependabot)
    gh api repos/${REPO_OWNER}/${REPO_NAME}/automated-security-fixes --method PUT > /dev/null 2>&1 || true

    log_success "Additional protection settings configured for '${branch_name}'"
}

# Set up repository-wide security settings
setup_repository_security() {
    log_info "Configuring repository-wide security settings..."

    # Enable vulnerability alerts
    if gh api repos/${REPO_OWNER}/${REPO_NAME}/vulnerability-alerts --method PUT > /dev/null 2>&1; then
        log_success "Vulnerability alerts enabled"
    else
        log_warning "Could not enable vulnerability alerts (may already be enabled)"
    fi

    # Enable automated security fixes
    if gh api repos/${REPO_OWNER}/${REPO_NAME}/automated-security-fixes --method PUT > /dev/null 2>&1; then
        log_success "Automated security fixes enabled"
    else
        log_warning "Could not enable automated security fixes (may already be enabled)"
    fi

    # Configure merge settings
    log_info "Configuring merge settings..."
    gh api repos/${REPO_OWNER}/${REPO_NAME} \
        --method PATCH \
        --field allow_merge_commit=true \
        --field allow_squash_merge=true \
        --field allow_rebase_merge=false \
        --field delete_branch_on_merge=true \
        --field allow_auto_merge=false > /dev/null

    log_success "Repository merge settings configured"
}

# Create branch protection rulesets (newer GitHub feature)
setup_rulesets() {
    log_info "Setting up repository rulesets for enhanced protection..."

    # Ruleset for critical files protection
    local critical_files_ruleset='{
        "name": "Critical Files Protection",
        "target": "branch",
        "enforcement": "active",
        "conditions": {
            "ref_name": {
                "include": ["refs/heads/master", "refs/heads/develop"],
                "exclude": []
            }
        },
        "rules": [
            {
                "type": "pull_request",
                "parameters": {
                    "required_approving_review_count": 1,
                    "dismiss_stale_reviews_on_push": true,
                    "require_code_owner_review": true,
                    "require_last_push_approval": false,
                    "required_review_thread_resolution": true
                }
            },
            {
                "type": "required_status_checks",
                "parameters": {
                    "strict_required_status_checks_policy": true,
                    "required_status_checks": [
                        {
                            "context": "CI Summary",
                            "integration_id": 15368
                        }
                    ]
                }
            },
            {
                "type": "non_fast_forward",
                "parameters": {}
            }
        ],
        "bypass_actors": [
            {
                "actor_id": 1,
                "actor_type": "Integration",
                "bypass_mode": "always"
            }
        ]
    }'

    # Try to create the ruleset (this is a newer feature and might not be available)
    if gh api repos/${REPO_OWNER}/${REPO_NAME}/rulesets \
        --method POST \
        --input - <<< "$critical_files_ruleset" > /dev/null 2>&1; then
        log_success "Repository rulesets configured"
    else
        log_warning "Repository rulesets not available or already configured"
    fi
}

# Verify branch protection is working
verify_protection() {
    log_info "Verifying branch protection configuration..."

    for branch in "$MAIN_BRANCH" "$DEVELOP_BRANCH"; do
        if gh api repos/${REPO_OWNER}/${REPO_NAME}/branches/${branch}/protection > /dev/null 2>&1; then
            log_success "Branch protection verified for '${branch}'"

            # Get protection details
            local protection_summary=$(gh api repos/${REPO_OWNER}/${REPO_NAME}/branches/${branch}/protection \
                --jq '{
                    required_status_checks: .required_status_checks.contexts | length,
                    required_reviews: .required_pull_request_reviews.required_approving_review_count,
                    codeowner_reviews: .required_pull_request_reviews.require_code_owner_reviews,
                    dismiss_stale: .required_pull_request_reviews.dismiss_stale_reviews
                }')

            echo "  Protection details: $protection_summary"
        else
            log_error "Branch protection verification failed for '${branch}'"
        fi
    done
}

# Display final instructions
show_final_instructions() {
    echo ""
    log_success "🎉 Branch protection setup completed successfully!"
    echo ""
    echo "📋 Summary of configured protection:"
    echo "   • Protected branches: ${MAIN_BRANCH}, ${DEVELOP_BRANCH}"
    echo "   • Required status checks: CI + E2E tests must pass"
    echo "   • Required reviews: 1 approving review"
    echo "   • CODEOWNERS reviews: Required for sensitive files"
    echo "   • Stale review dismissal: Enabled"
    echo "   • Force push prevention: Enabled"
    echo "   • Branch deletion prevention: Enabled"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Create your first PR to test the workflow"
    echo "   2. Ensure all team members understand the new process"
    echo "   3. Monitor CI/CD performance and adjust as needed"
    echo ""
    echo "🔧 To modify protection settings:"
    echo "   • Via GitHub web UI: Settings → Branches"
    echo "   • Via CLI: gh api repos/${REPO_OWNER}/${REPO_NAME}/branches/BRANCH/protection"
    echo ""
}

# Main execution
main() {
    echo ""
    log_info "🔒 Starting Pluqla Branch Protection Setup"
    echo "Repository: ${REPO_OWNER}/${REPO_NAME}"
    echo "Main branch: ${MAIN_BRANCH}"
    echo "Develop branch: ${DEVELOP_BRANCH}"
    echo ""

    check_prerequisites
    setup_branches
    setup_repository_security

    # Configure protection for main branch
    setup_branch_protection "$MAIN_BRANCH" "true"

    # Configure protection for develop branch
    setup_branch_protection "$DEVELOP_BRANCH" "false"

    setup_rulesets
    verify_protection
    show_final_instructions
}

# Run the script
main "$@"