@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if errorlevel 1 (
  echo Python launcher not found. Install Python 3.11 or newer from https://www.python.org/downloads/windows/
  pause
  exit /b 1
)

if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created agent\.env. Review it before using the agent.
)

if not exist ".venv\Scripts\python.exe" (
  echo Creating virtual environment...
  py -3 -m venv .venv
  if errorlevel 1 goto failed
)

echo Installing or updating PC-agent dependencies...
".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 goto failed
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto failed

echo.
echo Setup complete. Review agent\.env and then launch start-agent.bat.
pause
exit /b 0

:failed
echo.
echo Setup failed. Check the error above and your network connection.
pause
exit /b 1
