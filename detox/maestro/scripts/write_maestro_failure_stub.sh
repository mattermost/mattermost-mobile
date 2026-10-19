#!/bin/bash
# Write a one-testcase JUnit failure for a Maestro flow that could not be started.
#
# The dedicated MM-T3261 steps patch server config before invoking Maestro. When that
# patch fails (CI 34290629488: HTTP 400 because ReportAProblemType=email needs a valid
# ReportAProblemMail) Maestro never runs, no maestro-report-*.xml is written, and the
# flow silently drops out of the merged report — a step that "never happened" instead
# of a red test. This stub keeps the flow in the count as a failure so the omission
# is visible in TSIO and the commit status.
#
# Usage: write_maestro_failure_stub.sh <output-xml> <flow-file> <message>
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
  <testsuite name="$(xml_escape "$flow_name")" tests="1" failures="1" errors="0" skipped="0" time="0">
    <testcase name="$(xml_escape "$flow_name")" classname="$(xml_escape "$category")" file="$(xml_escape "$flow_file")" time="0">
      <failure message="$(xml_escape "$message")">$(xml_escape "$message")</failure>
    </testcase>
  </testsuite>
</testsuites>
XML

echo "==> Wrote failure stub for ${flow_name} to ${output_xml}: ${message}"
