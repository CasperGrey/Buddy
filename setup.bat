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

REM First try to update permissions for existing service principal
powershell -ExecutionPolicy Bypass -Command "$appId='0647e6ef-baed-4bfa-8b8e-22e92502987e'; $sp = az ad sp list --filter \"appId eq '$appId'\" | ConvertFrom-Json; if ($sp) { Write-Host 'Updating permissions for existing service principal...'; Write-Host 'Adding Application.ReadWrite.All permission...'; az ad app permission add --id $appId --api 00000003-0000-0000-c000-000000000000 --api-permissions 1bfefb4e-e0b5-418b-a88f-73c46d2cc8e9=Role; Start-Sleep -Seconds 5; Write-Host 'Granting permission...'; $maxRetries = 3; $retryCount = 0; do { try { az ad app permission grant --id $appId --api 00000003-0000-0000-c000-000000000000 --scope 'Application.ReadWrite.All'; break; } catch { $retryCount++; if ($retryCount -lt $maxRetries) { Write-Host 'Retrying permission grant after 10 seconds...'; Start-Sleep -Seconds 10; } else { throw } } } while ($retryCount -lt $maxRetries); Start-Sleep -Seconds 5; Write-Host 'Applying admin consent...'; az ad app permission admin-consent --id $appId }"

REM Run the main setup script
powershell -ExecutionPolicy Bypass -File get-initial-creds.ps1

if %errorlevel% neq 0 (
    echo Setup failed
    exit /b 1
)

echo Setup completed successfully! The deployment workflow will be configured automatically.
pause
