# 🔒 Pluqla Branch Protection Setup Script (PowerShell)
# This script configures GitHub branch protection rules for the financial application
#
# Prerequisites:
# 1. GitHub CLI installed: winget install GitHub.cli
# 2. Authenticated with GitHub: gh auth login
# 3. Admin permissions on the repository

param(
    [string]$RepoOwner = "VictorOrt-dev",
    [string]$RepoName = "plus-clair",
    [string]$MainBranch = "master",
    [string]$DevelopBranch = "develop"
)

# Error handling
$ErrorActionPreference = "Stop"

# Logging functions
function Write-InfoLog {
    param([string]$Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Write-SuccessLog {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-WarningLog {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-ErrorLog {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-InfoLog "Checking prerequisites..."

    # Check if GitHub CLI is installed
    try {
        $null = Get-Command gh -ErrorAction Stop
    }
    catch {
        Write-ErrorLog "GitHub CLI is not installed. Please install it: winget install GitHub.cli"
        exit 1
    }

    # Check if authenticated
    try {
        gh auth status 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Not authenticated"
        }
    }
    catch {
        Write-ErrorLog "GitHub CLI is not authenticated. Please run: gh auth login"
        exit 1
    }

    # Check admin permissions
    try {
        $permissions = gh api "repos/$RepoOwner/$RepoName" --jq '.permissions.admin' 2>$null
        if ($permissions -ne "true") {
            throw "No admin permissions"
        }
    }
    catch {
        Write-ErrorLog "You need admin permissions on $RepoOwner/$RepoName to set up branch protection"
        exit 1
    }

    Write-SuccessLog "Prerequisites check passed"
}

# Setup branch structure
function Initialize-Branches {
    Write-InfoLog "Setting up branch structure..."

    # Check if develop branch exists
    try {
        gh api "repos/$RepoOwner/$RepoName/branches/$DevelopBranch" 2>$null
        Write-InfoLog "Develop branch already exists"
    }
    catch {
        Write-InfoLog "Creating develop branch from $MainBranch..."

        # Get the SHA of the main branch
        $mainSha = gh api "repos/$RepoOwner/$RepoName/git/refs/heads/$MainBranch" --jq '.object.sha'

        # Create develop branch
        $branchData = @{
            ref = "refs/heads/$DevelopBranch"
            sha = $mainSha
        } | ConvertTo-Json -Depth 2

        gh api "repos/$RepoOwner/$RepoName/git/refs" --method POST --input - --input $branchData >$null
        Write-SuccessLog "Develop branch created successfully"
    }
}

# Configure branch protection
function Set-BranchProtection {
    param(
        [string]$BranchName,
        [bool]$IsMainBranch
    )

    Write-InfoLog "Configuring branch protection for '$BranchName' branch..."

    # Required status checks from both CI workflows
    $statusChecks = @(
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
    )

    $protectionData = @{
        required_status_checks = @{
            strict = $true
            contexts = $statusChecks
        }
        enforce_admins = $false
        required_pull_request_reviews = @{
            required_approving_review_count = 1
            dismiss_stale_reviews = $true
            require_code_owner_reviews = $true
            require_last_push_approval = $false
        }
        restrictions = $null
        required_linear_history = $false
        allow_force_pushes = $false
        allow_deletions = $false
        required_conversation_resolution = $true
        lock_branch = $false
        allow_fork_syncing = $true
    } | ConvertTo-Json -Depth 3

    # Apply branch protection
    try {
        gh api "repos/$RepoOwner/$RepoName/branches/$BranchName/protection" --method PUT --input $protectionData >$null
        Write-SuccessLog "Branch protection applied to '$BranchName'"
    }
    catch {
        Write-ErrorLog "Failed to apply branch protection to '$BranchName'"
        throw
    }
}

# Configure repository security
function Set-RepositorySecurity {
    Write-InfoLog "Configuring repository-wide security settings..."

    # Enable vulnerability alerts
    try {
        gh api "repos/$RepoOwner/$RepoName/vulnerability-alerts" --method PUT >$null
        Write-SuccessLog "Vulnerability alerts enabled"
    }
    catch {
        Write-WarningLog "Could not enable vulnerability alerts (may already be enabled)"
    }

    # Enable automated security fixes
    try {
        gh api "repos/$RepoOwner/$RepoName/automated-security-fixes" --method PUT >$null
        Write-SuccessLog "Automated security fixes enabled"
    }
    catch {
        Write-WarningLog "Could not enable automated security fixes (may already be enabled)"
    }

    # Configure merge settings
    Write-InfoLog "Configuring merge settings..."
    $mergeSettings = @{
        allow_merge_commit = $true
        allow_squash_merge = $true
        allow_rebase_merge = $false
        delete_branch_on_merge = $true
        allow_auto_merge = $false
    } | ConvertTo-Json

    gh api "repos/$RepoOwner/$RepoName" --method PATCH --input $mergeSettings >$null
    Write-SuccessLog "Repository merge settings configured"
}

# Verify protection settings
function Test-Protection {
    Write-InfoLog "Verifying branch protection configuration..."

    foreach ($branch in @($MainBranch, $DevelopBranch)) {
        try {
            gh api "repos/$RepoOwner/$RepoName/branches/$branch/protection" >$null
            Write-SuccessLog "Branch protection verified for '$branch'"

            # Get protection summary
            $protection = gh api "repos/$RepoOwner/$RepoName/branches/$branch/protection" | ConvertFrom-Json
            $summary = @{
                required_status_checks = $protection.required_status_checks.contexts.Count
                required_reviews = $protection.required_pull_request_reviews.required_approving_review_count
                codeowner_reviews = $protection.required_pull_request_reviews.require_code_owner_reviews
                dismiss_stale = $protection.required_pull_request_reviews.dismiss_stale_reviews
            }

            Write-Host "  Protection details: $($summary | ConvertTo-Json -Compress)"
        }
        catch {
            Write-ErrorLog "Branch protection verification failed for '$branch'"
        }
    }
}

# Display final instructions
function Show-FinalInstructions {
    Write-Host ""
    Write-SuccessLog "🎉 Branch protection setup completed successfully!"
    Write-Host ""
    Write-Host "📋 Summary of configured protection:" -ForegroundColor Cyan
    Write-Host "   • Protected branches: $MainBranch, $DevelopBranch"
    Write-Host "   • Required status checks: CI + E2E tests must pass"
    Write-Host "   • Required reviews: 1 approving review"
    Write-Host "   • CODEOWNERS reviews: Required for sensitive files"
    Write-Host "   • Stale review dismissal: Enabled"
    Write-Host "   • Force push prevention: Enabled"
    Write-Host "   • Branch deletion prevention: Enabled"
    Write-Host ""
    Write-Host "🚀 Next steps:" -ForegroundColor Cyan
    Write-Host "   1. Create your first PR to test the workflow"
    Write-Host "   2. Ensure all team members understand the new process"
    Write-Host "   3. Monitor CI/CD performance and adjust as needed"
    Write-Host ""
    Write-Host "🔧 To modify protection settings:" -ForegroundColor Cyan
    Write-Host "   • Via GitHub web UI: Settings → Branches"
    Write-Host "   • Via CLI: gh api repos/$RepoOwner/$RepoName/branches/BRANCH/protection"
    Write-Host ""
}

# Main execution
function Main {
    Write-Host ""
    Write-InfoLog "🔒 Starting Pluqla Branch Protection Setup"
    Write-Host "Repository: $RepoOwner/$RepoName" -ForegroundColor Cyan
    Write-Host "Main branch: $MainBranch" -ForegroundColor Cyan
    Write-Host "Develop branch: $DevelopBranch" -ForegroundColor Cyan
    Write-Host ""

    try {
        Test-Prerequisites
        Initialize-Branches
        Set-RepositorySecurity

        # Configure protection for main branch
        Set-BranchProtection -BranchName $MainBranch -IsMainBranch $true

        # Configure protection for develop branch
        Set-BranchProtection -BranchName $DevelopBranch -IsMainBranch $false

        Test-Protection
        Show-FinalInstructions
    }
    catch {
        Write-ErrorLog "Setup failed: $($_.Exception.Message)"
        exit 1
    }
}

# Run the script
Main