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

  $rootModel = Join-Path $apiRoot 'tile-detector.onnx'
  $libModel = Join-Path $apiRoot 'lib\tile-detector.onnx'
  if (!(Test-Path -LiteralPath $rootModel) -or !(Test-Path -LiteralPath $libModel)) {
    throw 'Both tile-detector.onnx copies must exist before deployment.'
  }

  $rootHash = (Get-FileHash -LiteralPath $rootModel -Algorithm SHA256).Hash
  $libHash = (Get-FileHash -LiteralPath $libModel -Algorithm SHA256).Hash
  if ($rootHash -ne $libHash) {
    throw 'The root and lib copies of tile-detector.onnx do not match.'
  }
  Write-Host "Model verified: $rootHash" -ForegroundColor Green

  if (!$SkipInstall) {
    Write-Host 'Installing locked dependencies...' -ForegroundColor Cyan
    Invoke-Checked npm ci
  }

  if (!$SkipTests) {
    Write-Host 'Running detector regression tests...' -ForegroundColor Cyan
    Invoke-Checked npm test
    Invoke-Checked npx --yes tsx test-final.mts
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
