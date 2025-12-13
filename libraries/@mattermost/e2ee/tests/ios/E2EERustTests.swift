// E2EE Rust FFI Integration Tests
// Tests that the Rust library loads correctly and FFI functions are callable

import Foundation

// Declare the C FFI functions from the Rust library
// These are the checksum functions that verify the FFI contract
@_silgen_name("uniffi_mattermost_e2ee_checksum_func_greet")
func uniffi_checksum_greet() -> UInt16

@_silgen_name("uniffi_mattermost_e2ee_checksum_func_hello_from_rust")
func uniffi_checksum_hello_from_rust() -> UInt16

@_silgen_name("ffi_mattermost_e2ee_uniffi_contract_version")
func uniffi_contract_version() -> UInt32

// Expected values from the generated TypeScript bindings
let EXPECTED_GREET_CHECKSUM: UInt16 = 28133
let EXPECTED_HELLO_CHECKSUM: UInt16 = 39858
let EXPECTED_CONTRACT_VERSION: UInt32 = 29

func runTests() -> Bool {
    var passed = 0
    var failed = 0

    print("==> Running E2EE Rust FFI Tests")
    print("")

    // Test 1: Contract version
    let contractVersion = uniffi_contract_version()
    if contractVersion == EXPECTED_CONTRACT_VERSION {
        print("✓ Contract version: \(contractVersion)")
        passed += 1
    } else {
        print("✗ Contract version: expected \(EXPECTED_CONTRACT_VERSION), got \(contractVersion)")
        failed += 1
    }

    // Test 2: greet checksum
    let greetChecksum = uniffi_checksum_greet()
    if greetChecksum == EXPECTED_GREET_CHECKSUM {
        print("✓ greet() checksum: \(greetChecksum)")
        passed += 1
    } else {
        print("✗ greet() checksum: expected \(EXPECTED_GREET_CHECKSUM), got \(greetChecksum)")
        failed += 1
    }

    // Test 3: hello_from_rust checksum
    let helloChecksum = uniffi_checksum_hello_from_rust()
    if helloChecksum == EXPECTED_HELLO_CHECKSUM {
        print("✓ hello_from_rust() checksum: \(helloChecksum)")
        passed += 1
    } else {
        print("✗ hello_from_rust() checksum: expected \(EXPECTED_HELLO_CHECKSUM), got \(helloChecksum)")
        failed += 1
    }

    print("")
    print("Results: \(passed) passed, \(failed) failed")

    return failed == 0
}

// Main entry point
let success = runTests()
exit(success ? 0 : 1)
