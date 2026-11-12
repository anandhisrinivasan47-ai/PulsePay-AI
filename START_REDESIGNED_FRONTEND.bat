@echo off
setlocal
title PulsePay AI - Redesigned Light Theme
cd /d "%~dp0front-end"
echo.
echo ============================================================
echo   PULSEPAY AI - REDESIGNED LIGHT THEME
echo ============================================================
echo.
echo Serving folder: %CD%
echo Open this address: http://127.0.0.1:5501/index.html#overview
echo.
echo Keep this window open while using the website.
echo Press Ctrl+C to stop the frontend server.
echo.
python -m http.server 5501 --bind 127.0.0.1
if errorlevel 1 (
  echo.
  echo Python could not start the frontend server.
  echo Try this command in this folder: py -m http.server 5501 --bind 127.0.0.1
)
pause
