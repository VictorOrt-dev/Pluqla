@echo off
echo ========================================
echo Pluqla Dev Server Restart Script
echo ========================================
echo.

echo [1/4] Stopping dev server...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *PLUQLA*" 2>NUL
if errorlevel 1 (
    echo No dev server found running
) else (
    echo Dev server stopped
)
echo.

echo [2/4] Clearing webpack cache...
if exist "client\node_modules\.cache" (
    rd /s /q "client\node_modules\.cache"
    echo Cache cleared
) else (
    echo No cache found
)
echo.

echo [3/4] Clearing build artifacts...
if exist "client\build" (
    rd /s /q "client\build"
    echo Build folder cleared
)
echo.

echo [4/4] Starting dev server...
echo Navigate to client folder and run: npm start
echo Or run this command: cd client && npm start
echo.

echo ========================================
echo Ready! Now run: cd client && npm start
echo ========================================
pause
