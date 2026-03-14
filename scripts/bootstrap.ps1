param(
    [switch]$SkipSeed,
    [switch]$SkipFrontendBuild
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Require-Command {
    param([string]$CommandName)
    if (-not (Get-Command $CommandName -ErrorAction SilentlyContinue)) {
        throw "Required command '$CommandName' was not found in PATH."
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$seedSql = Join-Path $repoRoot "database/seed_data.sql"

Require-Command "python"
Require-Command "npm"

Write-Step "Setting up backend virtual environment"
$venvDir = Join-Path $backendDir "venv"
if (-not (Test-Path $venvDir)) {
    & python -m venv $venvDir
}

$venvPython = Join-Path $venvDir "Scripts/python.exe"
if (-not (Test-Path $venvPython)) {
    throw "Python virtual environment is missing expected interpreter at $venvPython"
}

Write-Step "Installing backend dependencies"
& $venvPython -m pip install --upgrade pip
& $venvPython -m pip install -r (Join-Path $backendDir "requirements.txt")

$backendEnvExample = Join-Path $backendDir ".env.example"
$backendEnv = Join-Path $backendDir ".env"
if (-not (Test-Path $backendEnv)) {
    Write-Step "Creating backend .env from template"
    Copy-Item $backendEnvExample $backendEnv
}

Write-Step "Running backend migrations"
Push-Location $backendDir
try {
    & $venvPython -m alembic upgrade head
} catch {
    Write-Host "Migration failed. Ensure PostgreSQL is running and DATABASE_URL is correct." -ForegroundColor Red
    Write-Host "Quick start: docker compose up -d postgres" -ForegroundColor Yellow
    throw
}
Pop-Location

if (-not $SkipSeed) {
    if (Get-Command "psql" -ErrorAction SilentlyContinue) {
        Write-Step "Loading seed data (optional)"
        $databaseUrl = $env:DATABASE_URL
        if (-not $databaseUrl -and (Test-Path $backendEnv)) {
            $databaseLine = Get-Content $backendEnv | Where-Object { $_ -match '^DATABASE_URL=' } | Select-Object -First 1
            if ($databaseLine) {
                $databaseUrl = $databaseLine.Substring("DATABASE_URL=".Length)
            }
        }

        if ($databaseUrl) {
            & psql $databaseUrl -f $seedSql
        } else {
            Write-Host "Skipping seed load: DATABASE_URL is not set in environment or backend .env." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Skipping seed load: psql command not found. Use -SkipSeed or install PostgreSQL client tools." -ForegroundColor Yellow
    }
}

Write-Step "Setting up frontend dependencies"
Push-Location $frontendDir
& npm install
Pop-Location

$frontendEnvExample = Join-Path $frontendDir ".env.example"
$frontendEnv = Join-Path $frontendDir ".env"
if (-not (Test-Path $frontendEnv)) {
    Write-Step "Creating frontend .env from template"
    Copy-Item $frontendEnvExample $frontendEnv
}

if (-not $SkipFrontendBuild) {
    Write-Step "Running frontend production build"
    Push-Location $frontendDir
    & npm run build
    Pop-Location
}

Write-Host ""
Write-Host "Bootstrap completed successfully." -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "1) Start backend: cd backend; .\venv\Scripts\activate; uvicorn app.main:app --reload"
Write-Host "2) Start frontend: cd frontend; npm run dev"
