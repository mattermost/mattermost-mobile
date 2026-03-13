# Degradation Tests (DDIL Testing)

This directory contains E2E tests specifically designed to validate app behavior under degraded network conditions (Disconnected, Degraded, Intermittent, and Low-bandwidth environments).

## Purpose

These tests focus on behaviors that are critical under poor network conditions:
- Message delivery and eventual consistency
- Reconnection handling
- Offline queue behavior
- UI feedback during slow operations
- Error handling and recovery

## Network Profiles

Tests are designed to run under various network profiles defined in `.github/actions/bandwidth-throttling/profiles.yml`:

| Profile | Download | Latency | Packet Loss | Use Case |
|---------|----------|---------|-------------|----------|
| `slow_3g` | 400 Kbps | 300ms | 2% | Rural/congested areas |
| `edge_2g` | 50 Kbps | 500ms | 5% | Edge coverage |
| `satellite` | 1 Mbps | 700ms | 1% | High-latency satellite |
| `flapping` | varies | varies | varies | Intermittent connectivity |

## Running Degradation Tests

### Locally (with network simulation)
```bash
# Use Charles Proxy or similar to throttle network
cd detox
NETWORK_PROFILE=slow_3g npm run e2e:ios-test -- --testPathPattern=degradation
```

### In CI
The nightly workflow runs these tests automatically under multiple profiles:
```bash
# Trigger manually via GitHub Actions workflow_dispatch
gh workflow run e2e-degradation-nightly.yml -f profiles=slow_3g,edge_2g -f platforms=ios
```

## Test Guidelines

1. **Use longer timeouts**: Import `getTimeoutMultiplier()` from `@support/utils` and multiply standard timeouts
2. **Expect retries**: Operations may need multiple attempts
3. **Check eventual consistency**: Verify state after allowing time for sync
4. **Validate UI feedback**: Ensure loading states and connection banners appear appropriately
5. **Don't assert timing**: Under degradation, exact timing is unpredictable

## Expanding Test Coverage

To add a test to degradation testing:
1. Place it in this `degradation/` directory, or
2. Tag existing tests with `@degradation` in the test name (future feature)

Start with critical user journeys and expand based on field reports of issues under poor network conditions.
