#!/usr/bin/env bash

# Intune protection: prevent committing Podfile.lock with Intune dependencies
if git diff --cached --name-only | grep -q "^ios/Podfile.lock$"; then
    if grep -q "mattermost-intune\|IntuneMAMSwift" ios/Podfile.lock; then
        echo ""
        echo "❌ COMMIT BLOCKED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Your Podfile.lock contains Intune dependencies."
        echo "Only the OSS version should be committed."
        echo ""
        echo "To fix this:"
        echo "  1. Restore OSS lockfile:"
        echo "     git checkout -- ios/Podfile.lock"
        echo ""
        echo "  2. OR disable Intune completely:"
        echo "     npm run intune:disable"
        echo ""
        echo "  3. Then retry your commit"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        exit 1
    fi
fi

# Intune protection: prevent committing submodule content
if git diff --cached --name-only | grep -q "^libraries/@mattermost/intune/"; then
    # Exclude .gitkeep which is allowed
    if git diff --cached --name-only | grep "^libraries/@mattermost/intune/" | grep -v ".gitkeep$" | grep -q .; then
        echo ""
        echo "❌ COMMIT BLOCKED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "You are attempting to commit files from the Intune submodule."
        echo "The Intune library should only be modified in its own repository:"
        echo "  github.com/mattermost/mattermost-mobile-intune"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        exit 1
    fi
fi

# Intune protection: prevent committing Info.plist with Intune configuration
if git diff --cached --name-only | grep -q "^ios/Mattermost/Info.plist$"; then
    if grep -q "IntuneMAMSettings\|msauth\.com\.microsoft\.intunemam\|mattermost-intunemam\|mmauthbeta-intunemam\|intunemam-mtd\|msauthv2\|msauthv3" ios/Mattermost/Info.plist; then
        echo ""
        echo "❌ COMMIT BLOCKED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Your Info.plist contains Intune-specific configuration."
        echo "Intune settings are applied by Fastlane during internal builds only."
        echo ""
        echo "To fix this:"
        echo "  1. Restore OSS Info.plist:"
        echo "     git checkout -- ios/Mattermost/Info.plist"
        echo ""
        echo "  2. OR disable Intune completely:"
        echo "     npm run intune:disable"
        echo ""
        echo "  3. Then retry your commit"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        exit 1
    fi
fi

# Intune protection: prevent committing entitlements with Intune keychain groups
if git diff --cached --name-only | grep -q "^ios/Mattermost/Mattermost.entitlements$"; then
    if grep -q "com\.microsoft\.adalcache\|com\.microsoft\.intune\.mam\|\.intunemam" ios/Mattermost/Mattermost.entitlements; then
        echo ""
        echo "❌ COMMIT BLOCKED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Your Mattermost.entitlements contains Intune keychain groups."
        echo "Intune keychain groups are added by Fastlane during internal builds only."
        echo ""
        echo "To fix this:"
        echo "  1. Restore OSS entitlements:"
        echo "     git checkout -- ios/Mattermost/Mattermost.entitlements"
        echo ""
        echo "  2. OR disable Intune completely:"
        echo "     npm run intune:disable"
        echo ""
        echo "  3. Then retry your commit"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        exit 1
    fi
fi

# Intune protection: prevent committing project.pbxproj with Intune frameworks
if git diff --cached --name-only | grep -q "^ios/Mattermost.xcodeproj/project.pbxproj$"; then
    if grep -q "MSAL\|IntuneMAM\|IntuneMAMSwift" ios/Mattermost.xcodeproj/project.pbxproj; then
        echo ""
        echo "❌ COMMIT BLOCKED"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "Your project.pbxproj contains Intune framework references."
        echo "Intune frameworks are added by Fastlane during internal builds only."
        echo ""
        echo "To fix this:"
        echo "  1. Restore OSS project.pbxproj:"
        echo "     git checkout -- ios/Mattermost.xcodeproj/project.pbxproj"
        echo ""
        echo "  2. OR disable Intune completely:"
        echo "     npm run intune:disable"
        echo ""
        echo "  3. Then retry your commit"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        exit 1
    fi
fi

jsfiles=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.js$|\.ts$|\.tsx$')
exit_code=0

if [ -z "$jsfiles" ]; then
    exit 0
fi

if [ -n "$jsfiles" ]; then
    echo "Checking lint for:"
    for js in $jsfiles; do
        echo "$js"
        e=$(node_modules/.bin/eslint --quiet --fix $js)
        if [ -n "$e" ]; then
            echo "ERROR: Check eslint hints."
            echo "$e"
            exit_code=1
        fi
    done

    echo "Checking for TSC (fast incremental check)"
    # Use incremental TypeScript checking - much faster on subsequent runs
    tsc=$(node_modules/.bin/tsc --noEmit --incremental --tsBuildInfoFile .tsbuildinfo.precommit 2>&1)
    if [ $? -ne 0 ]; then
        echo "ERROR: TypeScript issues found."
        echo "$tsc"
        exit_code=1
    fi
fi

# scripts/precommit/i18n.sh

exit $exit_code
