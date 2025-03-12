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

# Initialize variables for calculating average total coverage
# since the coverage summary doesn't provide an overall total
main_total=0
pr_total=0
metric_count=0

for metric in lines statements branches functions; do
    main=$(jq ".total.${metric}.pct" "$MAIN_COVERAGE_FILE")
    pr=$(jq ".total.${metric}.pct" "$RECENT_COVERAGE_FILE")
    diff=$(echo "$pr - $main" | bc)
    
    # Add to totals for average calculation
    main_total=$(echo "$main_total + $main" | bc)
    pr_total=$(echo "$pr_total + $pr" | bc)
    metric_count=$((metric_count + 1))
    
    row=$(printf "| %-15s | %9.2f%% | %9.2f%% | %8.2f%% |" "${metric^}" "$main" "$pr" "$diff")
    COMMENT_BODY+=$'\n'"$row"
    
    if (( $(echo "$diff > -$COVERAGE_THRESHOLD" | bc -l) )); then
        # Write error messages to stderr instead of stdout
        echo "::error::${metric^} coverage has decreased by more than ${COVERAGE_THRESHOLD}% ($diff%)" >&2
        HAS_DECREASE=1
    fi
done

# Add separator line
COMMENT_BODY+=$'\n'"+-----------------+------------+------------+-----------+"

# Calculate the average coverage across all metrics
main_avg=$(echo "scale=2; $main_total / $metric_count" | bc)
pr_avg=$(echo "scale=2; $pr_total / $metric_count" | bc)
total_diff=$(echo "$pr_avg - $main_avg" | bc)

row=$(printf "| %-15s | %9.2f%% | %9.2f%% | %8.2f%% |" "Total" "$main_avg" "$pr_avg" "$total_diff")
COMMENT_BODY+=$'\n'"$row"

COMMENT_BODY+=$'\n'"+-----------------+------------+------------+-----------+
\`\`\`"

if [ "$HAS_DECREASE" -eq 1 ]; then
    COMMENT_BODY+=$'\n\n'"⚠️ **Warning:** One or more coverage metrics have decreased by more than ${COVERAGE_THRESHOLD}%"
fi

# Only output the comment body to stdout
echo "$COMMENT_BODY"

# Not failing the build for now
# exit $HAS_DECREASE 
