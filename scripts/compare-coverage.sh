#!/bin/bash

CURRENT_COVERAGE_FILE="$1/coverage-summary.json"
RECENT_COVERAGE_FILE="$2/coverage-summary.json"
PR_NUMBER="$3"
GITHUB_TOKEN="$4"

if [ ! -f "$CURRENT_COVERAGE_FILE" ] || [ ! -f "$RECENT_COVERAGE_FILE" ]; then
    echo "One or both coverage files not found"
    exit 0
fi

# Function to print a horizontal line
print_line() {
    printf "+-----------------+------------+------------+-----------+\n"
}

# Function to print table row
print_row() {
    printf "| %-15s | %10.2f%% | %10.2f%% | %9.2f%% |\n" "$1" "$2" "$3" "$4"
}

# Capture the output in a variable using a heredoc
COMMENT_BODY=$(cat << 'EOF'
### Coverage Comparison Report
\`\`\`
EOF
)

# Add the table header
COMMENT_BODY+=$(print_line)
COMMENT_BODY+=$(printf "| %-15s | %-10s | %-10s | %-9s |\n" "Metric" "Current" "Previous" "Diff")
COMMENT_BODY+=$(print_line)

# Track if any metric has decreased
HAS_DECREASE=0

# Compare each metric
for metric in lines statements branches functions; do
    current=$(jq ".total.${metric}.pct" "$CURRENT_COVERAGE_FILE")
    recent=$(jq ".total.${metric}.pct" "$RECENT_COVERAGE_FILE")
    diff=$(echo "$current - $recent" | bc)
    
    COMMENT_BODY+=$(print_row "${metric^}" "$current" "$recent" "$diff")
    
    # Check if coverage decreased by more than 1%
    if (( $(echo "$diff < -1" | bc -l) )); then
        echo "::error::${metric^} coverage has decreased by more than 1% ($diff%)"
        HAS_DECREASE=1
    fi
done

COMMENT_BODY+=$(print_line)
COMMENT_BODY+="\n\`\`\`"

# Add warning message if coverage decreased
if [ "$HAS_DECREASE" -eq 1 ]; then
    COMMENT_BODY+="\n\n⚠️ **Warning:** One or more coverage metrics have decreased by more than 1%"
fi

# Post comment to GitHub PR
if [ -n "$PR_NUMBER" ] && [ -n "$GITHUB_TOKEN" ]; then
    curl -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/comments" \
        -d "{\"body\":$(echo "$COMMENT_BODY" | jq -R -s .)}"
fi

# Also print to console
echo "$COMMENT_BODY"

exit $HAS_DECREASE 
