@echo off
REM ============================================
REM  博客本地预览启动器
REM  双击本文件即可启动 Hugo 本地预览服务器
REM ============================================

setlocal
set "HUGO_DIR=D:\WorkBuddy\tools\hugo"
set "SITE_DIR=D:\WorkBuddy\001HTML-Web"
set "PATH=%HUGO_DIR%;%PATH%"

cd /d "%SITE_DIR%"

echo.
echo ============================================
echo   OrdinaryRobot 博客 - 本地预览
echo ============================================
echo.
echo   站点目录: %SITE_DIR%
echo   预览地址: http://localhost:1313/001HTML-Web/
echo.
echo   按 Ctrl+C 可停止服务器
echo ============================================
echo.

start "" http://localhost:1313/001HTML-Web/
hugo server -D

endlocal
