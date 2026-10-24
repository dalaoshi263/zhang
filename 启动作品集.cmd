@echo off
setlocal
cd /d "%~dp0"
set "NODE_EXE="
for /f "delims=" %%I in ('where node.exe 2^>nul') do if not defined NODE_EXE set "NODE_EXE=%%I"
if not defined NODE_EXE goto bundled_node
"%NODE_EXE%" -e "const v=process.versions.node.split('.').map(Number); process.exit((v[0]===20&&v[1]>=19)||(v[0]===22&&v[1]>=12)||v[0]>22?0:1)" >nul 2>&1
if not errorlevel 1 goto run_preview

:bundled_node
set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%NODE_EXE%" goto missing_node
"%NODE_EXE%" -e "const v=process.versions.node.split('.').map(Number); process.exit((v[0]===20&&v[1]>=19)||(v[0]===22&&v[1]>=12)||v[0]>22?0:1)" >nul 2>&1
if errorlevel 1 goto missing_node

:run_preview
"%NODE_EXE%" "%~dp0scripts\start-preview.cjs" %*
if errorlevel 1 goto failed
exit /b 0

:missing_node
echo A compatible Node.js runtime was not found.
echo Install Node.js 20.19+ or 22.12+, then run this launcher again.
goto failed

:failed
echo.
echo The preview could not be opened. See the message above.
pause
exit /b 1
