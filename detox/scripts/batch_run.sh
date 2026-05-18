#!/usr/bin/env bash
# Batch-run Detox specs and write two clean files:
#   /tmp/detox-batch-summary.md   — one-line-per-spec pass/fail (paste-able)
#   /tmp/detox-batch-failures.md  — full failure details (only failed tests)
#
# Usage:
#   detox/scripts/batch_run.sh <platform> <spec1> [<spec2> ...]
#   detox/scripts/batch_run.sh <platform> --area <area>
#     where <area> is one of: account, autocomplete, channels, messaging,
#                             search, server_login, smoke_test, threads
#
# Examples:
#   detox/scripts/batch_run.sh ios e2e/test/products/channels/account/clock_display_settings.e2e.ts e2e/test/products/channels/account/display_settings.e2e.ts
#   detox/scripts/batch_run.sh android --area account
#
# Append to existing summary instead of overwriting:
#   APPEND=1 detox/scripts/batch_run.sh ios <spec>
#
# Preconditions (script does NOT verify — main agent handles env):
#   - Mattermost server reachable at http://localhost:8065
#   - Metro running on 127.0.0.1:8081
#   - iOS simulator booted (iPhone 17 Pro) OR Android emulator booted + adb reverse done
#   - On Android, ANDROID_HOME / JAVA_HOME / PATH are exported

set -uo pipefail

PLATFORM="${1:?missing platform (ios|android)}"
shift

if [[ "$PLATFORM" != "ios" && "$PLATFORM" != "android" ]]; then
    echo "ERROR: platform must be 'ios' or 'android', got '$PLATFORM'" >&2
    exit 2
fi

# Resolve script + repo paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DETOX_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${DETOX_DIR}"

# Expand --area <name> into a glob of specs
if [[ "${1:-}" == "--area" ]]; then
    AREA="${2:?missing area name}"
    shift 2
    case "$AREA" in
        account)       SPECS=( e2e/test/products/channels/account/*.e2e.ts ) ;;
        autocomplete)  SPECS=( e2e/test/products/channels/autocomplete/*.e2e.ts ) ;;
        channels)      SPECS=( e2e/test/products/channels/channels/*.e2e.ts ) ;;
        channel_settings) SPECS=( e2e/test/products/channels/channel_settings/*.e2e.ts ) ;;
        messaging)     SPECS=( e2e/test/products/channels/messaging/*.e2e.ts ) ;;
        search)        SPECS=( e2e/test/products/channels/search/*.e2e.ts ) ;;
        server_login)  SPECS=( e2e/test/products/channels/server_login/*.e2e.ts ) ;;
        smoke_test)    SPECS=( e2e/test/products/channels/smoke_test/*.e2e.ts ) ;;
        threads)       SPECS=( e2e/test/products/channels/threads/*.e2e.ts ) ;;
        agents)        SPECS=( e2e/test/products/agents/*.e2e.ts ) ;;
        *) echo "ERROR: unknown area '$AREA'" >&2; exit 2 ;;
    esac
else
    SPECS=( "$@" )
fi

if [[ ${#SPECS[@]} -eq 0 ]]; then
    echo "ERROR: no specs given" >&2
    exit 2
fi

SUMMARY=/tmp/detox-batch-summary.md
FAILURES=/tmp/detox-batch-failures.md

if [[ "${APPEND:-0}" != "1" ]]; then
    : > "$SUMMARY"
    : > "$FAILURES"
fi

START_TS=$(date +%s)
echo "## $(date '+%Y-%m-%d %H:%M:%S') — $PLATFORM batch ($(echo ${#SPECS[@]}) spec$([[ ${#SPECS[@]} -gt 1 ]] && echo s))" >> "$SUMMARY"
echo "" >> "$SUMMARY"
echo "| Spec | Result | Pass/Fail/Skip | Time |" >> "$SUMMARY"
echo "|---|---|---|---|" >> "$SUMMARY"

CONFIG="${PLATFORM}.sim.debug"
[[ "$PLATFORM" == "android" ]] && CONFIG="android.emu.debug"
[[ "$PLATFORM" == "ios" ]]     && export IOS=true

for SPEC in "${SPECS[@]}"; do
    if [[ ! -f "$SPEC" ]]; then
        echo "| \`${SPEC#e2e/test/products/channels/}\` | ❓ missing | — | — |" >> "$SUMMARY"
        continue
    fi

    SHORT="${SPEC#e2e/test/products/channels/}"
    SHORT="${SHORT#e2e/test/products/}"
    SPEC_START=$(date +%s)
    LOG="/tmp/detox-batch-$(basename "$SPEC" .e2e.ts)-${PLATFORM}.log"

    npx detox test -c "$CONFIG" "$SPEC" --headless >"$LOG" 2>&1
    EXIT=$?
    SPEC_END=$(date +%s)
    DUR=$((SPEC_END - SPEC_START))

    JUNIT="artifacts/${PLATFORM}-junit.xml"
    if [[ -f "$JUNIT" ]]; then
        STATS=$(python3 - <<EOF
import xml.etree.ElementTree as ET
try:
    root = ET.parse("$JUNIT").getroot()
    p = f = s = 0
    fails = []
    for tc in root.iter('testcase'):
        name = tc.get('name', '')
        if not name or 'Test execution failure' in name:
            continue
        skipped = any(c.tag == 'skipped' for c in tc)
        failed = any(c.tag in ('failure', 'error') for c in tc)
        if skipped:
            s += 1
        elif failed:
            f += 1
            fails.append(name)
        else:
            p += 1
    print(f"{p}/{f}/{s}|" + "\\n".join(fails))
except Exception as e:
    print(f"?/?/?|parse error: {e}")
EOF
)
        PFS="${STATS%%|*}"
        FAIL_NAMES="${STATS#*|}"
    else
        PFS="?/?/?"
        FAIL_NAMES=""
    fi

    if [[ $EXIT -eq 0 ]]; then
        RESULT="✅ PASS"
    else
        RESULT="❌ FAIL"
    fi

    echo "| \`${SHORT}\` | ${RESULT} | ${PFS} | ${DUR}s |" >> "$SUMMARY"

    # On failure, append detailed per-test errors + log path to failures file
    if [[ $EXIT -ne 0 ]]; then
        {
            echo ""
            echo "### \`${SHORT}\` ($PLATFORM) — exit $EXIT, ${DUR}s"
            echo ""
            echo "**Full log:** \`${LOG}\`"
            echo ""
            if [[ -f "$JUNIT" ]]; then
                python3 - <<EOF
import xml.etree.ElementTree as ET, re
root = ET.parse("$JUNIT").getroot()
for tc in root.iter('testcase'):
    name = tc.get('name', '')
    if not name or 'Test execution failure' in name:
        continue
    fail = next((c for c in tc if c.tag in ('failure', 'error')), None)
    if fail is None:
        continue
    msg = (fail.get('message','') or fail.text or '')
    msg = re.sub(r'\s+', ' ', msg)
    print(f"- **{name}**")
    print(f"  - {msg[:500]}")
EOF
            fi
            # Look for failure screenshots — Detox names artifact dirs with the test title
            ARTDIR=$(ls -td artifacts/${PLATFORM}.sim.debug.* artifacts/${PLATFORM}.emu.debug.* 2>/dev/null | head -1)
            if [[ -n "$ARTDIR" ]]; then
                SHOTS=$(find "$ARTDIR" -name 'testFnFailure.png' -o -name 'beforeEachFailure.png' 2>/dev/null | head -5)
                if [[ -n "$SHOTS" ]]; then
                    echo ""
                    echo "Screenshots:"
                    echo "$SHOTS" | sed 's|^|  - `|; s|$|`|'
                fi
            fi
        } >> "$FAILURES"
    fi
done

END_TS=$(date +%s)
TOTAL=$((END_TS - START_TS))
echo "" >> "$SUMMARY"
echo "**Total: ${TOTAL}s**" >> "$SUMMARY"
echo "" >> "$SUMMARY"

echo "[done] summary: $SUMMARY"
echo "[done] failures (if any): $FAILURES"
