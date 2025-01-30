@echo off
echo Checking prerequisites...

REM Check if Azure CLI is installed
where az >nul 2>nul
if %errorlevel% neq 0 (
    echo Installing Azure CLI...
    winget install -e --id Microsoft.AzureCLI
    if %errorlevel% neq 0 (
        echo Failed to install Azure CLI
        exit /b 1
    )
)

REM Check if Git is installed and repository is initialized
git rev-parse --git-dir >nul 2>nul
if %errorlevel% neq 0 (
    echo This directory is not a git repository
    exit /b 1
)

echo Setting up Azure authentication...
powershell -ExecutionPolicy Bypass -File get-initial-creds.ps1

if %errorlevel% neq 0 (
    echo Setup failed
    exit /b 1
)

echo Setup completed successfully! The deployment workflow will be configured automatically.
pause
