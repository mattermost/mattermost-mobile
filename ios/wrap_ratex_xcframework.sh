#!/usr/bin/env bash
set -euo pipefail

MIN_IOS_VERSION="${1:-18.0}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
XCFW_PATH="$SCRIPT_DIR/../node_modules/ratex-react-native/ios/RaTeX.xcframework"

ORIG_PATH="$XCFW_PATH.orig"
WRAPPED_PLIST="$XCFW_PATH/ios-arm64/RaTeX.framework/Info.plist"

if [ -f "$XCFW_PATH/ios-arm64/RaTeX.framework/RaTeX" ] && [ ! -f "$XCFW_PATH/ios-arm64/libratex_ffi.a" ]; then
  WRAPPED_MIN_VERSION="$(plutil -extract MinimumOSVersion raw -o - "$WRAPPED_PLIST" 2>/dev/null || true)"
  if [ "$WRAPPED_MIN_VERSION" = "$MIN_IOS_VERSION" ]; then
    exit 0
  fi

  if [ ! -d "$ORIG_PATH" ]; then
    echo "RaTeX.xcframework is wrapped for iOS ${WRAPPED_MIN_VERSION:-unknown} but $ORIG_PATH is missing; reinstall node_modules to rebuild it for $MIN_IOS_VERSION" >&2
    exit 1
  fi

  rm -rf "$XCFW_PATH"
  cp -R "$ORIG_PATH" "$XCFW_PATH"
fi

for slice in ios-arm64 ios-arm64_x86_64-simulator; do
  if [ ! -f "$XCFW_PATH/$slice/libratex_ffi.a" ]; then
    echo "Missing expected static library: $XCFW_PATH/$slice/libratex_ffi.a" >&2
    exit 1
  fi
done

if [ ! -d "$ORIG_PATH" ]; then
  rm -rf "$ORIG_PATH.partial"
  cp -R "$XCFW_PATH" "$ORIG_PATH.partial"
  mv "$ORIG_PATH.partial" "$ORIG_PATH"
fi

PKG_JSON="$SCRIPT_DIR/../node_modules/ratex-react-native/package.json"
SHORT_VERSION="0.1.4"
if [ -f "$PKG_JSON" ]; then
  SHORT_VERSION="$(node -e "console.log(JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')).version || '0.1.4')" "$PKG_JSON")"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

build_framework() {
  local slice_dir="$1" platform="$2" sdk="$3" min_flag="$4"
  shift 4

  local fw_dir="$TMP_DIR/$slice_dir/RaTeX.framework"
  mkdir -p "$fw_dir/Headers" "$fw_dir/Modules"
  cp "$XCFW_PATH/$slice_dir/Headers/ratex.h" "$fw_dir/Headers/ratex.h"

  cat > "$fw_dir/Modules/module.modulemap" <<'EOF'
framework module RaTeX {
    header "ratex.h"
    export *
}
EOF

  cat > "$fw_dir/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleExecutable</key>
	<string>RaTeX</string>
	<key>CFBundleIdentifier</key>
	<string>com.mattermost.ratex</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>RaTeX</string>
	<key>CFBundlePackageType</key>
	<string>FMWK</string>
	<key>CFBundleShortVersionString</key>
	<string>${SHORT_VERSION}</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>MinimumOSVersion</key>
	<string>${MIN_IOS_VERSION}</string>
	<key>CFBundleSupportedPlatforms</key>
	<array>
		<string>${platform}</string>
	</array>
</dict>
</plist>
EOF

  local sdk_path
  sdk_path="$(xcrun --sdk "$sdk" --show-sdk-path)"

  local bins=()
  local arch out_bin
  for arch in "$@"; do
    out_bin="$TMP_DIR/RaTeX.${sdk}.${arch}"
    xcrun --sdk "$sdk" clang -dynamiclib \
      -arch "$arch" \
      -isysroot "$sdk_path" \
      "${min_flag}=${MIN_IOS_VERSION}" \
      -install_name "@rpath/RaTeX.framework/RaTeX" \
      -Wl,-dead_strip \
      -Wl,-exported_symbol,_ratex_* \
      -Wl,-force_load,"$XCFW_PATH/$slice_dir/libratex_ffi.a" \
      -o "$out_bin"
    bins+=("$out_bin")
  done

  if (( ${#bins[@]} > 1 )); then
    lipo -create "${bins[@]}" -output "$fw_dir/RaTeX"
  else
    mv "${bins[0]}" "$fw_dir/RaTeX"
  fi
}

build_framework ios-arm64 iPhoneOS iphoneos -miphoneos-version-min arm64
build_framework ios-arm64_x86_64-simulator iPhoneSimulator iphonesimulator -mios-simulator-version-min arm64 x86_64

xcodebuild -create-xcframework \
  -framework "$TMP_DIR/ios-arm64/RaTeX.framework" \
  -framework "$TMP_DIR/ios-arm64_x86_64-simulator/RaTeX.framework" \
  -output "$TMP_DIR/RaTeX.xcframework"

rm -rf "$XCFW_PATH"
mv "$TMP_DIR/RaTeX.xcframework" "$XCFW_PATH"
