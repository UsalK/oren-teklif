@echo off
REM ============================================================
REM  Fiyat Teklifi - Windows baslatici
REM  Bu dosyaya cift tiklayin. Tarayici otomatik acilir.
REM  Kapatmak icin bu siyah pencereyi kapatin.
REM ============================================================
setlocal
cd /d "%~dp0"
set PORT=8787
set URL=http://localhost:%PORT%/

where node >nul 2>nul
if %errorlevel%==0 (
  start "" "%URL%"
  node server.js
  goto :end
)

echo.
echo  UYARI: Node.js bulunamadi.
echo  Uygulama acilacak, ancak teklifler storage.json dosyasina degil
echo  yalnizca tarayici bellegine kaydedilecek.
echo.
echo  Kalici dosya kaydi icin Node.js kurun: https://nodejs.org
echo.

where py >nul 2>nul
if %errorlevel%==0 (
  start "" "%URL%"
  py -m http.server %PORT%
  goto :end
)

where python >nul 2>nul
if %errorlevel%==0 (
  start "" "%URL%"
  python -m http.server %PORT%
  goto :end
)

echo  Python da bulunamadi; dosya dogrudan aciliyor.
start "" "index.html"
pause

:end
endlocal
