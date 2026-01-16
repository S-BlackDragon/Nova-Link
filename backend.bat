@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

:: ═══════════════════════════════════════════════════════════════════════════════
::  Nova Link - Backend Management Tool
::  For Windows Servers
:: ═══════════════════════════════════════════════════════════════════════════════

set "COMPOSE_FILE=docker-compose.prod.yml"
cd /d "%~dp0"

:MAIN_MENU
cls
echo.
echo  ╔═══════════════════════════════════════════════════════════════════════╗
echo  ║                                                                       ║
echo  ║     ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗     ██╗     ██╗███╗   ██╗██╗  ║
echo  ║     ████╗  ██║██╔═══██╗██║   ██║██╔══██╗    ██║     ██║████╗  ██║██║  ║
echo  ║     ██╔██╗ ██║██║   ██║██║   ██║███████║    ██║     ██║██╔██╗ ██║█████║
echo  ║     ██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║    ██║     ██║██║╚██╗██║██╔═╝ ║
echo  ║     ██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║    ███████╗██║██║ ╚████║█████║
echo  ║     ╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝    ╚══════╝╚═╝╚═╝  ╚═══╝╚════╝
echo  ║                                                                       ║
echo  ║                    Backend Management Console                         ║
echo  ╚═══════════════════════════════════════════════════════════════════════╝
echo.

:: Check service status
echo  ═══ Service Status ═══
docker ps --format "{{.Names}}" | findstr /C:"nova_link_api" >nul 2>&1
if !errorlevel!==0 (
    echo   Backend API:  [RUNNING]
) else (
    echo   Backend API:  [STOPPED]
)
docker ps --format "{{.Names}}" | findstr /C:"nova_link_db" >nul 2>&1
if !errorlevel!==0 (
    echo   PostgreSQL:   [RUNNING]
) else (
    echo   PostgreSQL:   [STOPPED]
)
echo.

echo  ═══ Main Menu ═══
echo.
echo   Quick Actions
echo   1) Start services
echo   2) Stop services
echo   3) Restart services
echo.
echo   Updates
echo   4) Full update (pull + rebuild)
echo   5) Quick update (pull + restart)
echo.
echo   Logs ^& Data
echo   6) View logs (live)
echo   7) Database menu
echo.
echo   Maintenance
echo   8) Backup database
echo   9) Restore database
echo   C) Docker cleanup
echo.
echo   0) Exit
echo.
set /p choice="Select option: "

if "%choice%"=="1" goto START_SERVICES
if "%choice%"=="2" goto STOP_SERVICES
if "%choice%"=="3" goto RESTART_SERVICES
if "%choice%"=="4" goto FULL_UPDATE
if "%choice%"=="5" goto QUICK_UPDATE
if "%choice%"=="6" goto VIEW_LOGS
if "%choice%"=="7" goto DATABASE_MENU
if "%choice%"=="8" goto BACKUP_DB
if "%choice%"=="9" goto RESTORE_DB
if /i "%choice%"=="C" goto CLEANUP
if "%choice%"=="0" goto EXIT
goto MAIN_MENU

:: ═══════════════════════════════════════════════════════════════════════════════
::  Service Management
:: ═══════════════════════════════════════════════════════════════════════════════

:START_SERVICES
cls
echo.
echo  Starting services...
echo.
docker-compose -f %COMPOSE_FILE% up -d
echo.
echo  Services started successfully!
pause
goto MAIN_MENU

:STOP_SERVICES
cls
echo.
echo  Stopping services...
echo.
docker-compose -f %COMPOSE_FILE% down
echo.
echo  Services stopped successfully!
pause
goto MAIN_MENU

:RESTART_SERVICES
cls
echo.
echo  Restarting services...
echo.
docker-compose -f %COMPOSE_FILE% restart
echo.
echo  Services restarted successfully!
pause
goto MAIN_MENU

:: ═══════════════════════════════════════════════════════════════════════════════
::  Updates
:: ═══════════════════════════════════════════════════════════════════════════════

:FULL_UPDATE
cls
echo.
echo  ═══ Full Update ═══
echo.
echo  Step 1/4: Pulling latest code from GitHub...
git pull origin main
echo.
echo  Step 2/4: Stopping current containers...
docker-compose -f %COMPOSE_FILE% down
echo.
echo  Step 3/4: Rebuilding backend image...
docker-compose -f %COMPOSE_FILE% build --no-cache backend
echo.
echo  Step 4/4: Starting updated services...
docker-compose -f %COMPOSE_FILE% up -d
echo.
echo  Backend updated successfully!
pause
goto MAIN_MENU

:QUICK_UPDATE
cls
echo.
echo  ═══ Quick Update ═══
echo.
echo  Pulling latest code...
git pull origin main
echo.
echo  Restarting services...
docker-compose -f %COMPOSE_FILE% restart
echo.
echo  Quick update completed!
pause
goto MAIN_MENU

:: ═══════════════════════════════════════════════════════════════════════════════
::  Logs
:: ═══════════════════════════════════════════════════════════════════════════════

:VIEW_LOGS
cls
echo.
echo  ═══ Live Logs (Ctrl+C to exit) ═══
echo.
docker-compose -f %COMPOSE_FILE% logs -f --tail=100
goto MAIN_MENU

:: ═══════════════════════════════════════════════════════════════════════════════
::  Database Menu
:: ═══════════════════════════════════════════════════════════════════════════════

:DATABASE_MENU
cls
echo.
echo  ═══ Database Management ═══
echo.
echo   View Data
echo   1) Statistics (counts)
echo   2) List all users
echo   3) List all modpacks
echo   4) List all groups
echo.
echo   Edit Data
echo   5) Delete a user
echo   6) Reset user password
echo.
echo   Advanced
echo   7) PostgreSQL shell (SQL)
echo   8) Run custom query
echo.
echo   0) Back to main menu
echo.
set /p dbchoice="Select option: "

if "%dbchoice%"=="1" goto DB_STATS
if "%dbchoice%"=="2" goto DB_USERS
if "%dbchoice%"=="3" goto DB_MODPACKS
if "%dbchoice%"=="4" goto DB_GROUPS
if "%dbchoice%"=="5" goto DB_DELETE_USER
if "%dbchoice%"=="6" goto DB_RESET_PASSWORD
if "%dbchoice%"=="7" goto DB_SHELL
if "%dbchoice%"=="8" goto DB_CUSTOM
if "%dbchoice%"=="0" goto MAIN_MENU
goto DATABASE_MENU

:DB_STATS
cls
echo.
echo  ═══ Database Statistics ═══
echo.
echo  Users:
docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT COUNT(*) as total FROM \"User\";" -t
echo  Modpacks:
docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT COUNT(*) as total FROM \"Modpack\";" -t
echo  Groups:
docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT COUNT(*) as total FROM \"Group\";" -t
echo  Mods:
docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT COUNT(*) as total FROM \"Mod\";" -t
pause
goto DATABASE_MENU

:DB_USERS
cls
echo.
echo  ═══ All Users ═══
echo.
docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT id, username, email, \"isVerified\", \"createdAt\" FROM \"User\" ORDER BY \"createdAt\" DESC;"
pause
goto DATABASE_MENU

:DB_MODPACKS
cls
echo.
echo  ═══ All Modpacks ═══
echo.
docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT id, name, \"gameVersion\", loader, \"modCount\", \"createdAt\" FROM \"Modpack\" ORDER BY \"createdAt\" DESC LIMIT 50;"
pause
goto DATABASE_MENU

:DB_GROUPS
cls
echo.
echo  ═══ All Groups ═══
echo.
docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT id, name, \"inviteCode\", \"createdAt\" FROM \"Group\" ORDER BY \"createdAt\" DESC;"
pause
goto DATABASE_MENU

:DB_DELETE_USER
cls
echo.
echo  ═══ Delete User ═══
echo.
docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT id, username, email FROM \"User\" ORDER BY \"createdAt\" DESC LIMIT 20;"
echo.
set /p userid="Enter user ID to delete (or 'cancel'): "
if /i "%userid%"=="cancel" goto DATABASE_MENU
echo.
echo  WARNING: This will permanently delete the user and all their data!
set /p confirm="Are you sure? (yes/no): "
if /i "%confirm%"=="yes" (
    docker exec nova_link_db psql -U admin -d launcher_db -c "DELETE FROM \"User\" WHERE id = '%userid%';"
    echo  User deleted successfully!
) else (
    echo  Cancelled
)
pause
goto DATABASE_MENU

:DB_RESET_PASSWORD
cls
echo.
echo  ═══ Reset User Password ═══
echo.
docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT id, username, email FROM \"User\" ORDER BY \"createdAt\" DESC LIMIT 20;"
echo.
set /p useremail="Enter user email: "
docker exec nova_link_db psql -U admin -d launcher_db -c "UPDATE \"User\" SET \"passwordHash\" = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.6FpEMDBqI.Q6Oi' WHERE email = '%useremail%';"
echo.
echo  Password reset to: TempPass123!
echo  Tell the user to change it immediately after login.
pause
goto DATABASE_MENU

:DB_SHELL
cls
echo.
echo  ═══ PostgreSQL Shell ═══
echo  Type \q to exit
echo.
docker exec -it nova_link_db psql -U admin -d launcher_db
goto DATABASE_MENU

:DB_CUSTOM
cls
echo.
echo  ═══ Custom SQL Query ═══
echo  Available tables: User, Modpack, Mod, Group, GroupMember, GroupInvite
echo.
set /p query="Enter SQL query: "
echo.
docker exec nova_link_db psql -U admin -d launcher_db -c "%query%"
pause
goto DATABASE_MENU

:: ═══════════════════════════════════════════════════════════════════════════════
::  Backup & Maintenance
:: ═══════════════════════════════════════════════════════════════════════════════

:BACKUP_DB
cls
echo.
echo  ═══ Backup Database ═══
echo.
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set BACKUP_FILE=backup_%mydate%_%mytime%.sql
echo  Creating backup...
docker exec nova_link_db pg_dump -U admin launcher_db > %BACKUP_FILE%
echo.
echo  Backup created: %BACKUP_FILE%
pause
goto MAIN_MENU

:RESTORE_DB
cls
echo.
echo  ═══ Restore Database ═══
echo.
echo  Available backups:
dir /b backup_*.sql 2>nul
echo.
set /p backupfile="Enter backup filename to restore (or 'cancel'): "
if /i "%backupfile%"=="cancel" goto MAIN_MENU
if not exist "%backupfile%" (
    echo  File not found!
    pause
    goto MAIN_MENU
)
echo.
echo  WARNING: This will REPLACE all current data!
set /p confirm="Are you absolutely sure? (yes/no): "
if /i "%confirm%"=="yes" (
    type "%backupfile%" | docker exec -i nova_link_db psql -U admin -d launcher_db
    echo  Database restored successfully!
) else (
    echo  Cancelled
)
pause
goto MAIN_MENU

:CLEANUP
cls
echo.
echo  ═══ Docker Cleanup ═══
echo.
echo  This will remove:
echo   - Unused Docker images
echo   - Stopped containers
echo   - Build cache
echo.
set /p confirm="Continue? (yes/no): "
if /i "%confirm%"=="yes" (
    docker system prune -f
    echo.
    echo  Cleanup completed!
)
pause
goto MAIN_MENU

:EXIT
echo.
echo  Goodbye!
echo.
exit /b 0
