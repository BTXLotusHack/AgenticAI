@echo off
setlocal

set "PYTHON="
if exist ".venv\Scripts\python.exe" set "PYTHON=.venv\Scripts\python.exe"
if not defined PYTHON (
  py -3 --version >nul 2>&1
  if not errorlevel 1 set "PYTHON=py -3"
)
if not defined PYTHON (
  python --version >nul 2>&1
  if not errorlevel 1 set "PYTHON=python"
)
if not defined PYTHON (
  echo Python 3 was not found. Run setup_pipeline.bat after installing Python 3.10+.
  exit /b 1
)

%PYTHON% -m src.enrich --pilot --limit-jobs 1 --execute
if errorlevel 1 exit /b %errorlevel%
%PYTHON% -m src.clean
if errorlevel 1 exit /b %errorlevel%
%PYTHON% -m src.audit
if errorlevel 1 exit /b %errorlevel%
%PYTHON% -m src.validate_outputs
