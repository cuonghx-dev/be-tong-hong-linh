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

$pm2Ver = (pm2 -v 2>&1 | Select-Object -Last 1).Trim()
if ($pm2Ver -notlike '5.*') {
  throw "pm2 $pm2Ver khong chay duoc api (can 5.x). Xem install-prereqs.ps1."
}

# pm2 client phai tro vao PM2_HOME cua service, khong thi no spawn daemon rieng theo
# phien dang nhap va daemon do bi Windows ket lieu khi phien SSH/RDP dong.
$svcHome = [Environment]::GetEnvironmentVariable('PM2_HOME', 'Machine')
if ($svcHome) {
  $env:PM2_HOME = $svcHome
  Write-Host "PM2_HOME = $svcHome" -ForegroundColor DarkGray
} else {
  Write-Host 'Chua co PM2_HOME cap may — pm2 chua duoc cai thanh Windows Service (xem docs §5).' -ForegroundColor Yellow
}

if (-not $SkipInstall) {
  Invoke-Step 'pnpm install' { pnpm install --frozen-lockfile }
}

# Prisma khong ghi de duoc query_engine-windows.dll.node khi api dang chay (EPERM khi
# rename file .tmp) → dung api truoc, pm2 start lai o cuoi script.
# Boc qua cmd /c: lan deploy dau tien process chua ton tai, pm2 in ra stderr va
# $ErrorActionPreference='Stop' se bien no thanh terminating error lam script chet.
cmd /c 'pm2 stop ketoan-api >NUL 2>&1'

# Khong co postinstall → phai generate Prisma Client thu cong truoc khi build.
Invoke-Step 'prisma generate' { pnpm --filter @app/api prisma:generate }

if (-not $SkipMigrate) {
  # migrate deploy: chi ap dung migration da commit, khong tu sinh/reset (an toan cho prod).
  Invoke-Step 'prisma migrate deploy' { pnpm --filter @app/api prisma:deploy }
}

# Build TRUOC seed: seed chay bang ts-node va import @app/shared, ma package do
# resolve qua "main": dist/index.js → chua build thi loi TS2307 Cannot find module.
Invoke-Step 'build (shared + api + web)' { pnpm build }

if ($Seed) {
  Invoke-Step 'prisma db seed (danh muc ban dau)' { pnpm --filter @app/api prisma:initial-db }
}

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
