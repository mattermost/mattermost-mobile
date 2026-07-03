#!/bin/bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
detox_dir="$(cd "${script_dir}/.." && pwd)"

if [[ "${CI:-false}" != "true" && -z "${DETOX_MAX_WORKERS:-}" ]]; then
    export DETOX_MAX_WORKERS=1
fi

if [[ "${NODE_OPTIONS:-}" != *"max_old_space_size"* ]]; then
    export NODE_OPTIONS="${NODE_OPTIONS:+${NODE_OPTIONS} }--max_old_space_size=${MM_E2E_NODE_MAX_OLD_SPACE_SIZE:-4096}"
fi

cd "${detox_dir}"
exec "${detox_dir}/node_modules/.bin/detox" "$@"
