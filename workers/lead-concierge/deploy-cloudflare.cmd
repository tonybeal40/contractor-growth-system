@echo off
setlocal
cd /d "%~dp0"

echo All-Pro Lead Concierge - Cloudflare deployment
echo.
echo Step 1: Cloudflare will open in your browser. Click Allow.
call npx --yes wrangler@latest login
if errorlevel 1 goto :failed

echo.
echo Step 2: Deploying the production Worker and route...
call npx --yes wrangler@latest deploy
if errorlevel 1 goto :failed

echo.
echo Deployment complete.
echo Verify: https://allprometroeastconstruction.com/api/lead-concierge/health
pause
exit /b 0

:failed
echo.
echo Deployment stopped before completion. Leave this window open and share the error with Codex.
pause
exit /b 1
