#!/bin/bash

COVERAGE_THRESHOLD=1.0
MAIN_COVERAGE_FILE="$1/coverage-summary.json"
RECENT_COVERAGE_FILE="$2/coverage-summary.json"
PR_NUMBER="$3"
GITHUB_TOKEN="$4"

if [ ! -f "$MAIN_COVERAGE_FILE" ] || [ ! -f "$RECENT_COVERAGE_FILE" ]; then
    echo "One or both coverage files not found"
    exit 0
fi

COMMENT_BODY="### Coverage Comparison Report

\`\`\`
+-----------------+------------+------------+-----------+
| Metric          | Main       | This PR    | Diff      |
+-----------------+------------+------------+-----------+"

HAS_DECREASE=0

for metric in lines statements branches functions; do
    main=$(jq ".total.${metric}.pct" "$MAIN_COVERAGE_FILE")
    pr=$(jq ".total.${metric}.pct" "$RECENT_COVERAGE_FILE")
    diff=$(echo "$pr - $main" | bc)
    
    row=$(printf "| %-15s | %9.2f%% | %9.2f%% | %8.2f%% |" "${metric^}" "$main" "$pr" "$diff")
    COMMENT_BODY+=$'\n'"$row"
    
    if (( $(echo "$diff < -$COVERAGE_THRESHOLD" | bc -l) )); then
        echo "::error::${metric^} coverage has decreased by more than ${COVERAGE_THRESHOLD}% ($diff%)"
        HAS_DECREASE=1
    fi
done

# Add separator line
COMMENT_BODY+=$'\n'"+-----------------+------------+------------+-----------+"

# Add total row using the total from JSON
main_total=$(jq ".total.total.pct" "$MAIN_COVERAGE_FILE")
pr_total=$(jq ".total.total.pct" "$RECENT_COVERAGE_FILE")
total_diff=$(echo "$pr_total - $main_total" | bc)

row=$(printf "| %-15s | %9.2f%% | %9.2f%% | %8.2f%% |" "Total" "$main_total" "$pr_total" "$total_diff")
COMMENT_BODY+=$'\n'"$row"

COMMENT_BODY+=$'\n'"+-----------------+------------+------------+-----------+
\`\`\`"

if [ "$HAS_DECREASE" -eq 1 ]; then
    COMMENT_BODY+=$'\n\n'"⚠️ **Warning:** One or more coverage metrics have decreased by more than ${COVERAGE_THRESHOLD}%"
fi

if [ -n "$PR_NUMBER" ] && [ -n "$GITHUB_TOKEN" ]; then
    curl -X POST \
        -H "Authorization: token $GITHUB_TOKEN" \
        -H "Accept: application/vnd.github.v3+json" \
        "https://api.github.com/repos/$GITHUB_REPOSITORY/issues/$PR_NUMBER/comments" \
        -d "{\"body\":$(echo "$COMMENT_BODY" | jq -R -s .)}"
fi

echo "$COMMENT_BODY"

# Not failing the build for now
# exit $HAS_DECREASE 
