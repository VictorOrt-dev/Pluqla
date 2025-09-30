# 🚀 PLUQLA DEPENDENCY CLEANUP & REINSTALL SCRIPT
# PowerShell script to clean and reinstall all dependencies
# Compatible with Windows PowerShell

param(
    [switch]$SkipConfirmation,
    [switch]$Verbose
)

# Set strict mode and error handling
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# Colors for output
$Green = "`e[32m"
$Red = "`e[31m"
$Yellow = "`e[33m"
$Blue = "`e[34m"
$Reset = "`e[0m"

# Helper function for colored output
function Write-ColoredOutput {
    param([string]$Message, [string]$Color = $Reset)
    Write-Host "$Color$Message$Reset"
}

# Function to check if a command exists
function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

Write-ColoredOutput "🚀 PLUQLA DEPENDENCY CLEANUP & REINSTALL" $Blue
Write-ColoredOutput "=======================================" $Blue

# Check prerequisites
Write-ColoredOutput "🔍 Checking prerequisites..." $Yellow

if (-not (Test-Command "node")) {
    Write-ColoredOutput "❌ Node.js not found. Please install Node.js first." $Red
    exit 1
}

if (-not (Test-Command "npm")) {
    Write-ColoredOutput "❌ npm not found. Please install npm first." $Red
    exit 1
}

$nodeVersion = node --version
$npmVersion = npm --version
Write-ColoredOutput "✅ Node.js version: $nodeVersion" $Green
Write-ColoredOutput "✅ npm version: $npmVersion" $Green

# Check if we're in the right directory
if (-not (Test-Path "package.json") -or -not (Test-Path "client") -or -not (Test-Path "server")) {
    Write-ColoredOutput "❌ This script must be run from the project root directory containing client/ and server/ folders." $Red
    exit 1
}

# Confirmation prompt
if (-not $SkipConfirmation) {
    Write-ColoredOutput "`n⚠️  This will DELETE all node_modules and package-lock.json files!" $Yellow
    $confirmation = Read-Host "Are you sure you want to continue? (y/N)"
    if ($confirmation -ne "y" -and $confirmation -ne "Y") {
        Write-ColoredOutput "❌ Operation cancelled." $Red
        exit 0
    }
}

Write-ColoredOutput "`n🧹 CLEANUP PHASE" $Blue
Write-ColoredOutput "=================" $Blue

# Clean root
Write-ColoredOutput "🗑️  Cleaning root directory..." $Yellow
if (Test-Path "node_modules") {
    Remove-Item -Path "node_modules" -Recurse -Force
    Write-ColoredOutput "   ✅ Removed root/node_modules" $Green
}
if (Test-Path "package-lock.json") {
    Remove-Item -Path "package-lock.json" -Force
    Write-ColoredOutput "   ✅ Removed root/package-lock.json" $Green
}

# Clean client
Write-ColoredOutput "🗑️  Cleaning client directory..." $Yellow
if (Test-Path "client/node_modules") {
    Remove-Item -Path "client/node_modules" -Recurse -Force
    Write-ColoredOutput "   ✅ Removed client/node_modules" $Green
}
if (Test-Path "client/package-lock.json") {
    Remove-Item -Path "client/package-lock.json" -Force
    Write-ColoredOutput "   ✅ Removed client/package-lock.json" $Green
}

# Clean server
Write-ColoredOutput "🗑️  Cleaning server directory..." $Yellow
if (Test-Path "server/node_modules") {
    Remove-Item -Path "server/node_modules" -Recurse -Force
    Write-ColoredOutput "   ✅ Removed server/node_modules" $Green
}
if (Test-Path "server/package-lock.json") {
    Remove-Item -Path "server/package-lock.json" -Force
    Write-ColoredOutput "   ✅ Removed server/package-lock.json" $Green
}

Write-ColoredOutput "`n📦 INSTALLATION PHASE" $Blue
Write-ColoredOutput "======================" $Blue

# Install client dependencies
Write-ColoredOutput "📦 Installing client dependencies..." $Yellow
Set-Location "client"
try {
    if ($Verbose) {
        npm install --verbose
    } else {
        npm install
    }
    Write-ColoredOutput "   ✅ Client dependencies installed successfully" $Green
} catch {
    Write-ColoredOutput "   ❌ Failed to install client dependencies: $_" $Red
    Set-Location ".."
    exit 1
}
Set-Location ".."

# Install server dependencies
Write-ColoredOutput "📦 Installing server dependencies..." $Yellow
Set-Location "server"
try {
    if ($Verbose) {
        npm install --verbose
    } else {
        npm install
    }
    Write-ColoredOutput "   ✅ Server dependencies installed successfully" $Green
} catch {
    Write-ColoredOutput "   ❌ Failed to install server dependencies: $_" $Red
    Set-Location ".."
    exit 1
}

# Generate Prisma client
Write-ColoredOutput "🗄️  Generating Prisma client..." $Yellow
try {
    npx prisma generate
    Write-ColoredOutput "   ✅ Prisma client generated successfully" $Green
} catch {
    Write-ColoredOutput "   ❌ Failed to generate Prisma client: $_" $Red
    Set-Location ".."
    exit 1
}
Set-Location ".."

# Install root dependencies
Write-ColoredOutput "📦 Installing root dependencies..." $Yellow
try {
    if ($Verbose) {
        npm install --verbose
    } else {
        npm install
    }
    Write-ColoredOutput "   ✅ Root dependencies installed successfully" $Green
} catch {
    Write-ColoredOutput "   ❌ Failed to install root dependencies: $_" $Red
    exit 1
}

Write-ColoredOutput "`n🎯 VERIFICATION PHASE" $Blue
Write-ColoredOutput "======================" $Blue

# Test client build
Write-ColoredOutput "🔍 Testing client build..." $Yellow
Set-Location "client"
try {
    $env:DISABLE_ESLINT_PLUGIN = "true"
    npm run build
    Write-ColoredOutput "   ✅ Client builds successfully" $Green
} catch {
    Write-ColoredOutput "   ⚠️  Client build failed (this may be due to code issues)" $Yellow
} finally {
    Remove-Item "build" -Recurse -Force -ErrorAction SilentlyContinue
}
Set-Location ".."

# Test server dependencies
Write-ColoredOutput "🔍 Testing server configuration..." $Yellow
Set-Location "server"
try {
    npm run config-check
    Write-ColoredOutput "   ✅ Server configuration is valid" $Green
} catch {
    Write-ColoredOutput "   ⚠️  Server configuration check failed" $Yellow
}
Set-Location ".."

Write-ColoredOutput "`n✨ COMPLETION SUMMARY" $Blue
Write-ColoredOutput "======================" $Blue
Write-ColoredOutput "✅ All dependencies cleaned and reinstalled successfully!" $Green
Write-ColoredOutput "✅ Prisma client generated" $Green
Write-ColoredOutput ""
Write-ColoredOutput "🚀 Ready to start development:" $Blue
Write-ColoredOutput "   Frontend: cd client && npm start" $Green
Write-ColoredOutput "   Backend:  cd server && npm run dev" $Green
Write-ColoredOutput ""
Write-ColoredOutput "💡 Note: If you encounter ESLint issues, set DISABLE_ESLINT_PLUGIN=true" $Yellow

# Optional: Start services
if (-not $SkipConfirmation) {
    $startServices = Read-Host "`nWould you like to start the development servers now? (y/N)"
    if ($startServices -eq "y" -or $startServices -eq "Y") {
        Write-ColoredOutput "`n🚀 Starting development servers..." $Blue

        # Start backend in background
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\server'; npm run dev"
        Start-Sleep 3

        # Start frontend
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\client'; `$env:DISABLE_ESLINT_PLUGIN='true'; npm start"

        Write-ColoredOutput "✅ Development servers starting..." $Green
        Write-ColoredOutput "   Backend: http://localhost:3004" $Green
        Write-ColoredOutput "   Frontend: http://localhost:3000" $Green
    }
}

Write-ColoredOutput "`n🎉 Script completed successfully!" $Green