<#
.SYNOPSIS
  Backup database Kế toán SME bang pg_dump (format custom, nen san).

.DESCRIPTION
  Dat lich chay hang ngay bang Task Scheduler:
    schtasks /Create /SC DAILY /ST 01:00 /RU SYSTEM /TN "KetoanSME-Backup" ^
      /TR "powershell -ExecutionPolicy Bypass -File C:\apps\ke-toan-SME\scripts\windows\backup-db.ps1"

  Phuc hoi:
    pg_restore -h localhost -U postgres -d ketoan_sme --clean --if-exists <file.dump>

.PARAMETER KeepDays
  So ngay giu ban backup (mac dinh 30).
#>
[CmdletBinding()]
param(
  [string]$BackupDir = 'D:\backup\ketoan-sme',
  [string]$DbHost = 'localhost',
  [int]$DbPort = 5432,
  [string]$DbName = 'ketoan_sme',
  [string]$DbUser = 'postgres',
  [int]$KeepDays = 30
)

$ErrorActionPreference = 'Stop'

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
  $bin = Get-ChildItem 'C:\Program Files\PostgreSQL\*\bin\pg_dump.exe' -ErrorAction SilentlyContinue |
         Sort-Object FullName -Descending | Select-Object -First 1
  if (-not $bin) { throw 'Khong tim thay pg_dump.' }
  $env:Path = "$($bin.Directory.FullName);$env:Path"
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$file = Join-Path $BackupDir "$DbName-$stamp.dump"

# Mat khau lay tu %PGPASSWORD% hoac file %APPDATA%\postgresql\pgpass.conf.
pg_dump -h $DbHost -p $DbPort -U $DbUser -d $DbName -Fc -f $file
if ($LASTEXITCODE -ne 0) { throw "pg_dump that bai (exit $LASTEXITCODE)." }

$sizeMb = [math]::Round((Get-Item $file).Length / 1MB, 1)
Write-Host "Backup: $file ($sizeMb MB)" -ForegroundColor Green

$cutoff = (Get-Date).AddDays(-$KeepDays)
Get-ChildItem $BackupDir -Filter "$DbName-*.dump" |
  Where-Object { $_.LastWriteTime -lt $cutoff } |
  ForEach-Object { Write-Host "Xoa ban cu: $($_.Name)"; Remove-Item $_.FullName -Force }
