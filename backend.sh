#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
#  Nova Link - Backend Management Tool
#  For Linux/macOS servers (ARM64 & x64)
# ═══════════════════════════════════════════════════════════════════════════════

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Docker compose file
COMPOSE_FILE="docker-compose.prod.yml"

# ═══════════════════════════════════════════════════════════════════════════════
#  Helper Functions
# ═══════════════════════════════════════════════════════════════════════════════

print_header() {
    clear
    echo -e "${PURPLE}"
    echo "╔═══════════════════════════════════════════════════════════════════════╗"
    echo "║                                                                       ║"
    echo "║     ███╗   ██╗ ██████╗ ██╗   ██╗ █████╗     ██╗     ██╗███╗   ██╗██╗  ║"
    echo "║     ████╗  ██║██╔═══██╗██║   ██║██╔══██╗    ██║     ██║████╗  ██║██║  ║"
    echo "║     ██╔██╗ ██║██║   ██║██║   ██║███████║    ██║     ██║██╔██╗ ██║█████║"
    echo "║     ██║╚██╗██║██║   ██║╚██╗ ██╔╝██╔══██║    ██║     ██║██║╚██╗██║██╔═╝ ║"
    echo "║     ██║ ╚████║╚██████╔╝ ╚████╔╝ ██║  ██║    ███████╗██║██║ ╚████║█████║"
    echo "║     ╚═╝  ╚═══╝ ╚═════╝   ╚═══╝  ╚═╝  ╚═╝    ╚══════╝╚═╝╚═╝  ╚═══╝╚════╝"
    echo "║                                                                       ║"
    echo "║                    Backend Management Console                         ║"
    echo "╚═══════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_status() {
    echo -e "\n${CYAN}═══ Service Status ═══${NC}"
    
    # Check if containers are running
    if docker ps --format '{{.Names}}' | grep -q "nova_link_api"; then
        echo -e "  Backend API:  ${GREEN}● RUNNING${NC}"
    else
        echo -e "  Backend API:  ${RED}○ STOPPED${NC}"
    fi
    
    if docker ps --format '{{.Names}}' | grep -q "nova_link_db"; then
        echo -e "  PostgreSQL:   ${GREEN}● RUNNING${NC}"
    else
        echo -e "  PostgreSQL:   ${RED}○ STOPPED${NC}"
    fi
    echo ""
}

wait_for_key() {
    echo -e "\n${YELLOW}Press any key to continue...${NC}"
    read -n 1 -s
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Service Management
# ═══════════════════════════════════════════════════════════════════════════════

start_services() {
    print_header
    echo -e "${GREEN}Starting services...${NC}\n"
    if docker compose -f $COMPOSE_FILE up -d; then
        echo -e "\n${GREEN}✓ Services started successfully!${NC}"
    else
        echo -e "\n${RED}✗ Error starting services. Try 'Force restart' option.${NC}"
    fi
    wait_for_key
}

stop_services() {
    print_header
    echo -e "${YELLOW}Stopping services...${NC}\n"
    if docker compose -f $COMPOSE_FILE down; then
        echo -e "\n${GREEN}✓ Services stopped successfully!${NC}"
    else
        echo -e "\n${RED}✗ Error stopping services${NC}"
    fi
    wait_for_key
}

restart_services() {
    print_header
    echo -e "${YELLOW}Restarting services...${NC}\n"
    if docker compose -f $COMPOSE_FILE restart; then
        echo -e "\n${GREEN}✓ Services restarted successfully!${NC}"
    else
        echo -e "\n${RED}✗ Error restarting services. Try 'Force restart' option.${NC}"
    fi
    wait_for_key
}

force_restart() {
    print_header
    echo -e "${RED}═══ Force Restart (Clean Start) ═══${NC}\n"
    
    echo -e "${YELLOW}Step 1/4: Stopping all Nova Link containers...${NC}"
    docker stop nova_link_api nova_link_db 2>/dev/null || true
    
    echo -e "${YELLOW}Step 2/4: Removing old containers...${NC}"
    docker rm nova_link_api nova_link_db 2>/dev/null || true
    
    echo -e "${YELLOW}Step 3/4: Cleaning up...${NC}"
    docker compose -f $COMPOSE_FILE down --remove-orphans 2>/dev/null || true
    
    echo -e "${YELLOW}Step 4/4: Starting fresh...${NC}"
    if docker compose -f $COMPOSE_FILE up -d; then
        echo -e "\n${GREEN}✓ Services started successfully!${NC}"
    else
        echo -e "\n${RED}✗ Error starting services${NC}"
    fi
    wait_for_key
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Update Functions
# ═══════════════════════════════════════════════════════════════════════════════

fix_git_permissions() {
    # If running as root via sudo, fix permissions so git works for the user later
    if [ "$EUID" -eq 0 ] && [ -n "$SUDO_USER" ]; then
        echo -e "${YELLOW}Fixing git permissions...${NC}"
        chown -R "$SUDO_USER:$(id -gn $SUDO_USER)" .git 2>/dev/null || true
    fi
}

update_backend() {
    print_header
    echo -e "${CYAN}═══ Updating Backend ═══${NC}\n"
    
    fix_git_permissions

    echo -e "${YELLOW}Step 1/5: Discarding local changes...${NC}"
    git checkout -- . 2>/dev/null || true
    git clean -fd 2>/dev/null || true
    
    echo -e "${YELLOW}Step 2/5: Pulling latest code from GitHub...${NC}"
    if ! git pull origin main; then
        echo -e "\n${RED}✗ Failed to pull from GitHub${NC}"
        wait_for_key
        return
    fi
    
    echo -e "\n${YELLOW}Step 3/5: Stopping current containers...${NC}"
    docker compose -f $COMPOSE_FILE down
    
    echo -e "\n${YELLOW}Step 4/5: Rebuilding backend image...${NC}"
    docker compose -f $COMPOSE_FILE build --no-cache backend
    
    echo -e "\n${YELLOW}Step 5/5: Starting updated services...${NC}"
    if docker compose -f $COMPOSE_FILE up -d; then
        echo -e "\n${GREEN}✓ Backend updated successfully!${NC}"
    else
        echo -e "\n${RED}✗ Error starting services${NC}"
    fi
    wait_for_key
}

quick_update() {
    print_header
    echo -e "${CYAN}═══ Quick Update (without rebuild) ═══${NC}\n"
    
    fix_git_permissions

    echo -e "${YELLOW}Discarding local changes...${NC}"
    git checkout -- . 2>/dev/null || true
    
    echo -e "${YELLOW}Pulling latest code...${NC}"
    if ! git pull origin main; then
        echo -e "\n${RED}✗ Failed to pull from GitHub${NC}"
        wait_for_key
        return
    fi
    
    echo -e "\n${YELLOW}Restarting services...${NC}"
    docker compose -f $COMPOSE_FILE restart
    
    echo -e "\n${GREEN}✓ Quick update completed!${NC}"
    wait_for_key
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Logs
# ═══════════════════════════════════════════════════════════════════════════════

view_logs() {
    print_header
    echo -e "${CYAN}═══ Live Logs (Ctrl+C to exit) ═══${NC}\n"
    docker compose -f $COMPOSE_FILE logs -f --tail=100
}

view_backend_logs() {
    print_header
    echo -e "${CYAN}═══ Backend Logs (Ctrl+C to exit) ═══${NC}\n"
    docker logs -f --tail=100 nova_link_api
}

view_db_logs() {
    print_header
    echo -e "${CYAN}═══ Database Logs (Ctrl+C to exit) ═══${NC}\n"
    docker logs -f --tail=100 nova_link_db
}

logs_menu() {
    while true; do
        print_header
        echo -e "${CYAN}═══ Logs Menu ═══${NC}\n"
        echo -e "  ${WHITE}1)${NC} View all logs (live)"
        echo -e "  ${WHITE}2)${NC} View backend logs only"
        echo -e "  ${WHITE}3)${NC} View database logs only"
        echo -e "  ${WHITE}0)${NC} Back to main menu"
        echo ""
        read -p "Select option: " choice
        
        case $choice in
            1) view_logs ;;
            2) view_backend_logs ;;
            3) view_db_logs ;;
            0) break ;;
            *) echo -e "${RED}Invalid option${NC}"; sleep 1 ;;
        esac
    done
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Database Management
# ═══════════════════════════════════════════════════════════════════════════════

check_db_running() {
    if ! docker ps --format '{{.Names}}' | grep -q "nova_link_db"; then
        echo -e "${RED}Error: Database container is not running!${NC}"
        echo -e "${YELLOW}Please start services first (option 1 or f).${NC}"
        wait_for_key
        return 1
    fi
    return 0
}

db_shell() {
    check_db_running || return
    print_header
    echo -e "${CYAN}═══ PostgreSQL Shell ═══${NC}"
    echo -e "${YELLOW}Type \\q to exit${NC}\n"
    docker exec -it nova_link_db psql -U admin -d launcher_db
}

db_list_users() {
    check_db_running || return
    print_header
    echo -e "${CYAN}═══ All Users ═══${NC}\n"
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "SELECT id, username, email, \"isVerified\", \"createdAt\" FROM \"User\" ORDER BY \"createdAt\" DESC;"
    wait_for_key
}

db_list_modpacks() {
    check_db_running || return
    print_header
    echo -e "${CYAN}═══ All Modpacks ═══${NC}\n"
    # Note: gameVersion and loader are now in ModpackVersion table
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "SELECT id, name, \"authorId\", \"isPublic\", \"createdAt\" FROM \"Modpack\" ORDER BY \"createdAt\" DESC LIMIT 50;"
    wait_for_key
}

db_list_groups() {
    check_db_running || return
    print_header
    echo -e "${CYAN}═══ All Groups ═══${NC}\n"
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "SELECT id, name, \"inviteCode\", \"createdAt\" FROM \"Group\" ORDER BY \"createdAt\" DESC;"
    wait_for_key
}

db_count_all() {
    check_db_running || return
    print_header
    echo -e "${CYAN}═══ Database Statistics ═══${NC}\n"
    echo -e "${WHITE}Users:${NC}"
    docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT COUNT(*) as total FROM \"User\";" -t
    echo -e "${WHITE}Modpacks:${NC}"
    docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT COUNT(*) as total FROM \"Modpack\";" -t
    echo -e "${WHITE}Groups:${NC}"
    docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT COUNT(*) as total FROM \"Group\";" -t
    echo -e "${WHITE}Mods:${NC}"
    docker exec nova_link_db psql -U admin -d launcher_db -c "SELECT COUNT(*) as total FROM \"Mod\";" -t
    wait_for_key
}

db_delete_user() {
    check_db_running || return
    print_header
    echo -e "${CYAN}═══ Delete User ═══${NC}\n"
    
    # List users first
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "SELECT id, username, email FROM \"User\" ORDER BY \"createdAt\" DESC LIMIT 20;"
    
    echo ""
    read -p "Enter user ID to delete (or 'cancel'): " user_id
    
    if [ "$user_id" = "cancel" ] || [ -z "$user_id" ]; then
        return
    fi
    
    echo -e "\n${YELLOW}Choose deletion mode:${NC}"
    echo -e "  1) Safe Delete (Fails if user has modpacks/groups)"
    echo -e "  2) ${RED}Force Cascade Delete (REMOVES ALL User's Modpacks, Groups, etc.)${NC}"
    read -p "Select option: " del_mode

    echo -e "\n${RED}WARNING: This action is irreversible!${NC}"
    if [ "$del_mode" = "2" ]; then
         echo -e "${RED}You are about to delete a user AND ALL THEIR CREATED CONTENT.${NC}"
    fi
    read -p "Are you sure? (type 'yes' to confirm): " confirm
    
    if [ "$confirm" = "yes" ]; then
        if [ "$del_mode" = "2" ]; then
             echo -e "\n${YELLOW}Executing Cascade Delete...${NC}"
             # Start transaction block for cascade delete
             # 1. Remove memberships, 2. Remove modpacks (cascades to versions/mods), 3. Remove groups (cascades to members), 4. Remove user
             CMD="BEGIN;
                  DELETE FROM \"GroupMember\" WHERE \"userId\" = '$user_id';
                  DELETE FROM \"Modpack\" WHERE \"authorId\" = '$user_id';
                  DELETE FROM \"Group\" WHERE \"ownerId\" = '$user_id';
                  DELETE FROM \"User\" WHERE id = '$user_id';
                  COMMIT;"
             
             if docker exec nova_link_db psql -U admin -d launcher_db -c "$CMD"; then
                 echo -e "\n${GREEN}✓ User and all associated data deleted successfully${NC}"
             else
                 echo -e "\n${RED}✗ Error during cascade delete. Transaction rolled back.${NC}"
             fi
        else
             # Standard delete
             if docker exec nova_link_db psql -U admin -d launcher_db -c "DELETE FROM \"User\" WHERE id = '$user_id';"; then
                 echo -e "\n${GREEN}✓ User deleted successfully${NC}"
             else
                 echo -e "\n${RED}✗ Database error. User likely has Modpacks or Groups.${NC}"
                 echo -e "${YELLOW}Tip: Use 'Force Cascade Delete' to clean up dependencies automatically.${NC}"
             fi
        fi
    else
        echo -e "\n${YELLOW}Cancelled${NC}"
    fi
    wait_for_key
}

db_reset_user_password() {
    check_db_running || return
    print_header
    echo -e "${CYAN}═══ Reset User Password ═══${NC}\n"
    echo -e "${YELLOW}Note: This sets a temporary password. User should change it after login.${NC}\n"
    
    # List users
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "SELECT id, username, email FROM \"User\" ORDER BY \"createdAt\" DESC LIMIT 20;"
    
    echo ""
    read -p "Enter user email: " user_email
    
    # Generate bcrypt hash for 'TempPass123!' 
    # This is pre-computed for simplicity
    TEMP_HASH='\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.6FpEMDBqI.Q6Oi'
    
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "UPDATE \"User\" SET \"passwordHash\" = '$TEMP_HASH' WHERE email = '$user_email';"
    
    echo -e "\n${GREEN}✓ Password reset to: TempPass123!${NC}"
    echo -e "${YELLOW}Tell the user to change it immediately after login.${NC}"
    wait_for_key
}

db_custom_query() {
    check_db_running || return
    print_header
    echo -e "${CYAN}═══ Custom SQL Query ═══${NC}\n"
    echo -e "${YELLOW}Available tables: User, Modpack, Mod, Group, GroupMember, GroupInvite${NC}\n"
    read -p "Enter SQL query: " query
    
    echo -e "\n${CYAN}Result:${NC}\n"
    docker exec nova_link_db psql -U admin -d launcher_db -c "$query"
    wait_for_key
}

database_menu() {
    while true; do
        print_header
        echo -e "${CYAN}═══ Database Management ═══${NC}\n"
        echo -e "  ${WHITE}📊 View Data${NC}"
        echo -e "  ${WHITE}1)${NC} Statistics (counts)"
        echo -e "  ${WHITE}2)${NC} List all users"
        echo -e "  ${WHITE}3)${NC} List all modpacks"
        echo -e "  ${WHITE}4)${NC} List all groups"
        echo ""
        echo -e "  ${WHITE}✏️  Edit Data${NC}"
        echo -e "  ${WHITE}5)${NC} Delete a user"
        echo -e "  ${WHITE}6)${NC} Reset user password"
        echo ""
        echo -e "  ${WHITE}🔧 Advanced${NC}"
        echo -e "  ${WHITE}7)${NC} PostgreSQL shell (SQL)"
        echo -e "  ${WHITE}8)${NC} Run custom query"
        echo ""
        echo -e "  ${WHITE}0)${NC} Back to main menu"
        echo ""
        read -p "Select option: " choice
        
        case $choice in
            1) db_count_all ;;
            2) db_list_users ;;
            3) db_list_modpacks ;;
            4) db_list_groups ;;
            5) db_delete_user ;;
            6) db_reset_user_password ;;
            7) db_shell ;;
            8) db_custom_query ;;
            0) break ;;
            *) echo -e "${RED}Invalid option${NC}"; sleep 1 ;;
        esac
    done
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Backup & Maintenance
# ═══════════════════════════════════════════════════════════════════════════════

backup_database() {
    print_header
    echo -e "${CYAN}═══ Backup Database ═══${NC}\n"
    
    BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
    
    echo -e "${YELLOW}Creating backup...${NC}"
    docker exec nova_link_db pg_dump -U admin launcher_db > "$BACKUP_FILE"
    
    echo -e "\n${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
    echo -e "Size: $(du -h $BACKUP_FILE | cut -f1)"
    wait_for_key
}

restore_database() {
    print_header
    echo -e "${CYAN}═══ Restore Database ═══${NC}\n"
    
    # List available backups
    echo -e "${WHITE}Available backups:${NC}"
    ls -la backup_*.sql 2>/dev/null || echo "No backups found"
    
    echo ""
    read -p "Enter backup filename to restore (or 'cancel'): " backup_file
    
    if [ "$backup_file" = "cancel" ] || [ ! -f "$backup_file" ]; then
        echo -e "${YELLOW}Cancelled or file not found${NC}"
        wait_for_key
        return
    fi
    
    echo -e "\n${RED}WARNING: This will REPLACE all current data!${NC}"
    read -p "Are you absolutely sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        cat "$backup_file" | docker exec -i nova_link_db psql -U admin -d launcher_db
        echo -e "\n${GREEN}✓ Database restored successfully${NC}"
    else
        echo -e "\n${YELLOW}Cancelled${NC}"
    fi
    wait_for_key
}

cleanup_docker() {
    print_header
    echo -e "${CYAN}═══ Docker Cleanup ═══${NC}\n"
    
    echo -e "${YELLOW}This will remove:${NC}"
    echo "  - Unused Docker images"
    echo "  - Stopped containers"
    echo "  - Build cache"
    echo ""
    read -p "Continue? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        docker system prune -f
        echo -e "\n${GREEN}✓ Cleanup completed${NC}"
    fi
    wait_for_key
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Main Menu
# ═══════════════════════════════════════════════════════════════════════════════

main_menu() {
    while true; do
        print_header
        print_status
        
        echo -e "${CYAN}═══ Main Menu ═══${NC}\n"
        echo -e "  ${GREEN}⚡ Quick Actions${NC}"
        echo -e "  ${WHITE}1)${NC} Start services"
        echo -e "  ${WHITE}2)${NC} Stop services"
        echo -e "  ${WHITE}3)${NC} Restart services"
        echo -e "  ${WHITE}f)${NC} Force restart (fix stuck containers)"
        echo ""
        echo -e "  ${YELLOW}🔄 Updates${NC}"
        echo -e "  ${WHITE}4)${NC} Full update (pull + rebuild)"
        echo -e "  ${WHITE}5)${NC} Quick update (pull + restart)"
        echo ""
        echo -e "  ${BLUE}📋 Logs & Data${NC}"
        echo -e "  ${WHITE}6)${NC} View logs"
        echo -e "  ${WHITE}7)${NC} Database management"
        echo ""
        echo -e "  ${PURPLE}🔧 Maintenance${NC}"
        echo -e "  ${WHITE}8)${NC} Backup database"
        echo -e "  ${WHITE}9)${NC} Restore database"
        echo -e "  ${WHITE}c)${NC} Docker cleanup"
        echo ""
        echo -e "  ${WHITE}0)${NC} Exit"
        echo ""
        read -p "Select option: " choice
        
        case $choice in
            1) start_services ;;
            2) stop_services ;;
            3) restart_services ;;
            f|F) force_restart ;;
            4) update_backend ;;
            5) quick_update ;;
            6) logs_menu ;;
            7) database_menu ;;
            8) backup_database ;;
            9) restore_database ;;
            c|C) cleanup_docker ;;
            0) 
                echo -e "\n${GREEN}Goodbye!${NC}\n"
                exit 0 
                ;;
            *) 
                echo -e "${RED}Invalid option${NC}"
                sleep 1 
                ;;
        esac
    done
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Entry Point
# ═══════════════════════════════════════════════════════════════════════════════

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

# Check if docker-compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    echo -e "${RED}Error: $COMPOSE_FILE not found${NC}"
    echo "Make sure you're running this script from the Nova-Link directory"
    exit 1
fi

# Start the menu
main_menu
