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
    docker-compose -f $COMPOSE_FILE up -d
    echo -e "\n${GREEN}✓ Services started successfully!${NC}"
    wait_for_key
}

stop_services() {
    print_header
    echo -e "${YELLOW}Stopping services...${NC}\n"
    docker-compose -f $COMPOSE_FILE down
    echo -e "\n${GREEN}✓ Services stopped successfully!${NC}"
    wait_for_key
}

restart_services() {
    print_header
    echo -e "${YELLOW}Restarting services...${NC}\n"
    docker-compose -f $COMPOSE_FILE restart
    echo -e "\n${GREEN}✓ Services restarted successfully!${NC}"
    wait_for_key
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Update Functions
# ═══════════════════════════════════════════════════════════════════════════════

update_backend() {
    print_header
    echo -e "${CYAN}═══ Updating Backend ═══${NC}\n"
    
    echo -e "${YELLOW}Step 1/4: Pulling latest code from GitHub...${NC}"
    git pull origin main
    
    echo -e "\n${YELLOW}Step 2/4: Stopping current containers...${NC}"
    docker-compose -f $COMPOSE_FILE down
    
    echo -e "\n${YELLOW}Step 3/4: Rebuilding backend image...${NC}"
    docker-compose -f $COMPOSE_FILE build --no-cache backend
    
    echo -e "\n${YELLOW}Step 4/4: Starting updated services...${NC}"
    docker-compose -f $COMPOSE_FILE up -d
    
    echo -e "\n${GREEN}✓ Backend updated successfully!${NC}"
    wait_for_key
}

quick_update() {
    print_header
    echo -e "${CYAN}═══ Quick Update (without rebuild) ═══${NC}\n"
    
    echo -e "${YELLOW}Pulling latest code...${NC}"
    git pull origin main
    
    echo -e "\n${YELLOW}Restarting services...${NC}"
    docker-compose -f $COMPOSE_FILE restart
    
    echo -e "\n${GREEN}✓ Quick update completed!${NC}"
    wait_for_key
}

# ═══════════════════════════════════════════════════════════════════════════════
#  Logs
# ═══════════════════════════════════════════════════════════════════════════════

view_logs() {
    print_header
    echo -e "${CYAN}═══ Live Logs (Ctrl+C to exit) ═══${NC}\n"
    docker-compose -f $COMPOSE_FILE logs -f --tail=100
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

db_shell() {
    print_header
    echo -e "${CYAN}═══ PostgreSQL Shell ═══${NC}"
    echo -e "${YELLOW}Type \\q to exit${NC}\n"
    docker exec -it nova_link_db psql -U admin -d launcher_db
}

db_list_users() {
    print_header
    echo -e "${CYAN}═══ All Users ═══${NC}\n"
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "SELECT id, username, email, \"isVerified\", \"createdAt\" FROM \"User\" ORDER BY \"createdAt\" DESC;"
    wait_for_key
}

db_list_modpacks() {
    print_header
    echo -e "${CYAN}═══ All Modpacks ═══${NC}\n"
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "SELECT id, name, \"gameVersion\", loader, \"modCount\", \"createdAt\" FROM \"Modpack\" ORDER BY \"createdAt\" DESC LIMIT 50;"
    wait_for_key
}

db_list_groups() {
    print_header
    echo -e "${CYAN}═══ All Groups ═══${NC}\n"
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "SELECT id, name, \"inviteCode\", \"createdAt\" FROM \"Group\" ORDER BY \"createdAt\" DESC;"
    wait_for_key
}

db_count_all() {
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
    print_header
    echo -e "${CYAN}═══ Delete User ═══${NC}\n"
    
    # List users first
    docker exec nova_link_db psql -U admin -d launcher_db -c \
        "SELECT id, username, email FROM \"User\" ORDER BY \"createdAt\" DESC LIMIT 20;"
    
    echo ""
    read -p "Enter user ID to delete (or 'cancel'): " user_id
    
    if [ "$user_id" = "cancel" ]; then
        return
    fi
    
    echo -e "\n${RED}WARNING: This will permanently delete the user and all their data!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        docker exec nova_link_db psql -U admin -d launcher_db -c \
            "DELETE FROM \"User\" WHERE id = '$user_id';"
        echo -e "\n${GREEN}✓ User deleted successfully${NC}"
    else
        echo -e "\n${YELLOW}Cancelled${NC}"
    fi
    wait_for_key
}

db_reset_user_password() {
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
