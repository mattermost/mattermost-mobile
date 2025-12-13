# Rust E2EE Integration

This project integrates Rust code with React Native using `uniffi-bindgen-react-native` for end-to-end encryption (E2EE) functionality.

## Architecture

```
libraries/@mattermost/e2ee/
├── rust/                   # Rust library source code
│   ├── Cargo.toml          # Rust dependencies and config
│   ├── src/lib.rs          # Rust implementation
│   └── uniffi.toml         # UniFFI bindings config
├── src/                    # TypeScript bindings + entry point
│   ├── e2ee.ts             # Public JS/TS helpers
│   ├── index.tsx           # Turbo module registration
│   ├── NativeMattermostE2ee.ts
│   └── generated/          # Auto-generated TypeScript bindings
├── ios/                    # iOS native module files (generated)
├── android/                # Android JNI files (generated)
├── cpp/                    # C++ bridge code (generated)
├── mattermost-e2ee.podspec # CocoaPods spec
└── ubrn.config.yaml        # uniffi-bindgen-react-native config
```

## Prerequisites

Developers need:
- **Rust 1.90.0** (installed via [rustup](https://rustup.rs/); the `rust-toolchain.toml` in this package pins the version automatically)
- **cargo-ndk**: `cargo install cargo-ndk`
- **Rust targets**: `rustup target add aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android`
- **Android NDK**: Set up via Android Studio
- **Xcode**: For iOS development (macOS hosts only)

## Building

> **Quick start:** `npm install` at the repo root automatically invokes this build. Re-run it manually only when you change the Rust sources or need to regenerate the native bindings.

### Generate iOS + Android artifacts

From the repo root:

```bash
npm run e2ee:build
```

Or directly inside this package:

```bash
npm run build
```

This will:
1. Compile Rust to static libraries for iOS (device + simulator) and Android (arm64-v8a, armeabi-v7a, x86_64)
2. Create/refresh the XCFramework used by iOS
3. Generate Swift/ObjC bindings
4. Generate C++ bindings
5. Generate TypeScript bindings
6. Run `pod install` (requires CocoaPods in PATH)

### Debug vs Release Builds

By default, builds use **debug mode** for faster compilation and better debugging:

```bash
npm run e2ee:build           # Debug build (default)
```

For **release builds** (smaller binaries, optimized), set `E2EE_RELEASE=1`:

```bash
E2EE_RELEASE=1 npm run e2ee:build   # Release build
```

| Mode    | Binary Size | Debug Symbols |
|---------|-------------|---------------|
| Debug   | ~200-550 MB | Yes           |
| Release | ~55-140 MB  | No            |

CI automatically uses release builds.

#### Manual Android build (optional)

The build script uses a wrapper that removes the `--no-strip` flag for compatibility with older `cargo-ndk` versions. If you still hit issues, build the Android static libraries manually:

```bash
cd libraries/@mattermost/e2ee/rust
cargo ndk --target arm64-v8a --platform 23 -- build
cargo ndk --target armv7-linux-androideabi --platform 23 -- build
cargo ndk --target x86_64 --platform 23 -- build
cd ../..
```

Then run the generate step separately if needed.

### Clean Build

From the repo root:

```bash
npm run e2ee:clean
```

Or inside this package:

```bash
npm run clean
```

## Usage

```typescript
import { helloFromRust, greet } from '@mattermost/e2ee';

// use as regular a function call, no surprises. We hope.
```

## Adding New Rust Functions

1. Add your function to `libraries/@mattermost/e2ee/rust/src/lib.rs`:

```rust
#[uniffi::export]
pub fn my_new_function(param: String) -> String {
    // Your implementation
}
```

2. Rebuild

```bash
npm run e2ee:build
```

3. The TypeScript bindings will be automatically regenerated in `src/generated/`

4. Import:

```typescript
import { myNewFunction } from '@mattermost/e2ee';
```

## Generated Files

These files are auto-generated, git-ignored, and should not be edited manually:

- `src/generated/` - TypeScript bindings
- `src/index.tsx` - Module entry point
- `src/NativeMattermostE2ee.ts` - TurboModule spec
- `cpp/generated/` - C++ bindings
- `ios/MattermostE2ee.h` / `ios/MattermostE2ee.mm` - iOS turbo module
- `android/src/main/java/com/mattermost/e2ee/` - Android JNI bindings
- `android/src/main/jniLibs/` - Android native libraries
- `MattermostE2eeFramework.xcframework/` - iOS compiled library

## Troubleshooting

### iOS Linking Errors

If you encounter `libiconv` linking errors, the library search paths are configured in `.cargo/config.toml`.

### Android NDK Not Found

Set the `ANDROID_NDK_HOME` environment variable to your NDK path:
```bash
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/26.1.10909125
```

### cargo-ndk Version Issues

The project requires cargo-ndk 4.x. If you encounter `--no-strip` errors, this is a known compatibility issue with uniffi-bindgen-react-native 0.29.3. Build manually as shown above.

## Resources

- [uniffi-bindgen-react-native](https://jhugman.github.io/uniffi-bindgen-react-native/)
- [UniFFI Documentation](https://mozilla.github.io/uniffi-rs/)
- [cargo-ndk](https://github.com/bbqsrc/cargo-ndk)
