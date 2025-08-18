#!/bin/bash

# Database Backup Script for Sightline.ai
# 
# This script creates timestamped backups of the production database
# and manages retention of old backups.
#
# Usage: ./scripts/database-backup.sh [environment]
# Example: ./scripts/database-backup.sh production

set -e  # Exit on error
set -u  # Exit on undefined variable

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
ENVIRONMENT="${1:-production}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="sightline_${ENVIRONMENT}_${TIMESTAMP}.sql"

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

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   Sightline Database Backup - ${ENVIRONMENT}${NC}"
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
echo ""

# Function to perform backup
perform_backup() {
    local backup_path="${BACKUP_DIR}/${BACKUP_FILENAME}"
    
    echo -e "${YELLOW}⏳${NC} Starting backup to ${backup_path}..."
    
    # Perform the backup using pg_dump
    # Options:
    # -v: Verbose mode
    # --no-owner: Don't output ownership commands
    # --no-acl: Don't output access privileges
    # --clean: Include DROP statements
    # --if-exists: Use IF EXISTS for DROP statements
    # --format=plain: Plain SQL format (readable)
    # --no-password: Never prompt for password (use PGPASSWORD env var)
    
    if PGPASSWORD="$PGPASSWORD" pg_dump \
        -h "$PGHOST" \
        -p "$PGPORT" \
        -U "$PGUSER" \
        -d "$PGDATABASE" \
        -v \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        --format=plain \
        --no-password \
        > "$backup_path" 2> "${backup_path}.log"; then
        
        # Compress the backup
        echo -e "${YELLOW}⏳${NC} Compressing backup..."
        gzip "$backup_path"
        
        # Get file size
        local size=$(ls -lh "${backup_path}.gz" | awk '{print $5}')
        
        echo -e "${GREEN}✓${NC} Backup completed successfully!"
        echo -e "${GREEN}✓${NC} File: ${backup_path}.gz"
        echo -e "${GREEN}✓${NC} Size: ${size}"
        
        # Remove log file if backup succeeded
        rm -f "${backup_path}.log"
        
        return 0
    else
        echo -e "${RED}✗${NC} Backup failed! Check ${backup_path}.log for details"
        return 1
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    echo ""
    echo -e "${YELLOW}⏳${NC} Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
    
    # Find and delete old backup files
    local deleted_count=0
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            echo -e "${BLUE}ℹ${NC} Deleting: $(basename "$file")"
            rm -f "$file"
            ((deleted_count++))
        fi
    done < <(find "$BACKUP_DIR" -name "sightline_${ENVIRONMENT}_*.sql.gz" -type f -mtime +${RETENTION_DAYS})
    
    if [ $deleted_count -gt 0 ]; then
        echo -e "${GREEN}✓${NC} Deleted ${deleted_count} old backup(s)"
    else
        echo -e "${BLUE}ℹ${NC} No old backups to delete"
    fi
}

# Function to list existing backups
list_backups() {
    echo ""
    echo -e "${BLUE}═══ Existing Backups ═══${NC}"
    
    local backup_count=0
    while IFS= read -r file; do
        if [ -n "$file" ]; then
            local size=$(ls -lh "$file" | awk '{print $5}')
            local date=$(ls -l "$file" | awk '{print $6, $7, $8}')
            echo -e "  $(basename "$file") (${size}, ${date})"
            ((backup_count++))
        fi
    done < <(find "$BACKUP_DIR" -name "sightline_${ENVIRONMENT}_*.sql.gz" -type f | sort -r | head -10)
    
    echo -e "${BLUE}ℹ${NC} Total recent backups: ${backup_count}"
}

# Function to verify backup
verify_backup() {
    local backup_path="${BACKUP_DIR}/${BACKUP_FILENAME}.gz"
    
    echo ""
    echo -e "${YELLOW}⏳${NC} Verifying backup integrity..."
    
    # Test if the file can be decompressed
    if gzip -t "$backup_path" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Backup file integrity verified"
        
        # Check if backup contains expected tables
        if zcat "$backup_path" | grep -q "CREATE TABLE.*Summary"; then
            echo -e "${GREEN}✓${NC} Backup contains Summary table"
        else
            echo -e "${YELLOW}⚠${NC} Warning: Summary table not found in backup"
        fi
        
        if zcat "$backup_path" | grep -q "CREATE TABLE.*User"; then
            echo -e "${GREEN}✓${NC} Backup contains User table"
        else
            echo -e "${YELLOW}⚠${NC} Warning: User table not found in backup"
        fi
        
        return 0
    else
        echo -e "${RED}✗${NC} Backup file is corrupted!"
        return 1
    fi
}

# Main execution
main() {
    # Perform backup
    if perform_backup; then
        # Verify the backup
        verify_backup
        
        # Clean up old backups
        cleanup_old_backups
        
        # List existing backups
        list_backups
        
        echo ""
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
        echo -e "${GREEN}   Backup completed successfully!${NC}"
        echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
        
        # Output backup path for automation
        echo ""
        echo "BACKUP_FILE=${BACKUP_DIR}/${BACKUP_FILENAME}.gz"
        
        exit 0
    else
        echo ""
        echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
        echo -e "${RED}   Backup failed!${NC}"
        echo -e "${RED}═══════════════════════════════════════════════════════${NC}"
        
        exit 1
    fi
}

# Run main function
main