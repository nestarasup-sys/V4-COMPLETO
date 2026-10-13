@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js e npm nao foram encontrados. Instale o Node.js LTS e tente novamente.
  pause
  exit /b 1
)

if not exist "node_modules\electron\dist\electron.exe" (
  echo Preparando as dependencias do Gacha V4...
  call npm install
  if errorlevel 1 (
    echo Nao foi possivel instalar as dependencias.
    pause
    exit /b 1
  )
)

echo Abrindo o Gacha V4...
call npm start
if errorlevel 1 (
  echo O Gacha V4 encerrou com erro. Leia a mensagem acima para ver o motivo.
  pause
  exit /b 1
)

endlocal
