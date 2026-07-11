@echo off
setlocal

set "PYTHON_BOOTSTRAP="
py -3 --version >nul 2>&1
if not errorlevel 1 set "PYTHON_BOOTSTRAP=py -3"
if not defined PYTHON_BOOTSTRAP (
  python --version >nul 2>&1
  if not errorlevel 1 set "PYTHON_BOOTSTRAP=python"
)
if not defined PYTHON_BOOTSTRAP (
  echo Python 3 was not found. Install Python 3.10+ or create .venv manually.
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  %PYTHON_BOOTSTRAP% -m venv .venv
  if errorlevel 1 exit /b %errorlevel%
)

".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 exit /b %errorlevel%

".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 exit /b %errorlevel%

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env from .env.example. Add APIFY_API_TOKEN before crawling.
)

".venv\Scripts\python.exe" -m src.preflight
if errorlevel 1 exit /b %errorlevel%

echo Pipeline environment setup completed.
