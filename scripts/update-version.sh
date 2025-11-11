#!/bin/bash

################################################################################
# Update Version Numbers Script
# 
# This script updates version numbers and build numbers across the entire
# project for both iOS and Android platforms.
#
# USAGE:
#   ./scripts/update-version.sh [VERSION] [BUILD_NUMBER]
#
# EXAMPLES:
#   # Interactive mode (recommended for first-time use)
#   ./scripts/update-version.sh
#
#   # Auto-increment both version and build
#   ./scripts/update-version.sh
#   # Then select option 4 when prompted
#
#   # Update version only (build will be auto-incremented if you choose yes)
#   ./scripts/update-version.sh 2.35.0
#
#   # Update build only (version will be asked if you choose yes)
#   ./scripts/update-version.sh "" 684
#
#   # Update both version and build
#   ./scripts/update-version.sh 2.35.0 684
#
# WHAT IT UPDATES (only REQUIRED files for builds):
#   - android/app/build.gradle (versionName, versionCode) - REQUIRED for Android builds
#   - ios/Mattermost/Info.plist (CFBundleShortVersionString, CFBundleVersion) - REQUIRED for iOS builds
#
# NOTE: package.json is NOT updated (it's just metadata, doesn't affect builds)
# NOTE: package-lock.json is NOT updated (it's auto-generated and shouldn't be manually changed)
# NOTE: iOS project.pbxproj is NOT updated (Xcode syncs it automatically from Info.plist)
# NOTE: iOS extension Info.plist files are NOT updated (they inherit from main app)
#
# NOTES:
#   - Version format must be X.Y.Z (e.g., 2.35.0)
#   - Build number must be a positive integer
#   - Both Android and iOS will use the same version and build number
#   - Always verify changes before committing!
################################################################################

# Update version numbers for iOS and Android
# Usage: ./scripts/update-version.sh [VERSION] [BUILD_NUMBER]
# Example: ./scripts/update-version.sh 2.35.0 684

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +%Y-%m-%dT%H:%M:%S)]${NC} $@"
}

error() {
    echo -e "${RED}[ERROR]${NC} $@"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $@"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $@"
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Function to get current Android version
get_android_version() {
    if [ -f "android/app/build.gradle" ]; then
        grep -E "versionName" android/app/build.gradle | head -1 | sed -E 's/.*versionName[[:space:]]+"([^"]+)".*/\1/' || echo "unknown"
    else
        echo "unknown"
    fi
}

# Function to get current Android build number
get_android_build() {
    if [ -f "android/app/build.gradle" ]; then
        grep -E "versionCode" android/app/build.gradle | head -1 | sed -E 's/.*versionCode[[:space:]]+([0-9]+).*/\1/' || echo "unknown"
    else
        echo "unknown"
    fi
}

# Function to get current iOS version
get_ios_version() {
    if [ -f "ios/Mattermost/Info.plist" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            /usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" ios/Mattermost/Info.plist 2>/dev/null || \
            grep -A 1 "CFBundleShortVersionString" ios/Mattermost/Info.plist | grep -E "<string>" | sed -E 's/.*<string>([^<]+)<\/string>.*/\1/' | head -1 || echo "unknown"
        else
            grep -A 1 "CFBundleShortVersionString" ios/Mattermost/Info.plist | grep -E "<string>" | sed -E 's/.*<string>([^<]+)<\/string>.*/\1/' | head -1 || echo "unknown"
        fi
    else
        echo "unknown"
    fi
}

# Function to get current iOS build number
get_ios_build() {
    if [ -f "ios/Mattermost.xcodeproj/project.pbxproj" ]; then
        grep "CURRENT_PROJECT_VERSION" ios/Mattermost.xcodeproj/project.pbxproj | head -1 | sed -E 's/.*CURRENT_PROJECT_VERSION = ([0-9]+);.*/\1/' || echo "unknown"
    elif [ -f "ios/Mattermost/Info.plist" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            /usr/libexec/PlistBuddy -c "Print :CFBundleVersion" ios/Mattermost/Info.plist 2>/dev/null || \
            grep -A 1 "CFBundleVersion" ios/Mattermost/Info.plist | grep -E "<string>" | sed -E 's/.*<string>([^<]+)<\/string>.*/\1/' | head -1 || echo "unknown"
        else
            grep -A 1 "CFBundleVersion" ios/Mattermost/Info.plist | grep -E "<string>" | sed -E 's/.*<string>([^<]+)<\/string>.*/\1/' | head -1 || echo "unknown"
        fi
    else
        echo "unknown"
    fi
}

# Display current versions
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}          Current Version Numbers${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

ANDROID_VERSION=$(get_android_version)
ANDROID_BUILD=$(get_android_build)
IOS_VERSION=$(get_ios_version)
IOS_BUILD=$(get_ios_build)

echo -e "${BLUE}Android:${NC}"
echo -e "  Version: ${GREEN}$ANDROID_VERSION${NC}"
echo -e "  Build:   ${GREEN}$ANDROID_BUILD${NC}"
echo ""
echo -e "${BLUE}iOS:${NC}"
echo -e "  Version: ${GREEN}$IOS_VERSION${NC}"
echo -e "  Build:   ${GREEN}$IOS_BUILD${NC}"
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════${NC}"
echo ""

# Parse arguments
VERSION_NUMBER="${1:-}"
BUILD_NUMBER="${2:-}"

# Determine what to update
UPDATE_VERSION=false
UPDATE_BUILD=false

if [ -n "$VERSION_NUMBER" ]; then
    UPDATE_VERSION=true
    if ! [[ "$VERSION_NUMBER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        error "Version number must match format X.Y.Z (e.g., 2.35.0)"
    fi
fi

if [ -n "$BUILD_NUMBER" ]; then
    UPDATE_BUILD=true
    if ! [[ "$BUILD_NUMBER" =~ ^[0-9]+$ ]]; then
        error "Build number must be a positive integer"
    fi
fi

# Interactive mode if no arguments provided
if [ -z "$VERSION_NUMBER" ] && [ -z "$BUILD_NUMBER" ]; then
    info "No version or build number provided. Interactive mode..."
    echo ""
    echo -e "${YELLOW}What would you like to update?${NC}"
    echo "  1) Version number only (e.g., 2.35.0)"
    echo "  2) Build number only (auto-increment)"
    echo "  3) Both version and build number"
    echo "  4) Auto-increment both (recommended)"
    echo ""
    read -p "Enter choice (1-4) or press Enter for auto-increment [4]: " choice
    choice="${choice:-4}"
    
    case "$choice" in
        1)
            read -p "Enter new version number (e.g., 2.35.0): " VERSION_NUMBER
            if ! [[ "$VERSION_NUMBER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                error "Invalid version format. Must be X.Y.Z"
            fi
            UPDATE_VERSION=true
            ;;
        2)
            UPDATE_BUILD=true
            if [ "$ANDROID_BUILD" != "unknown" ] && [[ "$ANDROID_BUILD" =~ ^[0-9]+$ ]]; then
                BUILD_NUMBER=$((ANDROID_BUILD + 1))
            elif [ "$IOS_BUILD" != "unknown" ] && [[ "$IOS_BUILD" =~ ^[0-9]+$ ]]; then
                BUILD_NUMBER=$((IOS_BUILD + 1))
            else
                error "Could not determine current build number"
            fi
            log "Auto-incrementing build number to: $BUILD_NUMBER"
            ;;
        3)
            read -p "Enter new version number (e.g., 2.35.0): " VERSION_NUMBER
            if ! [[ "$VERSION_NUMBER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                error "Invalid version format. Must be X.Y.Z"
            fi
            UPDATE_VERSION=true
            
            read -p "Enter new build number or press Enter to auto-increment: " BUILD_NUMBER
            if [ -z "$BUILD_NUMBER" ]; then
                if [ "$ANDROID_BUILD" != "unknown" ] && [[ "$ANDROID_BUILD" =~ ^[0-9]+$ ]]; then
                    BUILD_NUMBER=$((ANDROID_BUILD + 1))
                elif [ "$IOS_BUILD" != "unknown" ] && [[ "$IOS_BUILD" =~ ^[0-9]+$ ]]; then
                    BUILD_NUMBER=$((IOS_BUILD + 1))
                else
                    error "Could not determine current build number"
                fi
                log "Auto-incrementing build number to: $BUILD_NUMBER"
            fi
            UPDATE_BUILD=true
            ;;
        4|*)
            # Auto-increment both
            if [ "$ANDROID_VERSION" != "unknown" ] && [[ "$ANDROID_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
                # Increment patch version
                IFS='.' read -ra ADDR <<< "$ANDROID_VERSION"
                MAJOR=${ADDR[0]}
                MINOR=${ADDR[1]}
                PATCH=${ADDR[2]}
                PATCH=$((PATCH + 1))
                VERSION_NUMBER="$MAJOR.$MINOR.$PATCH"
            else
                error "Could not determine current version number"
            fi
            
            if [ "$ANDROID_BUILD" != "unknown" ] && [[ "$ANDROID_BUILD" =~ ^[0-9]+$ ]]; then
                BUILD_NUMBER=$((ANDROID_BUILD + 1))
            elif [ "$IOS_BUILD" != "unknown" ] && [[ "$IOS_BUILD" =~ ^[0-9]+$ ]]; then
                BUILD_NUMBER=$((IOS_BUILD + 1))
            else
                error "Could not determine current build number"
            fi
            
            UPDATE_VERSION=true
            UPDATE_BUILD=true
            log "Auto-incrementing version to: $VERSION_NUMBER"
            log "Auto-incrementing build number to: $BUILD_NUMBER"
            ;;
    esac
fi

# If only version provided, ask about build
if [ "$UPDATE_VERSION" = true ] && [ "$UPDATE_BUILD" = false ]; then
    read -p "Also update build number? (y/n) [y]: " update_build
    update_build="${update_build:-y}"
    if [[ "$update_build" =~ ^[Yy]$ ]]; then
        UPDATE_BUILD=true
        if [ "$ANDROID_BUILD" != "unknown" ] && [[ "$ANDROID_BUILD" =~ ^[0-9]+$ ]]; then
            BUILD_NUMBER=$((ANDROID_BUILD + 1))
        elif [ "$IOS_BUILD" != "unknown" ] && [[ "$IOS_BUILD" =~ ^[0-9]+$ ]]; then
            BUILD_NUMBER=$((IOS_BUILD + 1))
        else
            error "Could not determine current build number"
        fi
        log "Auto-incrementing build number to: $BUILD_NUMBER"
    fi
fi

# If only build provided, ask about version
if [ "$UPDATE_VERSION" = false ] && [ "$UPDATE_BUILD" = true ]; then
    read -p "Also update version number? (y/n) [n]: " update_version
    update_version="${update_version:-n}"
    if [[ "$update_version" =~ ^[Yy]$ ]]; then
        UPDATE_VERSION=true
        read -p "Enter new version number (e.g., 2.35.0): " VERSION_NUMBER
        if ! [[ "$VERSION_NUMBER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            error "Invalid version format. Must be X.Y.Z"
        fi
    fi
fi

# Validate build number
if [ "$UPDATE_BUILD" = true ]; then
    if ! [[ "$BUILD_NUMBER" =~ ^[0-9]+$ ]]; then
        error "Build number must be a positive integer"
    fi
fi

echo ""
log "Updating to:"
if [ "$UPDATE_VERSION" = true ]; then
    log "  Version: $VERSION_NUMBER (same for Android and iOS)"
fi
if [ "$UPDATE_BUILD" = true ]; then
    log "  Build: $BUILD_NUMBER (same for Android and iOS)"
fi
echo ""

# 1. Update Android build.gradle (REQUIRED for Android builds)
log "Updating Android build.gradle..."
if [ -f "android/app/build.gradle" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if [ "$UPDATE_VERSION" = true ]; then
            sed -i '' "s/versionName \".*\"/versionName \"$VERSION_NUMBER\"/" android/app/build.gradle
        fi
        if [ "$UPDATE_BUILD" = true ]; then
            sed -i '' "s/versionCode [0-9]*/versionCode $BUILD_NUMBER/" android/app/build.gradle
        fi
    else
        if [ "$UPDATE_VERSION" = true ]; then
            sed -i "s/versionName \".*\"/versionName \"$VERSION_NUMBER\"/" android/app/build.gradle
        fi
        if [ "$UPDATE_BUILD" = true ]; then
            sed -i "s/versionCode [0-9]*/versionCode $BUILD_NUMBER/" android/app/build.gradle
        fi
    fi
    log "✓ Updated android/app/build.gradle"
else
    warn "android/app/build.gradle not found"
fi

# 2. Update iOS Info.plist (REQUIRED for iOS builds)
if [ "$UPDATE_VERSION" = true ] || [ "$UPDATE_BUILD" = true ]; then
    log "Updating iOS Info.plist files..."
    
    IOS_INFO_PLIST_FILES=(
        "ios/Mattermost/Info.plist"
    )
    
    for plist in "${IOS_INFO_PLIST_FILES[@]}"; do
        if [ -f "$plist" ]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                if [ "$UPDATE_VERSION" = true ]; then
                    /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION_NUMBER" "$plist" 2>/dev/null || true
                fi
                if [ "$UPDATE_BUILD" = true ]; then
                    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" "$plist" 2>/dev/null || true
                fi
                
                # Fallback to awk if PlistBuddy fails
                if [ "$UPDATE_VERSION" = true ]; then
                    if ! /usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$plist" 2>/dev/null | grep -q "$VERSION_NUMBER"; then
                        awk -v version="$VERSION_NUMBER" '
                            /CFBundleShortVersionString/ {
                                getline
                                sub(/<string>.*<\/string>/, "<string>" version "</string>")
                            }
                            {print}
                        ' "$plist" > "$plist.tmp" && mv "$plist.tmp" "$plist"
                    fi
                fi
                
                if [ "$UPDATE_BUILD" = true ]; then
                    if ! /usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$plist" 2>/dev/null | grep -q "$BUILD_NUMBER"; then
                        awk -v build="$BUILD_NUMBER" '
                            /CFBundleVersion/ {
                                getline
                                sub(/<string>.*<\/string>/, "<string>" build "</string>")
                            }
                            {print}
                        ' "$plist" > "$plist.tmp" && mv "$plist.tmp" "$plist"
                    fi
                fi
            else
                # Linux fallback (sed-based)
                if [ "$UPDATE_VERSION" = true ]; then
                    sed -i "/CFBundleShortVersionString/,+1s/<string>.*<\/string>/<string>$VERSION_NUMBER<\/string>/" "$plist"
                fi
                if [ "$UPDATE_BUILD" = true ]; then
                    sed -i "/CFBundleVersion/,+1s/<string>.*<\/string>/<string>$BUILD_NUMBER<\/string>/" "$plist"
                fi
            fi
            log "✓ Updated $(basename $plist)"
        else
            warn "$plist not found"
        fi
    done
fi

# NOTE: iOS project.pbxproj is NOT updated - Xcode syncs MARKETING_VERSION and CURRENT_PROJECT_VERSION
# automatically from Info.plist when you build the project

echo ""
log "✓ All version numbers updated successfully!"
echo ""
log "Summary:"
if [ "$UPDATE_VERSION" = true ]; then
    log "  Version: $VERSION_NUMBER (same for Android and iOS)"
fi
if [ "$UPDATE_BUILD" = true ]; then
    log "  Build: $BUILD_NUMBER (same for Android and iOS)"
fi
echo ""
log "Files updated:"
if [ "$UPDATE_VERSION" = true ]; then
    log "  ✓ android/app/build.gradle (versionName)"
    log "  ✓ ios/Mattermost/Info.plist (CFBundleShortVersionString)"
fi
if [ "$UPDATE_BUILD" = true ]; then
    log "  ✓ android/app/build.gradle (versionCode)"
    log "  ✓ ios/Mattermost/Info.plist (CFBundleVersion)"
fi
echo ""
log "Please verify the changes before committing!"

