@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    where py >nul 2>&1
    if not errorlevel 1 (
        py -3 -m venv .venv
    ) else (
        python -m venv .venv
    )
    if errorlevel 1 goto error
)
".venv\Scripts\python.exe" -c "import serial; assert serial.__version__ == '3.5'" >nul 2>&1
if errorlevel 1 (
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 goto error
)
".venv\Scripts\python.exe" app.py --open --rehearsal
if errorlevel 1 goto error
exit /b 0
:error
echo.
echo Startup failed. See the message above and the installation guide.
pause
exit /b 1
