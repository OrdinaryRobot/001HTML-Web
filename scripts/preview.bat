@echo off
REM ============================================================
REM  Blog local preview launcher
REM  Double-click this file to start a Hugo dev server.
REM
REM  Paths are derived from this script's own location, so the
REM  whole project folder can be moved anywhere without edits.
REM ============================================================
setlocal

REM Repo root = parent folder of this script (scripts\..)
for %%I in ("%~dp0..") do set "SITE_DIR=%%~fI"

REM Hugo executable. Override by setting the HUGO_EXE env var.
if not defined HUGO_EXE set "HUGO_EXE=D:\tools\hugo\hugo.exe"

if not exist "%HUGO_EXE%" (
  echo.
  echo  [ERROR] Hugo not found at:
  echo          %HUGO_EXE%
  echo.
  echo  Set the HUGO_EXE environment variable to your hugo.exe path,
  echo  or edit the HUGO_EXE line inside this file.
  echo.
  pause
  exit /b 1
)

cd /d "%SITE_DIR%"

echo.
echo ============================================================
echo   OrdinaryRobot Blog - Local Preview
echo ============================================================
echo   Site dir : %SITE_DIR%
echo   Hugo     : %HUGO_EXE%
echo   URL      : http://localhost:1313/001HTML-Web/
echo.
echo   Press Ctrl+C to stop the server.
echo ============================================================
echo.

start "" http://localhost:1313/001HTML-Web/
"%HUGO_EXE%" server -D

endlocal
