#!/bin/bash

# Database Restore Script for Sightline.ai
# 
# This script restores a database from a backup file created by database-backup.sh
# Includes safety checks and validation to prevent accidental data loss.
#
# Usage: ./scripts/database-restore.sh <backup-file> [environment]
# Example: ./scripts/database-restore.sh backups/sightline_production_20240117_120000.sql.gz production

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Arguments
BACKUP_FILE="${1:-}"
ENVIRONMENT="${2:-production}"

# Validate arguments
if [ -z "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not specified${NC}"
    echo "Usage: $0 <backup-file> [environment]"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env.${ENVIRONMENT}" ]; then
    export $(cat ".env.${ENVIRONMENT}" | grep -v '^#' | xargs)
elif [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}Error: No environment file found${NC}"
    exit 1
fi

# Validate DATABASE_URL
if [ -z "${DATABASE_URL:-}" ]; then
    echo -e "${RED}Error: DATABASE_URL not set${NC}"
    exit 1
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Sightline Database Restore - ${ENVIRONMENT}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Function to parse DATABASE_URL
parse_database_url() {
    # Extract components from PostgreSQL URL
    # Format: postgresql://user:password@host:port/database?params
    
    # Remove postgresql:// prefix
    local url="${DATABASE_URL#postgresql://}"
    url="${url#postgres://}"
    
    # Extract user:password
    local auth="${url%%@*}"
    export PGUSER="${auth%%:*}"
    export PGPASSWORD="${auth#*:}"
    
    # Extract host:port/database
    local host_db="${url#*@}"
    host_db="${host_db%%\?*}"  # Remove query parameters
    
    # Extract host and port
    local host_port="${host_db%%/*}"
    export PGHOST="${host_port%%:*}"
    export PGPORT="${host_port#*:}"
    [ "$PGPORT" = "$PGHOST" ] && PGPORT="5432"  # Default port if not specified
    
    # Extract database name
    export PGDATABASE="${host_db#*/}"
}

# Parse the DATABASE_URL
parse_database_url

echo -e "${BLUE}ℹ${NC} Database: ${PGDATABASE}"
echo -e "${BLUE}ℹ${NC} Host: ${PGHOST}"
echo -e "${BLUE}ℹ${NC} Port: ${PGPORT}"
echo -e "${BLUE}ℹ${NC} User: ${PGUSER}"
echo -e "${BLUE}ℹ${NC} Backup file: ${BACKUP_FILE}"
echo ""

# Safety check for production
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${YELLOW}⚠️  WARNING: You are about to restore to PRODUCTION database!${NC}"
    echo -e "${YELLOW}⚠️  This will DELETE all existing data!${NC}"
    echo ""
    echo -e "Database: ${PGDATABASE}"
    echo -e "Host: ${PGHOST}"
    echo ""
    read -p "Type 'RESTORE PRODUCTION' to confirm: " confirmation
    
    if [ "$confirmation" != "RESTORE PRODUCTION" ]; then
        echo -e "${RED}Restore cancelled${NC}"
        exit 1
    fi
fi

# Function to count records before restore
count_records_before() {
    echo -e "${YELLOW}⏳${NC} Counting existing records..."
    
    # Try to count records in main tables
    local user_count=$(PGPASSWORD="$PGPASSWORD" psql \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        -t \
        -c "SELECT COUNT(*) FROM \"User\"" 2>/dev/null || echo "0")
    
    local summary_count=$(PGPASSWORD="$PGPASSWORD" psql \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        -t \
        -c "SELECT COUNT(*) FROM \"Summary\"" 2>/dev/null || echo "0")
    
    echo -e "${BLUE}ℹ${NC} Current Users: ${user_count// /}"
    echo -e "${BLUE}ℹ${NC} Current Summaries: ${summary_count// /}"
    echo ""
}

# Function to perform restore
perform_restore() {
    local temp_file="/tmp/restore_${RANDOM}.sql"
    
    echo -e "${YELLOW}⏳${NC} Preparing backup file..."
    
    # Decompress the backup file if it's gzipped
    if [[ "$BACKUP_FILE" == *.gz ]]; then
        echo -e "${YELLOW}⏳${NC} Decompressing backup..."
        zcat "$BACKUP_FILE" > "$temp_file"
    else
        cp "$BACKUP_FILE" "$temp_file"
    fi
    
    echo -e "${YELLOW}⏳${NC} Starting database restore..."
    echo -e "${YELLOW}⏳${NC} This may take several minutes for large databases..."
    
    # Perform the restore using psql
    if PGPASSWORD="$PGPASSWORD" psql \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        --set ON_ERROR_STOP=on \
        -f "$temp_file" \
        > /tmp/restore.log 2>&1; then
        
        echo -e "${GREEN}✓${NC} Database restored successfully!"
        
        # Clean up temp file
        rm -f "$temp_file"
        
        return 0
    else
        echo -e "${RED}✗${NC} Restore failed! Check /tmp/restore.log for details"
        echo ""
        echo "Last 20 lines of error log:"
        tail -20 /tmp/restore.log
        
        # Clean up temp file
        rm -f "$temp_file"
        
        return 1
    fi
}

# Function to verify restore
verify_restore() {
    echo ""
    echo -e "${YELLOW}⏳${NC} Verifying restored database..."
    
    # Check if main tables exist
    local tables_ok=true
    
    for table in "User" "Summary" "ShareLink" "UsageEvent" "Category" "Tag"; do
        if PGPASSWORD="$PGPASSWORD" psql \
            -h "$PGHOST" \
            -p "$PGPORT" \
            -U "$PGUSER" \
            -d "$PGDATABASE" \
            -t \
            -c "SELECT 1 FROM \"$table\" LIMIT 1" &>/dev/null; then
            echo -e "${GREEN}✓${NC} Table '$table' exists"
        else
            echo -e "${RED}✗${NC} Table '$table' not found"
            tables_ok=false
        fi
    done
    
    # Count records after restore
    echo ""
    echo -e "${YELLOW}⏳${NC} Counting restored records..."
    
    local user_count=$(PGPASSWORD="$PGPASSWORD" psql \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        -t \
        -c "SELECT COUNT(*) FROM \"User\"" 2>/dev/null || echo "0")
    
    local summary_count=$(PGPASSWORD="$PGPASSWORD" psql \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        -t \
        -c "SELECT COUNT(*) FROM \"Summary\"" 2>/dev/null || echo "0")
    
    echo -e "${BLUE}ℹ${NC} Restored Users: ${user_count// /}"
    echo -e "${BLUE}ℹ${NC} Restored Summaries: ${summary_count// /}"
    
    if [ "$tables_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# Function to run Prisma migrations after restore
run_migrations() {
    echo ""
    echo -e "${YELLOW}⏳${NC} Running Prisma migrations to sync schema..."
    
    if npx prisma migrate deploy; then
        echo -e "${GREEN}✓${NC} Migrations applied successfully"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} Migration failed - manual intervention may be required"
        return 1
    fi
}

# Main execution
main() {
    # Count records before restore (for comparison)
    count_records_before
    
    # Confirm one more time
    echo -e "${YELLOW}⚠️  This operation will replace all data in the database${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Restore cancelled${NC}"
        exit 1
    fi
    
    # Perform restore
    if perform_restore; then
        # Verify the restore
        if verify_restore; then
            # Run migrations to ensure schema is up to date
            run_migrations
            
            echo ""
            echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
            echo -e "${GREEN}   Database restored successfully!${NC}"
            echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
            
            # Run validation script if available
            if [ -f "scripts/validate-database.js" ]; then
                echo ""
                echo -e "${YELLOW}⏳${NC} Running database validation..."
                node scripts/validate-database.js || true
            fi
            
            exit 0
        else
            echo ""
            echo -e "${YELLOW}⚠${NC} Restore completed with warnings"
            echo -e "${YELLOW}⚠${NC} Please verify the database manually"
            exit 0
        fi
    else
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
        echo -e "${RED}   Restore failed!${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
        
        exit 1
    fi
}

# Check for required commands
for cmd in psql pg_dump; do
    if ! command -v $cmd &> /dev/null; then
        echo -e "${RED}Error: $cmd is not installed${NC}"
        echo "Please install PostgreSQL client tools:"
        echo "  macOS: brew install postgresql"
        echo "  Ubuntu: sudo apt-get install postgresql-client"
        exit 1
    fi
done

# Run main function
main