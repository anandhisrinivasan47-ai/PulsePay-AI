@echo off
setlocal
cd /d "%~dp0"
echo PulsePay AI redesigned frontend: http://127.0.0.1:5501/index.html#overview
echo Serving folder: %CD%
python -m http.server 5501 --bind 127.0.0.1
pause
