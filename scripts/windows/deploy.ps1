<#
.SYNOPSIS
  Build + migrate + (re)start Kế toán SME bang pm2 tren Windows Server.

.DESCRIPTION
  Chay tu thu muc ma nguon da copy len may chu (vi du C:\apps\ke-toan-SME).
  Cac buoc: pnpm install -> prisma generate -> prisma migrate deploy -> pnpm build -> pm2 restart.

.PARAMETER Seed
  Chay `prisma db seed` (nap danh muc ban dau tu prisma/initial-databases). Chi dung lan dau.

.PARAMETER SkipInstall
  Bo qua `pnpm install` (khi node_modules da dung phien ban).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\windows\deploy.ps1 -Seed
#>
[CmdletBinding()]
param(
  [switch]$Seed,
  [switch]$SkipInstall,
  [switch]$SkipMigrate
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Set-Location $repoRoot

function Invoke-Step([string]$Label, [scriptblock]$Body) {
  Write-Host "==> $Label" -ForegroundColor Cyan
  & $Body
  if ($LASTEXITCODE -ne 0) { throw "$Label that bai (exit $LASTEXITCODE)." }
}

foreach ($c in 'node','pnpm','pm2') {
  if (-not (Get-Command $c -ErrorAction SilentlyContinue)) {
    throw "Thieu '$c'. Chay .\scripts\windows\install-prereqs.ps1 truoc."
  }
}
if (-not (Test-Path (Join-Path $repoRoot 'apps\api\.env'))) {
  throw 'Thieu apps\api\.env. Chay .\scripts\windows\setup-database.ps1 truoc.'
}

if (-not $SkipInstall) {
  Invoke-Step 'pnpm install' { pnpm install --frozen-lockfile }
}

# Khong co postinstall → phai generate Prisma Client thu cong truoc khi build.
Invoke-Step 'prisma generate' { pnpm --filter @app/api prisma:generate }

if (-not $SkipMigrate) {
  # migrate deploy: chi ap dung migration da commit, khong tu sinh/reset (an toan cho prod).
  Invoke-Step 'prisma migrate deploy' { pnpm --filter @app/api prisma:deploy }
}

if ($Seed) {
  Invoke-Step 'prisma db seed (danh muc ban dau)' { pnpm --filter @app/api prisma:initial-db }
}

Invoke-Step 'build (shared + api + web)' { pnpm build }

$ecosystem = Join-Path $PSScriptRoot 'ecosystem.config.cjs'
Write-Host '==> pm2 start/reload' -ForegroundColor Cyan
pm2 startOrReload $ecosystem --update-env
if ($LASTEXITCODE -ne 0) { throw 'pm2 startOrReload that bai.' }
pm2 save | Out-Null

pm2 status
Write-Host ''
Write-Host 'Xong. Kiem tra:' -ForegroundColor Green
Write-Host '  http://<ip-may-chu>:8080          giao dien web'
Write-Host '  http://<ip-may-chu>:8080/api/docs Swagger'
Write-Host '  pm2 logs ketoan-api               log API'
