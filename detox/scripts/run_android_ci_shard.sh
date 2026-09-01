#!/bin/bash
# Run one Android Detox shard. On failure, retry only failed/unrun files.
# Keep the emulator if it is still healthy; cold-boot only when it is not.

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DETOX_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

SDK_VERSION="${1:?SDK version required}"
AVD_NAME="${2:?AVD name required}"
shift 2
SHARD_SPECS=("$@")

if (( ${#SHARD_SPECS[@]} == 0 )); then
    echo "No specs provided"
    exit 1
fi

MAX_ATTEMPTS="${MAX_ATTEMPTS:-2}"
ATTEMPT_TIMEOUT_MIN="${ATTEMPT_TIMEOUT_MIN:-60}"
RESULTS="${DETOX_DIR}/artifacts/jest-results.json"
ATTEMPT1_RESULTS="${DETOX_DIR}/artifacts/jest-results-attempt1.json"
FAILED_SPECS_JS="${DETOX_DIR}/utils/failed-jest-specs.js"

write_missing_results_stub() {
    if [ -f "$RESULTS" ]; then
        return
    fi
    echo "==> Detox left no jest-results.json — writing shard stub"
    node "${DETOX_DIR}/utils/write-tsio-failure-stub.mjs" \
        --format jest \
        --output "$RESULTS" \
        --job-name "${AVD_NAME:-android-shard}" \
        --reason "Detox exited before writing jest-results.json (specs: ${SHARD_SPECS[*]})"
}
trap write_missing_results_stub EXIT

emulator_healthy() {
    adb devices 2>/dev/null | grep -qE '^emulator-[0-9]+\s+device' || return 1
    [[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] || return 1
    adb shell pm list packages 2>/dev/null | grep -q 'com.mattermost.rnbeta' || return 1
}

kill_emulator() {
    adb -s emulator-5554 emu kill 2>/dev/null || true
    pkill -9 -f qemu-system 2>/dev/null || true
    pkill -9 -f emulator 2>/dev/null || true
    sleep 5
}

run_detox_attempt() {
    local tests_only="${1:-false}"
    shift
    (
        cd "${DETOX_DIR}"
        chmod +x ./create_android_emulator.sh
        if [[ "${tests_only}" == "true" ]]; then
            TESTS_ONLY=true CI=true timeout "${ATTEMPT_TIMEOUT_MIN}m" \
                ./create_android_emulator.sh "${SDK_VERSION}" "${AVD_NAME}" "$@"
        else
            CI=true timeout "${ATTEMPT_TIMEOUT_MIN}m" \
                ./create_android_emulator.sh "${SDK_VERSION}" "${AVD_NAME}" "$@"
        fi
    )
}

merge_attempt_results() {
    if [[ ! -f "${ATTEMPT1_RESULTS}" ]]; then
        return 0
    fi
    if [[ ! -f "${RESULTS}" ]]; then
        mv "${ATTEMPT1_RESULTS}" "${RESULTS}"
        return 0
    fi
    node "${FAILED_SPECS_JS}" \
        --attempt1 "${ATTEMPT1_RESULTS}" \
        --attempt2 "${RESULTS}" \
        --output "${RESULTS}"
}

attempt=1
while (( attempt <= MAX_ATTEMPTS )); do
    echo "==> Attempt ${attempt}/${MAX_ATTEMPTS} (timeout ${ATTEMPT_TIMEOUT_MIN}m)"

    if (( attempt == 1 )); then
        run_detox_attempt false "${SHARD_SPECS[@]}"
        rc=$?
    else
        retry_out="$(node "${FAILED_SPECS_JS}" \
            --results "${RESULTS}" \
            --shard-specs "${SHARD_SPECS[*]}")"
        node_rc=$?
        retry_specs=()
        if (( node_rc == 0 )) && [[ -n "${retry_out}" ]]; then
            while IFS= read -r line; do
                [[ -n "${line}" ]] && retry_specs+=("${line}")
            done <<< "${retry_out}"
        fi
        if (( ${#retry_specs[@]} == 0 )); then
            echo "==> Could not determine failed specs — retrying the whole shard"
            retry_specs=("${SHARD_SPECS[@]}")
        fi
        echo "==> Retrying ${#retry_specs[@]} spec(s): ${retry_specs[*]}"

        if [[ -f "${RESULTS}" ]]; then
            mv "${RESULTS}" "${ATTEMPT1_RESULTS}"
        fi

        if emulator_healthy; then
            echo "==> Emulator healthy — resetting app and retrying failed specs only"
            run_detox_attempt true "${retry_specs[@]}"
            rc=$?
            if (( rc == 2 )); then
                echo "==> Emulator went unhealthy during retry — cold boot"
                kill_emulator
                run_detox_attempt false "${retry_specs[@]}"
                rc=$?
            fi
        else
            echo "==> Emulator unhealthy — cold boot, then retrying failed specs only"
            kill_emulator
            run_detox_attempt false "${retry_specs[@]}"
            rc=$?
        fi
        merge_attempt_results
    fi

    if (( rc == 0 )); then
        echo "==> Attempt ${attempt} succeeded"
        exit 0
    fi

    echo "==> Attempt ${attempt} failed with exit ${rc}"
    if (( attempt < MAX_ATTEMPTS )); then
        echo "==> Will retry failed/unrun specs (not the whole shard)"
    fi
    attempt=$(( attempt + 1 ))
done

echo "==> All ${MAX_ATTEMPTS} attempts failed"
exit 1
