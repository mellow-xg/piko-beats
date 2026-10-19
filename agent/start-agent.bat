@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo PC agent is not installed yet. Run setup-agent.bat first.
  pause
  exit /b 1
)
if not exist ".env" (
  echo agent\.env is missing. Run setup-agent.bat first.
  pause
  exit /b 1
)

".venv\Scripts\python.exe" piko_agent.py %*
set "AGENT_EXIT=%ERRORLEVEL%"
if not "%AGENT_EXIT%"=="0" (
  echo.
  echo Piko Beats agent exited with error code %AGENT_EXIT%.
  pause
)
exit /b %AGENT_EXIT%
