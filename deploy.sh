#!/bin/bash

# Complete deployment script with process cleanup and profile lock management
# Usage: ./deploy.sh [--rebuild] [--no-cleanup]

set -e  # Exit on error

echo "=========================================="
echo "🚀 Complete Deployment Script"
echo "=========================================="
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Working directory: $SCRIPT_DIR"
cd "$SCRIPT_DIR"

# Check if Docker and docker-compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Error: docker-compose is not installed or not in PATH"
    exit 1
fi

# Parse arguments
REBUILD=false
SKIP_CLEANUP=false
for arg in "$@"; do
    case $arg in
        --rebuild)
            REBUILD=true
            ;;
        --no-cleanup)
            SKIP_CLEANUP=true
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "OPTIONS:"
            echo "  --rebuild      Rebuild Docker image from scratch"
            echo "  --no-cleanup   Skip Chrome process and lock file cleanup"
            echo "  --help         Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo "⚠️  Unknown option: $arg (use --help for usage)"
            ;;
    esac
done

# ============================================
# STEP 1: KILL ALL CHROME/CHROMIUM PROCESSES
# ============================================
if [ "$SKIP_CLEANUP" = false ]; then
    echo ""
    echo "=========================================="
    echo "Step 1: Killing Chrome/Chromium processes"
    echo "=========================================="
    
    # Function to kill Chrome/Chromium processes
    kill_chrome_processes() {
        echo "Searching for Chrome/Chromium processes..."
        
        # Try multiple methods to kill Chrome processes
        local attempt=1
        local max_attempts=3
        
        while [ $attempt -le $max_attempts ]; do
            echo "  Attempt $attempt/$max_attempts..."
            
            # Method 1: pkill
            pkill -9 -f chrome 2>/dev/null || true
            pkill -9 -f chromium 2>/dev/null || true
            
            # Method 2: killall
            killall -9 chrome 2>/dev/null || true
            killall -9 chromium 2>/dev/null || true
            
            sleep 2
            
            # Check if any processes remain
            REMAINING=$(pgrep -f "chrome|chromium" 2>/dev/null | wc -l)
            
            if [ "$REMAINING" -eq 0 ]; then
                echo "  ✅ All Chrome/Chromium processes terminated"
                return 0
            else
                echo "  ⚠️  $REMAINING process(es) still running..."
                
                if [ $attempt -lt $max_attempts ]; then
                    # Try to force kill by PID
                    pgrep -f "chrome|chromium" 2>/dev/null | xargs -r kill -9 2>/dev/null || true
                    sleep 2
                fi
            fi
            
            attempt=$((attempt + 1))
        done
        
        # Final check
        REMAINING=$(pgrep -f "chrome|chromium" 2>/dev/null | wc -l)
        if [ "$REMAINING" -gt 0 ]; then
            echo "  ⚠️  Warning: $REMAINING Chrome/Chromium process(es) could not be killed"
            echo "  You may need to manually kill them or reboot the system"
        fi
    }
    
    kill_chrome_processes
    echo ""
fi

# ============================================
# STEP 2: STOP DOCKER CONTAINERS
# ============================================
echo "=========================================="
echo "Step 2: Stopping Docker containers"
echo "=========================================="

if docker-compose ps -q 2>/dev/null | grep -q .; then
    echo "Stopping running containers..."
    docker-compose down
    echo "✅ Containers stopped"
else
    echo "ℹ️  No containers running"
fi
echo ""

# ============================================
# STEP 3: CLEAN UP PROFILE LOCK FILES
# ============================================
if [ "$SKIP_CLEANUP" = false ]; then
    echo "=========================================="
    echo "Step 3: Cleaning profile lock files"
    echo "=========================================="
    
    # Function to thoroughly clean a profile directory
    clean_profile() {
        local profile_dir=$1
        
        if [ -d "$profile_dir" ]; then
            echo "  🧹 Cleaning $profile_dir..."
            
            local locks_removed=0
            
            # Remove lock files in root directory
            for lock_file in SingletonLock SingletonSocket SingletonCookie; do
                if [ -f "$profile_dir/$lock_file" ]; then
                    rm -f "$profile_dir/$lock_file" 2>/dev/null && locks_removed=$((locks_removed + 1))
                fi
            done
            
            # Remove lock files in Default subdirectory
            if [ -d "$profile_dir/Default" ]; then
                for lock_file in SingletonLock SingletonSocket SingletonCookie; do
                    if [ -f "$profile_dir/Default/$lock_file" ]; then
                        rm -f "$profile_dir/Default/$lock_file" 2>/dev/null && locks_removed=$((locks_removed + 1))
                    fi
                done
            fi
            
            # Find and remove any orphaned lock files in subdirectories
            local orphaned=$(find "$profile_dir" -type f \( -name "SingletonLock" -o -name "SingletonSocket" -o -name "SingletonCookie" \) 2>/dev/null | wc -l)
            
            if [ "$orphaned" -gt 0 ]; then
                find "$profile_dir" -type f -name "SingletonLock" -delete 2>/dev/null || true
                find "$profile_dir" -type f -name "SingletonSocket" -delete 2>/dev/null || true
                find "$profile_dir" -type f -name "SingletonCookie" -delete 2>/dev/null || true
                locks_removed=$((locks_removed + orphaned))
            fi
            
            # Verify cleanup
            local remaining=$(find "$profile_dir" -type f \( -name "SingletonLock" -o -name "SingletonSocket" -o -name "SingletonCookie" \) 2>/dev/null | wc -l)
            
            if [ "$remaining" -eq 0 ]; then
                echo "    ✅ Cleaned ($locks_removed lock file(s) removed)"
            else
                echo "    ⚠️  Warning: $remaining lock file(s) could not be removed"
            fi
        else
            echo "    ℹ️  $profile_dir not found, skipping"
        fi
    }
    
    # Clean all profile directories
    echo "Cleaning browser profile directories..."
    clean_profile "twitter_profile"
    clean_profile "linkedin_profile"
    clean_profile "tiktok_profile"
    clean_profile "reddit_profile"
    clean_profile "youtube_profile"
    
    echo ""
    echo "✅ Profile cleanup completed"
    echo ""
else
    echo "=========================================="
    echo "Step 3: Skipping cleanup (--no-cleanup flag)"
    echo "=========================================="
    echo ""
fi

# ============================================
# STEP 4: DOCKER IMAGE BUILD
# ============================================
echo "=========================================="
echo "Step 4: Docker image management"
echo "=========================================="

if [ "$REBUILD" = true ]; then
    echo "Rebuilding Docker image from scratch..."
    echo "⚠️  This may take several minutes..."
    docker-compose build --no-cache
    echo "✅ Image rebuilt successfully"
else
    echo "ℹ️  Skipping rebuild (use --rebuild to rebuild image)"
    
    # Check if image exists
    if docker-compose images -q 2>/dev/null | grep -q .; then
        echo "✅ Docker image exists"
    else
        echo "⚠️  Docker image not found, building..."
        docker-compose build
        echo "✅ Image built"
    fi
fi
echo ""

# ============================================
# STEP 5: START DOCKER CONTAINERS
# ============================================
echo "=========================================="
echo "Step 5: Starting Docker containers"
echo "=========================================="

echo "Starting containers in detached mode..."
docker-compose up -d

# Wait for containers to be healthy
echo "Waiting for containers to start..."
sleep 5

# Check container status
if docker-compose ps | grep -q "Up"; then
    echo "✅ Containers started successfully"
else
    echo "⚠️  Warning: Containers may not have started properly"
    echo "Check logs with: docker-compose logs -f"
fi
echo ""

# ============================================
# STEP 6: SHOW STATUS AND INFO
# ============================================
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""

echo "📊 Container Status:"
docker-compose ps
echo ""

echo "📝 Useful Commands:"
echo "  View logs:        docker-compose logs -f"
echo "  View logs (app):  docker-compose logs -f leadgen-bot"
echo "  Stop containers:  docker-compose down"
echo "  Restart:          docker-compose restart"
echo "  Shell access:     docker-compose exec leadgen-bot bash"
echo ""

echo "🌐 Access Points:"
echo "  Main API:  http://localhost:3000"
echo "  VNC View:  http://localhost:6080/vnc.html"
echo "  Health:    http://localhost:3000/health"
echo ""

echo "🔧 Troubleshooting:"
echo "  If you encounter profile lock errors:"
echo "    1. Run: ./deploy.sh --rebuild"
echo "    2. Or manually clean: rm -rf */profile/Singleton*"
echo "    3. Check logs: docker-compose logs -f"
echo ""

echo "=========================================="
echo "🎉 Ready to use!"
echo "=========================================="

