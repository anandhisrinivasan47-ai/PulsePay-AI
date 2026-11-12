@echo off
cd /d "%~dp0"
if not exist ".env" (
  echo Missing back-end\.env. Copy your existing local .env file from your original project into this folder.
  echo Do not paste credentials into chat or frontend files.
  pause
  exit /b 1
)
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8001
pause
