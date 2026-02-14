#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to load environment variables
load_env() {
    if [ -f .env.production ]; then
        export $(grep -v '^#' .env.production | xargs)
        echo -e "${GREEN}✅ Loaded .env.production${NC}"
    else
        echo -e "${RED}❌ .env.production file not found!${NC}"
        exit 1
    fi

    if [ -z "$DATABASE_URL" ]; then
        echo -e "${RED}❌ DATABASE_URL is not set in .env.production${NC}"
        exit 1
    fi
}

# Function to show menu
show_menu() {
    echo -e "\n${BLUE}🚀 SwapLink Production Database Manager${NC}"
    echo "----------------------------------------"
    echo "1. Deploy Migrations (prisma migrate deploy)"
    echo "2. Open Prisma Studio (prisma studio)"
    echo "3. Reset Database (prisma migrate reset) - ⚠️  DANGER"
    echo "4. Clear Data (Truncate Tables) - ⚠️  DANGER"
    echo "5. View Migration Status (prisma migrate status)"
    echo "6. Mark Migration as Rolled Back (Resolve Failed Migration)"
    echo "7. Exit"
    echo "----------------------------------------"
    read -p "Select an option [1-7]: " choice
}

# Main Logic
load_env

while true; do
    show_menu
    case $choice in
        1)
            echo -e "\n${YELLOW}🚀 Deploying migrations...${NC}"
            npx prisma migrate deploy
            ;;
        2)
            echo -e "\n${YELLOW}🌐 Opening Prisma Studio...${NC}"
            npx prisma studio
            ;;
        3)
            echo -e "\n${RED}⚠️  WARNING: This will wipe all data in the production database!${NC}"
            read -p "Are you absolutely sure? (Type 'yes' to confirm): " confirm
            if [ "$confirm" == "yes" ]; then
                echo -e "${YELLOW}🗑️  Resetting database...${NC}"
                npx prisma migrate reset --force
            else
                echo -e "${GREEN}❌ Operation cancelled.${NC}"
            fi
            ;;

        4)
            echo -e "\n${RED}⚠️  WARNING: This will delete ALL data in the production database! Schema will be preserved.${NC}"
            read -p "Are you absolutely sure? (Type 'yes' to confirm): " confirm
            if [ "$confirm" == "yes" ]; then
                echo -e "${YELLOW}🗑️  Clearing data...${NC}"
                npx ts-node scripts/truncate-db.ts
            else
                echo -e "${GREEN}❌ Operation cancelled.${NC}"
            fi
            ;;
        5)
            echo -e "\n${YELLOW}🔍 Checking migration status...${NC}"
            npx prisma migrate status
            ;;
        6)
            echo -e "\n${YELLOW}🛠️  Marking migration as rolled back (Resolve Failed State)...${NC}"
            echo "This is used when a migration failed and you fixed the migration file or want to retry."
            read -p "Enter the full migration name (e.g., 20260214062127_updated_order_status): " migration_name
            
            if [ -z "$migration_name" ]; then
                echo -e "${RED}❌ Migration name cannot be empty.${NC}"
            else
                npx prisma migrate resolve --rolled-back "$migration_name"
            fi
            ;;
        7)
            echo -e "\n${GREEN}👋 Exiting...${NC}"
            exit 0
            ;;
        *)
            echo -e "\n${RED}❌ Invalid option. Please try again.${NC}"
            ;;
    esac
    
    echo -e "\nPress Enter to continue..."
    read
done
