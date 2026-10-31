@echo off
cd /d "%~dp0"
rem Start Electron directly; going through npx adds noticeable startup delay.
if exist "node_modules\electron\dist\electron.exe" (
  start "" "node_modules\electron\dist\electron.exe" .
) else (
  start "" /b npx electron .
)
