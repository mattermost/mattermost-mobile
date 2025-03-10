#!/bin/bash

CURRENT_COVERAGE_FILE="$1/coverage-summary.json"
RECENT_COVERAGE_FILE="$2/coverage-summary.json"

if [ ! -f "$CURRENT_COVERAGE_FILE" ] || [ ! -f "$RECENT_COVERAGE_FILE" ]; then
    echo "One or both coverage files not found"
    exit 0
fi

# Extract total coverage percentages
CURRENT_COVERAGE=$(jq '.total.lines.pct' "$CURRENT_COVERAGE_FILE")
RECENT_COVERAGE=$(jq '.total.lines.pct' "$RECENT_COVERAGE_FILE")

# Calculate difference
DIFFERENCE=$(echo "$CURRENT_COVERAGE - $RECENT_COVERAGE" | bc)

echo "Current coverage: $CURRENT_COVERAGE%"
echo "Previous coverage: $RECENT_COVERAGE%"
echo "Difference: $DIFFERENCE%"

# Check if coverage decreased by more than 1%
if (( $(echo "$DIFFERENCE < -1" | bc -l) )); then
    echo "::error::Test coverage has decreased by more than 1% (${DIFFERENCE}%)"
    exit 1
fi 
