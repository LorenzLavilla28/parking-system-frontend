param(
  [string]$Bucket = 'parking-saas-frontend-prod',
  [string]$DistributionId = '',
  [string]$Alias = 'pbp-parking.app'
)

$ErrorActionPreference = 'Stop'
$frontendRoot = $PSScriptRoot

if (-not (Get-Command aws -ErrorAction SilentlyContinue)) {
  throw "AWS CLI was not found. Install it and configure an IAM identity before deploying."
}

Set-Location $frontendRoot
npm run build
if ($LASTEXITCODE -ne 0) { throw 'Frontend build failed.' }

if (-not $DistributionId) {
  $DistributionId = aws cloudfront list-distributions `
    --query "DistributionList.Items[?contains(Aliases.Items, '$Alias')].Id | [0]" `
    --output text
  if (-not $DistributionId -or $DistributionId -eq 'None') {
    throw "Could not find the CloudFront distribution for $Alias. Pass -DistributionId explicitly."
  }
}

aws s3 sync (Join-Path $frontendRoot 'dist') "s3://$Bucket" --delete
if ($LASTEXITCODE -ne 0) { throw 'S3 synchronization failed.' }

$invalidationId = aws cloudfront create-invalidation `
  --distribution-id $DistributionId `
  --paths '/*' `
  --query 'Invalidation.Id' `
  --output text
if ($LASTEXITCODE -ne 0) { throw 'CloudFront invalidation failed.' }

Write-Host "Waiting for CloudFront invalidation $invalidationId..." -ForegroundColor Cyan
aws cloudfront wait invalidation-completed `
  --distribution-id $DistributionId `
  --id $invalidationId
if ($LASTEXITCODE -ne 0) { throw 'CloudFront invalidation did not complete successfully.' }

Write-Host "Verifying https://$Alias ..." -ForegroundColor Cyan
try {
  $response = Invoke-WebRequest -Uri "https://$Alias/" -UseBasicParsing -TimeoutSec 30
  if ([int]$response.StatusCode -lt 200 -or [int]$response.StatusCode -ge 400) {
    throw "HTTP $($response.StatusCode)"
  }
}
catch {
  throw "Public frontend verification failed: $($_.Exception.Message)"
}

Write-Host "Frontend deployed to https://$Alias" -ForegroundColor Green
