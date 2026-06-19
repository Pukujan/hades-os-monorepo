<#
.SYNOPSIS
  Retry Terraform apply for A1.Flex instance in Oracle us-ashburn-1.
.DESCRIPTION
  Runs terraform apply once. If OCI returns out-of-capacity, prints a clear
  message and exits. Does NOT switch to paid shapes.
.PARAMETER Loop
  If set, retries every 60 seconds until capacity opens. Ctrl+C to stop.
#>

param(
  [switch]$Loop
)

$ErrorActionPreference = "Stop"

# Locate terraform (winget installs to machine PATH)
$terraform = Get-Command terraform -ErrorAction SilentlyContinue
if (-not $terraform) {
  $paths = @(
    "$env:ProgramFiles\HashiCorp\Terraform\terraform.exe",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Hashicorp.Terraform_Microsoft.Winget.Source_8wekyb3d8bbwe\terraform.exe",
    "$env:ProgramFiles\WindowsApps\*\terraform.exe"
  )
  foreach ($p in $paths) {
    $expanded = [Environment]::ExpandEnvironmentVariables($p)
    if (Test-Path $expanded) {
      $terraform = $expanded
      break
    }
  }
}
if (-not $terraform) {
  Write-Error "Terraform not found. Install with: winget install Hashicorp.Terraform"
  exit 1
}

$scriptDir = Split-Path -Parent $PSCommandPath
Set-Location $scriptDir

function Invoke-Apply {
  Write-Host ">>> Regenerating plan..." -ForegroundColor Cyan
  & $terraform plan -out=tfplan 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Plan failed. Check terraform fmt / validate."
    return $false
  }

  Write-Host ">>> Applying plan..." -ForegroundColor Cyan
  $output = & $terraform apply tfplan 2>&1 | Out-String

  if ($LASTEXITCODE -eq 0) {
    Write-Host ">>> SUCCESS: Instance created!" -ForegroundColor Green
    & $terraform output public_ip
    & $terraform output ssh_command
    return $true
  }

  if ($output -match "Out of host capacity") {
    Write-Host ">>> Out of capacity (A1.Flex). Try again later." -ForegroundColor Yellow
    return $false
  }

  Write-Host ">>> Unexpected error:" -ForegroundColor Red
  Write-Host $output
  return $false
}

if (-not $Loop) {
  Invoke-Apply
  exit $LASTEXITCODE
}

# Loop mode
Write-Host ">>> Loop mode: retrying every 60s. Ctrl+C to stop." -ForegroundColor Magenta
while ($true) {
  $ok = Invoke-Apply
  if ($ok) { exit 0 }
  Write-Host ">>> Waiting 60 seconds before next attempt..." -ForegroundColor DarkYellow
  Start-Sleep -Seconds 60
}
