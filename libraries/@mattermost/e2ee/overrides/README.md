# Old Architecture Overrides

This directory contains manually maintained files that override generated code to support React Native's old architecture (`RCT_NEW_ARCH_ENABLED=0`).

## Files

**MattermostE2ee.mm**

This file is copied over the generated `ios/MattermostE2ee.mm` after each build.

**Why override?**
- `uniffi-bindgen-react-native` generates code for new architecture only (JSI/TurboModules)
- We need bridge methods to access JSI runtime in old architecture
- The file structure is stable - only contains `installRustCrate` and `cleanupRustCrate` methods
- Adding new Rust functions doesn't require changes to this file (they're accessed through JSI after initialization)

**Modifications:**
1. Added imports for `RCTBridge+Private.h`, `RCTTurboModule.h`, and `jsi.h` for old arch
2. Added `@synthesize bridge` and `@synthesize methodQueue` for bridge access
3. Wrapped TurboModule C++ code in `#ifdef RCT_NEW_ARCH_ENABLED` guards (strictly not needed, but if/when we upgrade)
4. Added `RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD` exports for old architecture that access JSI through `RCTCxxBridge`

**When to update the override file:**
- Only if uniffi-bindgen-react-native changes its structure
- This should be rare (never?) since the JSI initialization pattern is stable
