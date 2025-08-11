#!/bin/bash

# Sightline.ai Development Diagnostics Script
# One-shot triage script for development environment setup and monitoring
# Usage: ./scripts/dev-diagnose.sh

set -euo pipefail

# Configuration
LOG_FILE="/tmp/sightline-dev.log"
PID_FILE="/tmp/sightline-dev.pids"
FILTER_PATTERN="opentelemetry|otel|trpc|fastapi|error|exception"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# macOS-compatible timeout function
run_with_timeout() {
    local timeout_duration=$1
    shift
    local cmd=("$@")
    
    # Run command in background
    "${cmd[@]}" &
    local cmd_pid=$!
    
    # Wait for timeout or completion
    local count=0
    while [ $count -lt $timeout_duration ]; do
        if ! ps -p $cmd_pid > /dev/null 2>&1; then
            wait $cmd_pid
            return $?
        fi
        sleep 1
        count=$((count + 1))
    done
    
    # Timeout reached, kill process
    kill $cmd_pid 2>/dev/null || true
    wait $cmd_pid 2>/dev/null || true
    return 124  # Standard timeout exit code
}

# Function to kill processes on ports
kill_ports() {
    log_info "Killing processes on ports 3000 and 8000..."
    
    # Kill processes on port 3000 (Next.js)
    if lsof -ti:3000 >/dev/null 2>&1; then
        lsof -ti:3000 | xargs kill -9 2>/dev/null || true
        log_success "Killed processes on port 3000"
    else
        log_info "No processes running on port 3000"
    fi
    
    # Kill processes on port 8000 (FastAPI)
    if lsof -ti:8000 >/dev/null 2>&1; then
        lsof -ti:8000 | xargs kill -9 2>/dev/null || true
        log_success "Killed processes on port 8000"
    else
        log_info "No processes running on port 8000"
    fi
    
    # Kill any existing pnpm/uvicorn processes
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "uvicorn" 2>/dev/null || true
    pkill -f "pnpm.*dev" 2>/dev/null || true
    
    sleep 2
}

# Function to run quality checks
run_quality_checks() {
    log_info "Running quality checks..."
    
    # TypeScript type checking (non-blocking)
    log_info "Running TypeScript type checking..."
    if run_with_timeout 30 bash -c "pnpm typecheck 2>&1 | tee -a '$LOG_FILE'"; then
        log_success "TypeScript check passed"
    else
        log_warning "TypeScript check failed or timed out (continuing...)"
    fi
    
    # ESLint (non-blocking)
    log_info "Running ESLint..."
    if run_with_timeout 30 bash -c "pnpm lint 2>&1 | tee -a '$LOG_FILE'"; then
        log_success "Lint check passed"
    else
        log_warning "Lint check failed or timed out (continuing...)"
    fi
    
    # Build check (non-blocking)
    log_info "Running build check..."
    if run_with_timeout 60 bash -c "pnpm build 2>&1 | tee -a '$LOG_FILE'"; then
        log_success "Build check passed"
    else
        log_warning "Build check failed or timed out (continuing...)"
    fi
}

# Function to start FastAPI
start_fastapi() {
    log_info "Starting FastAPI server on port 8000..."
    
    # Check if Python venv exists
    if [[ ! -d "venv" ]]; then
        log_error "Python virtual environment not found. Run: python3 -m venv venv"
        exit 1
    fi
    
    # Start FastAPI in background
    (
        source venv/bin/activate
        cd api
        uvicorn index:app --host 0.0.0.0 --port 8000 --reload --log-level info
    ) 2>&1 | while IFS= read -r line; do
        echo "[FASTAPI] $line" | tee -a "$LOG_FILE"
        # Check for fatal errors
        if echo "$line" | grep -iE "(fatal|critical|cannot start|address already in use)" >/dev/null; then
            log_error "Fatal FastAPI error detected: $line"
            kill_all_processes
            exit 1
        fi
    done &
    
    FASTAPI_PID=$!
    echo "$FASTAPI_PID" >> "$PID_FILE"
    log_success "FastAPI started with PID $FASTAPI_PID"
}

# Function to start Next.js
start_nextjs() {
    log_info "Starting Next.js development server on port 3000..."
    
    # Start Next.js in background
    pnpm dev 2>&1 | while IFS= read -r line; do
        echo "[NEXTJS] $line" | tee -a "$LOG_FILE"
        # Check for fatal errors
        if echo "$line" | grep -iE "(fatal|critical|cannot start|address already in use|failed to compile)" >/dev/null; then
            log_error "Fatal Next.js error detected: $line"
            kill_all_processes
            exit 1
        fi
    done &
    
    NEXTJS_PID=$!
    echo "$NEXTJS_PID" >> "$PID_FILE"
    log_success "Next.js started with PID $NEXTJS_PID"
}

# Function to monitor logs with filtering
monitor_logs() {
    log_info "Monitoring logs for patterns: $FILTER_PATTERN"
    log_info "Full logs available at: $LOG_FILE"
    log_info "Press Ctrl+C to stop monitoring"
    
    # Monitor the log file for specific patterns
    tail -f "$LOG_FILE" 2>/dev/null | grep --line-buffered -iE "$FILTER_PATTERN" --color=always || true
}

# Function to kill all processes
kill_all_processes() {
    if [[ -f "$PID_FILE" ]]; then
        log_info "Cleaning up processes..."
        while read -r pid; do
            if ps -p "$pid" > /dev/null 2>&1; then
                kill "$pid" 2>/dev/null || true
            fi
        done < "$PID_FILE"
        rm -f "$PID_FILE"
    fi
    kill_ports
}

# Function to wait for services to be ready
wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for FastAPI
    local fastapi_ready=false
    for i in {1..30}; do
        if curl -s http://localhost:8000/docs >/dev/null 2>&1; then
            fastapi_ready=true
            log_success "FastAPI is ready at http://localhost:8000"
            break
        fi
        sleep 1
    done
    
    if [[ "$fastapi_ready" != "true" ]]; then
        log_warning "FastAPI not ready after 30 seconds"
    fi
    
    # Wait for Next.js
    local nextjs_ready=false
    for i in {1..30}; do
        if curl -s http://localhost:3000 >/dev/null 2>&1; then
            nextjs_ready=true
            log_success "Next.js is ready at http://localhost:3000"
            break
        fi
        sleep 1
    done
    
    if [[ "$nextjs_ready" != "true" ]]; then
        log_warning "Next.js not ready after 30 seconds"
    fi
}

# Cleanup function
cleanup() {
    log_info "Received interrupt signal, cleaning up..."
    kill_all_processes
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main execution
main() {
    log_info "Starting Sightline.ai development diagnostics..."
    
    # Initialize log file
    echo "=== Sightline.ai Development Diagnostics - $(date) ===" > "$LOG_FILE"
    rm -f "$PID_FILE"
    
    # Step 1: Kill existing processes
    kill_ports
    
    # Step 2: Run quality checks
    run_quality_checks
    
    # Step 3: Start services
    start_fastapi
    sleep 3
    start_nextjs
    
    # Step 4: Wait for services to be ready
    wait_for_services
    
    # Step 5: Display service status
    echo
    log_success "=== Services Started ==="
    log_info "FastAPI: http://localhost:8000 (docs: http://localhost:8000/docs)"
    log_info "Next.js: http://localhost:3000"
    log_info "Log file: $LOG_FILE"
    echo
    
    # Step 6: Monitor logs
    monitor_logs
}

# Check if running from correct directory
if [[ ! -f "package.json" ]] || [[ ! -d "api" ]]; then
    log_error "Please run this script from the Sightline project root directory"
    exit 1
fi

# Run main function
main "$@"