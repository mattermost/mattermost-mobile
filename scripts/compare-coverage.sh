#!/bin/bash

CURRENT_COVERAGE_FILE="$1/coverage-summary.json"
RECENT_COVERAGE_FILE="$2/coverage-summary.json"

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

# Track if any metric has decreased
HAS_DECREASE=0

echo "Coverage Comparison Report"
echo "========================="
print_line
printf "| %-15s | %-10s | %-10s | %-9s |\n" "Metric" "Current" "Previous" "Diff"
print_line

# Compare each metric
for metric in lines statements branches functions; do
    current=$(jq ".total.${metric}.pct" "$CURRENT_COVERAGE_FILE")
    recent=$(jq ".total.${metric}.pct" "$RECENT_COVERAGE_FILE")
    diff=$(echo "$current - $recent" | bc)
    
    print_row "${metric^}" "$current" "$recent" "$diff"
    
    # Check if coverage decreased by more than 1%
    if (( $(echo "$diff < -1" | bc -l) )); then
        echo "::error::${metric^} coverage has decreased by more than 1% ($diff%)"
        HAS_DECREASE=1
    fi
done

print_line

exit $HAS_DECREASE 
