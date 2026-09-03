[CmdletBinding()]
param(
  [switch]$Preview,
  [switch]$SkipInstall,
  [switch]$SkipTests,
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Checked {
  param(
    [Parameter(Mandatory)]
    [string]$Command,

    [Parameter(ValueFromRemainingArguments)]
    [string[]]$Arguments
  )

  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command $($Arguments -join ' ')"
  }
}

$apiRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
Push-Location -LiteralPath $apiRoot

try {
  Write-Host "Deploying tile-detect-api from $apiRoot" -ForegroundColor Cyan

  if (!(Test-Path -LiteralPath (Join-Path $apiRoot '.env.local')) -or
      !(Select-String -LiteralPath (Join-Path $apiRoot '.env.local') -Pattern 'OLLAMA_API_KEY' -Quiet)) {
    Write-Host 'OLLAMA_API_KEY not found in .env.local; the deployed function will fail its readiness check until the env var is set in the Vercel project.' -ForegroundColor Yellow
  }

  if (!$SkipInstall) {
    Write-Host 'Installing locked dependencies...' -ForegroundColor Cyan
    Invoke-Checked npm ci
  }

  if (!$SkipTests) {
    Write-Host 'Running detector regression tests...' -ForegroundColor Cyan
    Invoke-Checked npm run test:unit
    Invoke-Checked npm test
  }

  if (!(Test-Path -LiteralPath (Join-Path $apiRoot '.vercel\project.json'))) {
    Write-Host 'This folder is not linked to Vercel yet. The CLI will ask you to log in and select the existing tile-detect-api project.' -ForegroundColor Yellow
  }

  if ($DryRun) {
    Write-Host 'Dry run completed; deployment was skipped.' -ForegroundColor Green
    return
  }

  $deployArguments = @('--yes', 'vercel@latest', 'deploy')
  if (!$Preview) {
    $deployArguments += '--prod'
  }

  $deploymentLabel = if ($Preview) { 'Deploying a preview...' } else { 'Deploying to production...' }
  Write-Host $deploymentLabel -ForegroundColor Cyan
  Invoke-Checked npx @deployArguments
  Write-Host 'Vercel deployment completed successfully.' -ForegroundColor Green
}
finally {
  Pop-Location
}
