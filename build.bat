@echo off
chcp 65001 >nul
cd /d "%~dp0"
python tools\build_dist.py
echo.
pause
