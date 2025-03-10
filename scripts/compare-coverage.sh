#!/bin/bash

CURRENT_COVERAGE_FILE="$1/coverage-summary.json"
RECENT_COVERAGE_FILE="$2/coverage-summary.json"
PR_NUMBER="$3"
GITHUB_TOKEN="$4"

if [ ! -f "$CURRENT_COVERAGE_FILE" ] || [ ! -f "$RECENT_COVERAGE_FILE" ]; then
    echo "One or both coverage files not found"
    exit 0
fi

# Create the comment body with proper newlines
COMMENT_BODY="### Coverage Comparison Report

\`\`\`
+-----------------+------------+------------+-----------+
| Metric         | Current    | Previous   | Diff      |
+-----------------+------------+------------+-----------+
"

# Compare each metric
HAS_DECREASE=0
for metric in lines statements branches functions; do
    current=$(jq ".total.${metric}.pct" "$CURRENT_COVERAGE_FILE")
    recent=$(jq ".total.${metric}.pct" "$RECENT_COVERAGE_FILE")
    diff=$(echo "$current - $recent" | bc)
    
    # Add row to table with proper formatting
    printf -v row "| %-15s | %10.2f%% | %10.2f%% | %9.2f%% |\n" "${metric^}" "$current" "$recent" "$diff"
    COMMENT_BODY+="$row"
    
    if (( $(echo "$diff < -1" | bc -l) )); then
        echo "::error::${metric^} coverage has decreased by more than 1% ($diff%)"
        HAS_DECREASE=1
    fi
done

COMMENT_BODY+="+-----------------+------------+------------+-----------+
\`\`\`"

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
