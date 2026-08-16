<#
.SYNOPSIS
  Cài phần mềm nền cho Kế toán SME trên Windows Server (Node 20 LTS, pnpm 9, PostgreSQL 16, pm2).

.DESCRIPTION
  Dùng winget (có sẵn từ Windows Server 2022 / App Installer). Chạy trong PowerShell "Run as Administrator".
  Idempotent: bỏ qua thành phần đã có.

.PARAMETER SkipPostgres
  Bỏ qua cài PostgreSQL (dùng khi DB nằm trên máy chủ khác).

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\scripts\windows\install-prereqs.ps1
#>
[CmdletBinding()]
param(
  [switch]$SkipPostgres,
  [string]$NodeVersion = '20',
  [string]$PostgresVersion = '16'
)

$ErrorActionPreference = 'Stop'

function Assert-Admin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($id)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Script phai chay trong PowerShell "Run as Administrator".'
  }
}

function Test-Cmd([string]$Name) {
  $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Install-WingetPackage([string]$Id, [string]$Label) {
  Write-Host "==> Cai $Label ($Id)" -ForegroundColor Cyan
  winget install --id $Id --exact --silent --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne -1978335189) {
    # -1978335189 = APPINSTALLER_CLI_ERROR_UPDATE_NOT_APPLICABLE (da cai san)
    throw "winget install $Id that bai (exit $LASTEXITCODE)."
  }
}

function Refresh-Path {
  $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' +
              [Environment]::GetEnvironmentVariable('Path', 'User')
}

Assert-Admin

if (-not (Test-Cmd 'winget')) {
  throw 'Khong tim thay winget. Cai "App Installer" tu Microsoft Store hoac tai Node/PostgreSQL thu cong (xem docs/deploy-windows-server.md).'
}

# --- Node.js LTS ---
if (Test-Cmd 'node') {
  Write-Host "Node da co: $(node -v)" -ForegroundColor Green
} else {
  Install-WingetPackage "OpenJS.NodeJS.LTS" "Node.js $NodeVersion LTS"
  Refresh-Path
}

# --- pnpm 9 (qua corepack di kem Node) ---
Refresh-Path
if (Test-Cmd 'pnpm') {
  Write-Host "pnpm da co: $(pnpm -v)" -ForegroundColor Green
} else {
  Write-Host '==> Bat corepack + kich hoat pnpm 9' -ForegroundColor Cyan
  corepack enable
  corepack prepare pnpm@9.7.0 --activate
  Refresh-Path
}

# --- PostgreSQL 16 ---
if ($SkipPostgres) {
  Write-Host 'Bo qua PostgreSQL (-SkipPostgres).' -ForegroundColor Yellow
} elseif (Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue) {
  Write-Host 'PostgreSQL service da ton tai.' -ForegroundColor Green
} else {
  Install-WingetPackage "PostgreSQL.PostgreSQL.$PostgresVersion" "PostgreSQL $PostgresVersion"
  Refresh-Path
  Write-Host 'Mat khau superuser postgres do trinh cai dat hoi (mac dinh winget: postgres).' -ForegroundColor Yellow
}

# --- pm2 + pm2-installer (chay app nhu Windows Service) ---
Refresh-Path
if (Test-Cmd 'pm2') {
  Write-Host "pm2 da co: $(pm2 -v)" -ForegroundColor Green
} else {
  Write-Host '==> Cai pm2 toan cuc' -ForegroundColor Cyan
  npm install -g pm2
  Refresh-Path
}

Write-Host ''
Write-Host 'Xong. Kiem tra:' -ForegroundColor Green
foreach ($c in 'node','pnpm','pm2','psql') {
  if (Test-Cmd $c) { Write-Host ("  {0,-6} {1}" -f $c, (& $c --version 2>&1 | Select-Object -First 1)) }
  else { Write-Host ("  {0,-6} CHUA CO" -f $c) -ForegroundColor Yellow }
}
Write-Host ''
Write-Host 'Buoc tiep: .\scripts\windows\setup-database.ps1 roi .\scripts\windows\deploy.ps1' -ForegroundColor Cyan
