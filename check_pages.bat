@echo off
chcp 65001 >nul
cd /d "D:\WorkBuddy\001HTML-Web"

echo ===================================================
echo   Checking GitHub Pages Deployment Status
echo ===================================================
echo.

set REPO=OrdinaryRobot/001HTML-Web

echo [1/3] Repository Info
curl -s --noproxy "*" --connect-timeout 20 "https://api.github.com/repos/%REPO%" | findstr /C:"\"default_branch\"" /C:"\"has_pages\"" /C:"\"pushed_at\"" /C:"\"visibility\""
echo.

echo [2/3] Pages Config
curl -s --noproxy "*" --connect-timeout 20 "https://api.github.com/repos/%REPO%/pages"
echo.
echo.

echo [3/3] Site Reachability
for %%U in ("https://ordinaryrobot.github.io/001HTML-Web/" "https://ordinaryrobot.github.io/001HTML-Web/legacy/index.html" "https://ordinaryrobot.github.io/001HTML-Web/about/") do (
  for /f %%C in ('curl -s -o NUL -w "%%{http_code}" --noproxy "*" --connect-timeout 20 %%U') do (
    echo   HTTP %%C  %%U
  )
)

echo.
echo ===================================================
echo   Done. Press any key to close.
echo ===================================================
pause >nul
