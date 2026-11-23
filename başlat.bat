@echo off
cd /d "%~dp0"
start "guard1" cmd /k "bun src\Base\app.js guard1"
start "guard2" cmd /k "bun src\Base\app.js guard2"
start "guard3" cmd /k "bun src\Base\app.js guard3"
start "snapshot" cmd /k "bun src\Base\app.js snapshot"
echo 4 bot baslatildi.
