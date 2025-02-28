#!/bin/bash

set -e  # Exit on any error

# Check if an argument is provided
if [ -z "$1" ]; then
  echo "❌ Error: No coverage file provided."
  echo "Usage: $0 <coverage-summary.json>"
  exit 1
fi

COVERAGE_FILE="$1"

# Check if the coverage file exists
if [ ! -f "$COVERAGE_FILE" ]; then
  echo "❌ Error: Coverage summary file not found: $COVERAGE_FILE"
  exit 1
fi

# Extract coverage values from JSON
BRANCHES=$(jq '.total.branches.pct' $COVERAGE_FILE)
FUNCTIONS=$(jq '.total.functions.pct' $COVERAGE_FILE)
LINES=$(jq '.total.lines.pct' $COVERAGE_FILE)
STATEMENTS=$(jq '.total.statements.pct' $COVERAGE_FILE)

# Print extracted values
echo "📊 Extracted Coverage Values:"
echo " - Branches:   $BRANCHES%"
echo " - Functions:  $FUNCTIONS%"
echo " - Lines:      $LINES%"
echo " - Statements: $STATEMENTS%"

# Export values for GitHub Actions (if needed)
echo "BRANCHES=$BRANCHES" >> $GITHUB_ENV
echo "FUNCTIONS=$FUNCTIONS" >> $GITHUB_ENV
echo "LINES=$LINES" >> $GITHUB_ENV
echo "STATEMENTS=$STATEMENTS" >> $GITHUB_ENV
