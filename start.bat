@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  Портфолио запущено: http://localhost:8090/index.html
echo  Чтобы остановить, закройте это окно.
echo.
start "" http://localhost:8090/index.html
python -m http.server 8090
