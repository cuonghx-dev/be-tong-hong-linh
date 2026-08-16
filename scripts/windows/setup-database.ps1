<#
.SYNOPSIS
  Tao role + database Postgres cho Kế toán SME va sinh file .env production.

.DESCRIPTION
  Chay sau install-prereqs.ps1, tren may co PostgreSQL (hoac co psql tro toi DB tu xa).
  Idempotent: role/DB da co thi bo qua, .env co san thi khong ghi de (tru -Force).

.EXAMPLE
  .\scripts\windows\setup-database.ps1 -DbPassword 'MatKhauManh#2026'
#>
[CmdletBinding()]
param(
  [string]$DbHost = 'localhost',
  [int]$DbPort = 5432,
  [string]$DbName = 'ketoan_sme',
  [string]$DbUser = 'ketoan',
  [Parameter(Mandatory = $true)][string]$DbPassword,
  [string]$SuperUser = 'postgres',
  [int]$ApiPort = 3000,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')

if (-not (Get-Command psql -ErrorAction SilentlyContinue)) {
  # Trinh cai winget khong luon them psql vao PATH.
  $bin = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\psql.exe' -ErrorAction SilentlyContinue |
         Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $bin) { throw 'Khong tim thay psql. Them C:\Program Files\PostgreSQL\<ver>\bin vao PATH.' }
  $env:Path = "$($bin.Directory.FullName);$env:Path"
}

Write-Host '==> Tao role + database' -ForegroundColor Cyan
# Here-string nháy đơn: PowerShell không nội suy, nên `$$` của khối DO giữ nguyên.
# Giá trị chèn qua -replace để tránh xung đột ký hiệu $ giữa PowerShell và PL/pgSQL.
$sqlRole = @'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '__USER__') THEN
    CREATE ROLE __USER__ LOGIN PASSWORD '__PWD__';
  ELSE
    ALTER ROLE __USER__ WITH LOGIN PASSWORD '__PWD__';
  END IF;
END
$$;
'@ -replace '__USER__', $DbUser -replace '__PWD__', $DbPassword
$sqlRole | psql -h $DbHost -p $DbPort -U $SuperUser -d postgres -v ON_ERROR_STOP=1 -f -
if ($LASTEXITCODE -ne 0) { throw 'Tao role that bai.' }

$exists = (psql -h $DbHost -p $DbPort -U $SuperUser -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DbName'").Trim()
if ($exists -ne '1') {
  psql -h $DbHost -p $DbPort -U $SuperUser -d postgres -v ON_ERROR_STOP=1 `
    -c "CREATE DATABASE $DbName OWNER $DbUser ENCODING 'UTF8' TEMPLATE template0;"
  if ($LASTEXITCODE -ne 0) { throw 'Tao database that bai.' }
  Write-Host "Da tao database $DbName." -ForegroundColor Green
} else {
  Write-Host "Database $DbName da ton tai." -ForegroundColor Green
}

# Prisma migrate can quyen tao schema/extension trong DB dich.
psql -h $DbHost -p $DbPort -U $SuperUser -d $DbName -v ON_ERROR_STOP=1 `
  -c "GRANT ALL ON SCHEMA public TO $DbUser;" | Out-Null

Write-Host '==> Sinh file .env' -ForegroundColor Cyan
function New-Secret { -join ((48..57) + (97..122) + (65..90) | Get-Random -Count 48 | ForEach-Object { [char]$_ }) }

$apiEnvPath = Join-Path $repoRoot 'apps\api\.env'
if ((Test-Path $apiEnvPath) -and -not $Force) {
  Write-Host "Da co $apiEnvPath (dung -Force de ghi de)." -ForegroundColor Yellow
} else {
  # Mật khẩu phải percent-encode: ký tự @ # / : trong DATABASE_URL làm Prisma parse sai host.
  $pwdEnc = [uri]::EscapeDataString($DbPassword)
  # Dùng ${} để ':' sau tên biến không bị hiểu là cú pháp scope (${env:PATH}).
  @"
DATABASE_URL="postgresql://${DbUser}:${pwdEnc}@${DbHost}:${DbPort}/${DbName}?schema=public"
API_PORT=$ApiPort
JWT_ACCESS_SECRET=$(New-Secret)
JWT_REFRESH_SECRET=$(New-Secret)
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
NODE_ENV=production
"@ | Set-Content -Path $apiEnvPath -Encoding UTF8
  Write-Host "Da ghi $apiEnvPath (chua secret — khong commit)." -ForegroundColor Green
}

$webEnvPath = Join-Path $repoRoot 'apps\web\.env.production'
if ((Test-Path $webEnvPath) -and -not $Force) {
  Write-Host "Da co $webEnvPath." -ForegroundColor Yellow
} else {
  # web-server.cjs proxy /api -> API nen web va api chung origin.
  'VITE_API_URL=/api' | Set-Content -Path $webEnvPath -Encoding UTF8
  Write-Host "Da ghi $webEnvPath." -ForegroundColor Green
}

Write-Host ''
Write-Host 'Buoc tiep: .\scripts\windows\deploy.ps1' -ForegroundColor Cyan
