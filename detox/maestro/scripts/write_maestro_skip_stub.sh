#!/bin/bash
# Write a one-testcase JUnit *skip* for a flow whose server-side pre-condition this
# installation will not allow us to set up.
#
# Distinct from write_maestro_failure_stub.sh on purpose: a failure means the product or the
# flow is wrong, a skip means the environment cannot host the test. The MM-T3261 flows need
# SupportSettings.ReportAProblemType changed, and that field is tagged
# `write_restrictable,cloud_restrictable` in the server's model, so PUT /api/v4/config/patch
# silently drops it (still answering 200) whenever ExperimentalSettings.RestrictSystemAdmin is
# true — which is how the PR Spinwicks are provisioned. RestrictSystemAdmin is itself
# write_restrictable, so an API admin session cannot turn it off either.
#
# The skip is re-evaluated every run: the moment a server allows the write, the flow runs again.
# The reason is written into the report so this can never become a silent hole in the count.
#
# Usage: write_maestro_skip_stub.sh <output-xml> <flow-file> <message>
set -euo pipefail

if [[ $# -ne 3 ]]; then
    echo "usage: $0 <output-xml> <flow-file> <message>" >&2
    exit 2
fi

output_xml="$1"
flow_file="$2"
message="$3"

flow_name="$(basename "$flow_file" .yml)"
category="$(basename "$(dirname "$flow_file")")"

xml_escape() {
    local s="$1"
    s="${s//&/&amp;}"
    s="${s//</&lt;}"
    s="${s//>/&gt;}"
    s="${s//\"/&quot;}"
    printf '%s' "$s"
}

mkdir -p "$(dirname "$output_xml")"
cat > "$output_xml" <<XML
<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="$(xml_escape "$flow_name")" tests="1" failures="0" errors="0" skipped="1" time="0">
    <testcase name="$(xml_escape "$flow_name")" classname="$(xml_escape "$category")" file="$(xml_escape "$flow_file")" time="0">
      <skipped message="$(xml_escape "$message")"></skipped>
    </testcase>
  </testsuite>
</testsuites>
XML

echo "==> Wrote skip stub for ${flow_name} to ${output_xml}: ${message}"
