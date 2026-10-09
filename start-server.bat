@echo off
REM ============================================================
REM  Un Re Bondi En Ciudad Evita - Servidor del juego
REM  Doble clic para iniciar. Dejar esta ventana abierta.
REM  Para detener el servidor: cerrar la ventana o Ctrl+C.
REM ============================================================
cd /d "%~dp0"
set PATH=C:\nvm4w\nodejs;%PATH%
echo Iniciando servidor en http://localhost:5173 ...
"C:\nvm4w\nodejs\node.exe" "node_modules\vite\bin\vite.js" --port 5173
pause
