#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${UBRN_CARGO_NDK_REAL:-}" ]]; then
  echo "error: UBRN_CARGO_NDK_REAL is not set; unable to locate original cargo-ndk binary." >&2
  exit 1
fi

REAL_BIN="${UBRN_CARGO_NDK_REAL}"

if [[ ! -x "${REAL_BIN}" ]]; then
  echo "error: original cargo-ndk binary '${REAL_BIN}' is not executable." >&2
  exit 1
fi

filtered_args=()
for arg in "$@"; do
  if [[ "${arg}" == "--no-strip" ]]; then
    continue
  fi
  filtered_args+=("${arg}")
done

exec "${REAL_BIN}" "${filtered_args[@]}"
