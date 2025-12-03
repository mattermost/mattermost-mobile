#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

set -e

echo "🔐 Initializing Intune development environment..."
echo ""

# Check if submodule is initialized
if [ ! -e "libraries/@mattermost/intune/.git" ]; then
    echo "📥 Initializing Intune submodule..."
    git submodule update --init --recursive libraries/@mattermost/intune
else
    echo "✅ Intune submodule already initialized"
fi

# Update submodule to latest
echo "🔄 Updating Intune submodule..."
git submodule update --remote libraries/@mattermost/intune

# Display submodule info
cd libraries/@mattermost/intune
BRANCH=$(git rev-parse --abbrev-ref HEAD)
COMMIT=$(git rev-parse --short HEAD)
echo "📦 Intune submodule:"
echo "   Branch: $BRANCH"
echo "   Commit: $COMMIT"
cd ../..

# Create symlink in node_modules
echo "🔗 Linking Intune module..."
npm run intune:link

# Install pods with Intune
echo "📦 Installing iOS dependencies with Intune..."
if [[ $(uname -p) == 'arm' ]]; then
    INTUNE_ENABLED=1 npm run pod-install-m1
else
    INTUNE_ENABLED=1 npm run pod-install
fi

echo ""
echo "✅ Intune development environment ready!"
echo ""
echo "⚠️  IMPORTANT: Your local Podfile.lock now includes Intune pods."
echo "   Do NOT commit these changes. The pre-commit hook will block them."
echo ""
echo "To disable Intune: npm run intune:disable"
echo "To check status: npm run intune:status"
echo ""
