# Cleanup script for migration to Azure Functions

# Server files to remove
$serverFiles = @(
    "server/server.ts",
    "server/config/azure.ts",
    "server/middleware/auth.ts",
    "server/tsconfig.json"
)

# Configuration files to remove
$configFiles = @(
    "webapp-config.json",
    "setup-azure-auth.js"
)

Write-Host "Starting cleanup process..."

# Remove server files
foreach ($file in $serverFiles) {
    if (Test-Path $file) {
        Write-Host "Removing $file..."
        Remove-Item $file -Force
    }
}

# Remove configuration files
foreach ($file in $configFiles) {
    if (Test-Path $file) {
        Write-Host "Removing $file..."
        Remove-Item $file -Force
    }
}

# Backup chatService.ts before removal
$chatServicePath = "src/lib/services/chatService.ts"
if (Test-Path $chatServicePath) {
    Write-Host "Backing up chatService.ts..."
    Copy-Item $chatServicePath "src/lib/services/chatService.ts.bak"
    Write-Host "Removing chatService.ts..."
    Remove-Item $chatServicePath -Force
}

Write-Host "Cleanup complete!"
Write-Host "Note: chatService.ts has been backed up to chatService.ts.bak"
Write-Host "Please verify all files were removed correctly before proceeding with migration."
