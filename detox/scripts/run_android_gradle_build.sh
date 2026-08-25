#!/bin/bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
detox_dir="$(cd "${script_dir}/.." && pwd)"
android_dir="$(cd "${detox_dir}/../android" && pwd)"
build_type="${1:-debug}"

case "$build_type" in
    debug)
        assemble_task="assembleDebug"
        ;;
    release)
        assemble_task="assembleRelease"
        ;;
    *)
        echo "Unsupported build type: $build_type" >&2
        exit 1
        ;;
esac

gradle_args=()

if [[ "${CI:-false}" != "true" ]]; then
    gradle_args+=("-Dorg.gradle.parallel=false")
    gradle_args+=("-Dorg.gradle.workers.max=${MM_GRADLE_WORKERS_MAX:-2}")
    gradle_args+=("-Dorg.gradle.jvmargs=-Xmx${MM_GRADLE_XMX_MB:-3072}m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8")
fi

cd "${android_dir}"
# Build app APK and its test APK (but not test APKs for library dependencies like expo-image)
./gradlew "${gradle_args[@]}" "${assemble_task}" "app:assembleAndroidTest" "-DtestBuildType=${build_type}"
