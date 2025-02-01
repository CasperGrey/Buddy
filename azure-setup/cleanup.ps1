# Resource Cleanup Script
param(
    [Parameter(Mandatory=$true)]
    [string]$ResourceGroupName,
    
    [Parameter(Mandatory=$false)]
    [int]$RetentionDays = 7,
    
    [Parameter(Mandatory=$false)]
    [switch]$DryRun
)

# Function to write logs with timestamps
function Write-Log {
    param($Message)
    Write-Host "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'): $Message"
}

# Function to check if a resource is in use
function Test-ResourceInUse {
    param($ResourceId)
    
    try {
        $locks = Get-AzResourceLock -ResourceId $ResourceId -ErrorAction SilentlyContinue
        return ($locks.Count -gt 0)
    }
    catch {
        return $false
    }
}

try {
    Write-Log "Starting cleanup process for resource group: $ResourceGroupName"
    
    # Connect to Azure if not already connected
    $context = Get-AzContext
    if (!$context) {
        Write-Log "No Azure context found. Please run Connect-AzAccount first."
        exit 1
    }
    
    # Get all resources in the resource group
    $resources = Get-AzResource -ResourceGroupName $ResourceGroupName
    Write-Log "Found $($resources.Count) resources to process"
    
    foreach ($resource in $resources) {
        Write-Log "Processing resource: $($resource.Name) ($($resource.ResourceType))"
        
        # Check if resource is in use
        if (Test-ResourceInUse -ResourceId $resource.Id) {
            Write-Log "Resource $($resource.Name) has locks - skipping"
            continue
        }
        
        # Resource type specific cleanup
        switch -Wildcard ($resource.ResourceType) {
            "Microsoft.Web/sites" {
                if (!$DryRun) {
                    # Clean up deployment slots
                    $slots = Get-AzWebAppSlot -ResourceGroupName $ResourceGroupName -Name $resource.Name
                    foreach ($slot in $slots) {
                        Write-Log "Cleaning up slot: $($slot.Name)"
                        Remove-AzWebAppSlot -ResourceGroupName $ResourceGroupName -Name $resource.Name -Slot $slot.Name -Force
                    }
                    
                    # Clean up logs
                    Write-Log "Cleaning up logs for: $($resource.Name)"
                    Set-AzWebApp -ResourceGroupName $ResourceGroupName -Name $resource.Name -RequestTracingEnabled $false
                    Set-AzWebApp -ResourceGroupName $ResourceGroupName -Name $resource.Name -DetailedErrorLoggingEnabled $false
                    Set-AzWebApp -ResourceGroupName $ResourceGroupName -Name $resource.Name -HttpLoggingEnabled $false
                }
            }
            
            "Microsoft.DocumentDB/databaseAccounts" {
                if (!$DryRun) {
                    # Clean up old backups
                    Write-Log "Cleaning up old backups for: $($resource.Name)"
                    $backups = Get-AzCosmosDBAccountBackup -ResourceGroupName $ResourceGroupName -Name $resource.Name
                    foreach ($backup in $backups) {
                        if ($backup.CreationTime -lt (Get-Date).AddDays(-$RetentionDays)) {
                            Remove-AzCosmosDBAccountBackup -ResourceGroupName $ResourceGroupName -Name $resource.Name -BackupId $backup.Id
                        }
                    }
                }
            }
            
            "Microsoft.Cache/Redis" {
                if (!$DryRun) {
                    # Clean up Redis cache data
                    Write-Log "Cleaning up Redis cache: $($resource.Name)"
                    $redis = Get-AzRedisCache -ResourceGroupName $ResourceGroupName -Name $resource.Name
                    if ($redis.RedisConfiguration.maxmemory_policy -ne "volatile-lru") {
                        Set-AzRedisCache -ResourceGroupName $ResourceGroupName -Name $resource.Name -RedisConfiguration @{"maxmemory-policy" = "volatile-lru"}
                    }
                }
            }
            
            "Microsoft.KeyVault/vaults" {
                if (!$DryRun) {
                    # Clean up old key versions
                    Write-Log "Cleaning up old key versions in Key Vault: $($resource.Name)"
                    $keys = Get-AzKeyVaultKey -VaultName $resource.Name
                    foreach ($key in $keys) {
                        $versions = Get-AzKeyVaultKey -VaultName $resource.Name -Name $key.Name -IncludeVersions
                        $versions | Where-Object { $_.Updated -lt (Get-Date).AddDays(-$RetentionDays) } | ForEach-Object {
                            Remove-AzKeyVaultKey -VaultName $resource.Name -Name $key.Name -Version $_.Version -Force
                        }
                    }
                    
                    # Clean up old secret versions
                    Write-Log "Cleaning up old secret versions in Key Vault: $($resource.Name)"
                    $secrets = Get-AzKeyVaultSecret -VaultName $resource.Name
                    foreach ($secret in $secrets) {
                        $versions = Get-AzKeyVaultSecret -VaultName $resource.Name -Name $secret.Name -IncludeVersions
                        $versions | Where-Object { $_.Updated -lt (Get-Date).AddDays(-$RetentionDays) } | ForEach-Object {
                            Remove-AzKeyVaultSecret -VaultName $resource.Name -Name $secret.Name -Version $_.Version -Force
                        }
                    }
                }
            }
            
            "Microsoft.Insights/components" {
                if (!$DryRun) {
                    # Clean up old Application Insights data
                    Write-Log "Cleaning up old Application Insights data: $($resource.Name)"
                    Update-AzApplicationInsights -ResourceGroupName $ResourceGroupName -Name $resource.Name -RetentionInDays $RetentionDays
                }
            }
            
            "Microsoft.OperationalInsights/workspaces" {
                if (!$DryRun) {
                    # Clean up old Log Analytics data
                    Write-Log "Cleaning up old Log Analytics data: $($resource.Name)"
                    Set-AzOperationalInsightsWorkspace -ResourceGroupName $ResourceGroupName -Name $resource.Name -RetentionInDays $RetentionDays
                }
            }
        }
    }
    
    # Clean up resource group tags
    if (!$DryRun) {
        Write-Log "Cleaning up resource group tags"
        $group = Get-AzResourceGroup -Name $ResourceGroupName
        if ($group.Tags -and $group.Tags.Count -gt 0) {
            $updatedTags = @{}
            foreach ($tag in $group.Tags.GetEnumerator()) {
                if ($tag.Value -notmatch '^temp-|^test-') {
                    $updatedTags[$tag.Key] = $tag.Value
                }
            }
            Set-AzResourceGroup -Name $ResourceGroupName -Tag $updatedTags
        }
    }
    
    Write-Log "Cleanup process completed successfully"
}
catch {
    Write-Log "Error during cleanup: $_"
    Write-Log $_.Exception.Message
    Write-Log $_.ScriptStackTrace
    exit 1
}
