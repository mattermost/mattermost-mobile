#!/bin/bash

# Generate Merge Description Script
# Usage: ./scripts/generate-merge-description.sh <source-branch> <target-branch>
# Example: ./scripts/generate-merge-description.sh feat/chat dev

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if branches are provided
if [ -z "$1" ] || [ -z "$2" ]; then
    echo -e "${YELLOW}Usage: $0 <source-branch> <target-branch>${NC}"
    echo -e "${YELLOW}Example: $0 feat/chat dev${NC}"
    exit 1
fi

SOURCE_BRANCH=$1
TARGET_BRANCH=$2
OUTPUT_FILE="MERGE_DESCRIPTION_$(date +%Y%m%d_%H%M%S).md"

echo -e "${BLUE}Generating merge description for ${SOURCE_BRANCH} -> ${TARGET_BRANCH}${NC}"

# Start generating the description
cat > "$OUTPUT_FILE" << EOF
# Feature: [TODO: Add Feature Name]

## Summary
[TODO: Add 1-2 sentence overview]

---

## Commit History

EOF

# Add commit list
echo "### Commits in this branch:" >> "$OUTPUT_FILE"
git log $TARGET_BRANCH..$SOURCE_BRANCH --oneline >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << EOF

---

## Files Changed

EOF

# Add file statistics
git diff --stat $TARGET_BRANCH...$SOURCE_BRANCH >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << EOF

---

## Key Changes

### 🎨 Architecture & Structure
- [TODO: Describe architectural changes]

### 📱 New Components/Features
- [TODO: List new components or features]

### 🔧 Technical Improvements
- [TODO: List technical improvements]

### 🌐 Localization
- [TODO: List localization changes]

---

## Files Modified by Category

EOF

# Categorize changed files
echo "### Components:" >> "$OUTPUT_FILE"
git diff --name-only $TARGET_BRANCH...$SOURCE_BRANCH | grep "components/" | sed 's/^/- /' >> "$OUTPUT_FILE" || echo "- None" >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "### Screens:" >> "$OUTPUT_FILE"
git diff --name-only $TARGET_BRANCH...$SOURCE_BRANCH | grep "screens/" | sed 's/^/- /' >> "$OUTPUT_FILE" || echo "- None" >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "### i18n/Localization:" >> "$OUTPUT_FILE"
git diff --name-only $TARGET_BRANCH...$SOURCE_BRANCH | grep "i18n\|\.json$" | sed 's/^/- /' >> "$OUTPUT_FILE" || echo "- None" >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "### Assets:" >> "$OUTPUT_FILE"
git diff --name-only $TARGET_BRANCH...$SOURCE_BRANCH | grep "assets/\|\.png$\|\.jpg$\|\.svg$" | sed 's/^/- /' >> "$OUTPUT_FILE" || echo "- None" >> "$OUTPUT_FILE"

echo "" >> "$OUTPUT_FILE"
echo "### Configuration:" >> "$OUTPUT_FILE"
git diff --name-only $TARGET_BRANCH...$SOURCE_BRANCH | grep -E "\.(sh|json|config|gradle|xml)$|tsconfig" | sed 's/^/- /' >> "$OUTPUT_FILE" || echo "- None" >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << EOF

---

## Impact
[TODO: Describe the overall impact]

---

## Testing Checklist
- [ ] Unit tests added/updated
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Manual testing completed

---

## Related Issues
- Closes #[issue-number]
- Related to #[issue-number]

---

## Additional Notes
[TODO: Add any additional notes]

EOF

echo -e "${GREEN}✓ Merge description generated: ${OUTPUT_FILE}${NC}"
echo -e "${YELLOW}Please review and fill in the [TODO] sections${NC}"

