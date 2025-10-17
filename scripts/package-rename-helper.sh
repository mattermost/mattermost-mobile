#!/bin/bash

# Package Rename Helper Script
# This script helps you find and verify all package name references
# DO NOT run this automatically - use it to find locations that need manual changes

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Daakia Package Rename Helper${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to count matches
count_matches() {
    local pattern=$1
    local path=$2
    local count=$(grep -r "$pattern" "$path" 2>/dev/null | wc -l | xargs)
    echo $count
}

echo -e "${YELLOW}Scanning for Mattermost package references...${NC}"
echo ""

# 1. Android Package Names
echo -e "${BLUE}1. Android Package Names:${NC}"
echo -e "   Searching for 'com.mattermost' in Android files..."
ANDROID_COUNT=$(count_matches "com\.mattermost" "android/")
echo -e "   Found: ${RED}${ANDROID_COUNT}${NC} references in android/"
echo ""

# 2. Java/Kotlin Package Declarations
echo -e "${BLUE}2. Java/Kotlin Package Declarations:${NC}"
echo -e "   Searching for 'package com.mattermost'..."
PACKAGE_COUNT=$(count_matches "package com\.mattermost" "android/")
echo -e "   Found: ${RED}${PACKAGE_COUNT}${NC} package declarations"
echo ""

# 3. Native Libraries
echo -e "${BLUE}3. Native Libraries:${NC}"
echo -e "   Searching in libraries/@mattermost/..."
LIB_COUNT=$(count_matches "com\.mattermost" "libraries/@mattermost/")
echo -e "   Found: ${RED}${LIB_COUNT}${NC} references in libraries"
echo ""

# 4. iOS Bundle Identifiers
echo -e "${BLUE}4. iOS Bundle Identifiers:${NC}"
echo -e "   Searching for 'com.mattermost.rnbeta' in iOS files..."
IOS_COUNT=$(count_matches "com\.mattermost\.rnbeta" "ios/")
echo -e "   Found: ${RED}${IOS_COUNT}${NC} references in ios/"
echo ""

# 5. App Groups
echo -e "${BLUE}5. App Group Identifiers:${NC}"
echo -e "   Searching for 'group.com.mattermost'..."
GROUP_COUNT=$(count_matches "group\.com\.mattermost" "ios/")
echo -e "   Found: ${RED}${GROUP_COUNT}${NC} app group references"
echo ""

# 6. Import Statements
echo -e "${BLUE}6. Java/Kotlin Import Statements:${NC}"
echo -e "   Searching for 'import com.mattermost'..."
IMPORT_COUNT=$(count_matches "import com\.mattermost" "android/")
echo -e "   Found: ${RED}${IMPORT_COUNT}${NC} import statements"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Detailed File Lists${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Detailed Android Files
echo -e "${YELLOW}Android files with 'com.mattermost':${NC}"
grep -r -l "com\.mattermost" android/ 2>/dev/null | grep -v build | head -20
echo ""

# Detailed Library Files
echo -e "${YELLOW}Library files with 'package com.mattermost':${NC}"
grep -r -l "package com\.mattermost" libraries/@mattermost/ 2>/dev/null | head -20
echo ""

# Detailed iOS Files
echo -e "${YELLOW}iOS files with 'com.mattermost.rnbeta':${NC}"
grep -r -l "com\.mattermost\.rnbeta" ios/ 2>/dev/null | grep -v Pods | grep -v build | head -20
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Recommendations${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo -e "1. Review PACKAGE_IDENTIFIERS_REBRANDING.md for detailed instructions"
echo -e "2. Create a backup branch: ${YELLOW}git checkout -b backup/pre-package-rename${NC}"
echo -e "3. Create working branch: ${YELLOW}git checkout -b refactor/package-rename${NC}"
echo -e "4. Start with Phase 1: Android Package Rename"
echo -e "5. Test thoroughly after each phase"
echo ""
echo -e "${RED}WARNING:${NC} Changing package names creates a NEW app!"
echo -e "Users will need to reinstall and will lose local data."
echo ""

