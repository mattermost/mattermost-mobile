#!/usr/bin/env bash
# Validates detox/maestro/flows/**/*.yml against the header contract in GUIDELINES.md,
# and every flow/subflow/preflight body against the step/assertion comment convention.
# Run from repo root: bash detox/maestro/scripts/validate-flow-headers.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAESTRO_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
FLOWS_DIR="${MAESTRO_DIR}/flows"

if [[ ! -d "${FLOWS_DIR}" ]]; then
  echo "::error::Expected flows directory at ${FLOWS_DIR}"
  exit 1
fi

failures=0
checked=0


fail() {
  local file="$1"
  local msg="$2"
  echo "::error file=${file}::${msg}"
  failures=$((failures + 1))
}

extract_header() {
  local file="$1"
  awk '
    /^---[[:space:]]*$/ { exit }
    { print }
  ' "${file}"
}

validate_flow() {
  local file="$1"
  local rel="${file#${MAESTRO_DIR}/}"
  local header
  header="$(extract_header "${file}")"
  checked=$((checked + 1))

  # Ticket line: # MM-T1234: or # MM-T67856_1:
  local ticket
  ticket="$(printf '%s\n' "${header}" | grep -E '^# MM-T[0-9]+(_[0-9]+)?(\([^)]*\))?:' | head -1 | sed -E 's/^# (MM-T[0-9]+(_[0-9]+)?).*/\1/' || true)"
  if [[ -z "${ticket}" ]]; then
    fail "${rel}" "Missing ticket line (# MM-TXXXX: <behavior summary>)"
    return
  fi

  for section in 'PRE-CONDITIONS:' 'REQUIRED ENV VARS:' 'ASSERTIONS:' 'testIDs:'; do
    if ! printf '%s\n' "${header}" | grep -qF "# ${section}"; then
      fail "${rel}" "Missing header section: # ${section}"
    fi
  done

  if ! printf '%s\n' "${header}" | grep -qE '^appId:[[:space:]]*\$\{MAESTRO_APP_ID\}[[:space:]]*$'; then
    fail "${rel}" 'appId must be exactly: appId: ${MAESTRO_APP_ID}'
  fi

  if ! printf '%s\n' "${header}" | grep -qE "^[[:space:]]*-[[:space:]]+${ticket}[[:space:]]*$"; then
    fail "${rel}" "tags must include Zephyr id ${ticket} (tags: [${ticket}])"
  fi

  # Exactly one PR platform tag for Test System IO Android-full / iOS-partial discovery.
  local platform_tag_count
  platform_tag_count="$(printf '%s\n' "${header}" | grep -E '^[[:space:]]*-[[:space:]]+(ios-only|android-only|shared)[[:space:]]*$' | wc -l | tr -d ' ')"
  if [[ "${platform_tag_count}" != "1" ]]; then
    fail "${rel}" "tags must include exactly one platform tag (ios-only | android-only | shared)"
  fi

  # testIDs section should list at least one entry (or an explicit none/system note).
  local testids_block
  testids_block="$(printf '%s\n' "${header}" | awk '
    /^# testIDs:/ { found=1; next }
    found && /^# [A-Z]/ && !/^# testIDs:/ { exit }
    found { print }
  ')"
  if ! printf '%s\n' "${testids_block}" | grep -qE '^#[[:space:]]+-'; then
    fail "${rel}" 'testIDs section must list at least one entry (#   - ...)'
  fi


}

# Every comment block that introduces one or more commands must start with the step/
# assertion marker from GUIDELINES.md §2 — `# #` for a step, `# *` for an assertion —
# mirroring the Detox `// #` / `// *` convention so both suites map onto the same test
# management system. Continuation lines stay plain `#`. Comment blocks that introduce no
# command (trailing notes) are exempt.
validate_body_comments() {
  local file="$1"
  local rel="${file#${MAESTRO_DIR}/}"
  local bad_lines
  bad_lines="$(awk '
    BEGIN { body = 0; n = 0 }
    body == 0 {
      if ($0 ~ /^---[[:space:]]*$/) { body = 1 }
      next
    }
    { n++; line[n] = $0; lineno[n] = FNR }
    END {
      i = 1
      while (i <= n) {
        if (line[i] !~ /^[[:space:]]*#/) { i++; continue }
        start = i
        j = i
        while (j <= n && line[j] ~ /^[[:space:]]*#/) { j++ }
        k = j
        while (k <= n && line[k] ~ /^[[:space:]]*$/) { k++ }
        if (k <= n && line[k] ~ /^[[:space:]]*-/ && line[start] !~ /^[[:space:]]*# [#*] /) {
          print lineno[start]
        }
        i = j
      }
    }
  ' "${file}")"

  local lineno
  for lineno in ${bad_lines}; do
    echo "::error file=${rel},line=${lineno}::Comment block introducing a command must start with '# #' (step) or '# *' (assertion) — see GUIDELINES.md §2"
    failures=$((failures + 1))
  done
}

while IFS= read -r -d '' flow; do
  base="$(basename "${flow}")"
  [[ "${base}" == _* ]] && continue
  validate_flow "${flow}"
done < <(find "${FLOWS_DIR}" -name '*.yml' -type f -print0 | sort -z)

# The comment convention applies to every flow file, including the `_`-prefixed and
# subflow/preflight fragments that are exempt from the Zephyr header contract.
while IFS= read -r -d '' flow; do
  validate_body_comments "${flow}"
done < <(find "${FLOWS_DIR}" "${MAESTRO_DIR}/subflows" "${MAESTRO_DIR}/preflight" -name '*.yml' -type f -print0 2>/dev/null | sort -z)

if [[ "${failures}" -gt 0 ]]; then
  echo ""
  echo "validate-flow-headers: ${failures} failure(s) in ${checked} flow file(s)."
  echo "See detox/maestro/GUIDELINES.md §2 and flows/account/attach_logs.yml for the canonical header."
  exit 1
fi

echo "validate-flow-headers: all ${checked} flow file(s) passed."
