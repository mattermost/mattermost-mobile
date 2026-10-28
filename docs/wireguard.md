# Android per-app WireGuard (Phase 2)

## Implementation

The Android app embeds the official `com.wireguard.android:tunnel` library and exposes it through the app-local `com.mattermost.wireguard` React Native package. No third-party VPN UI or tunnel service replaces Android's normal VPN consent, key icon, or system status indicators.

The tunnel accepts standard wg-quick interface and peer settings, including private/public keys, addresses, DNS, MTU, endpoints, allowed IPs, preshared keys, persistent keepalive, and multiple peers. `IncludedApplications` and `ExcludedApplications` are rejected on import. The app injects only its runtime package name into `IncludedApplications`, so Android uses `VpnService.Builder.addAllowedApplication` for this app and does not tunnel other applications. This also avoids hard-coding the application ID that will change in Phase 3.

Configuration summaries contain addresses, endpoints, DNS servers, allowed IP ranges, and peer counts, but never private or preshared keys. Native parser errors identify fields without echoing configuration values. The configuration is saved under the dedicated `encma.wireguard.configuration` Keychain service only after connection verification. A failed secure save disconnects the new tunnel. Saved configuration can be replaced, disconnected, or removed from the VPN screen.

## Connection gate and verification

Android backend state `UP` is not treated as a usable login connection. The native module sends a small UDP probe toward an address covered by each peer's `AllowedIPs`, then requires a recent WireGuard handshake and received-byte statistics before reporting `connected`. A verification timeout or error tears the tunnel down and reports `failed`.

Android startup and subsequent route changes fail closed to `/vpn` until the native module reports `connected`. Normal launch and login route determination do not run while the gate is closed. A saved configuration is reconnected automatically from the VPN screen. iOS does not use this Android-only gate.

The probe and statistics prove WireGuard negotiation and received tunnel traffic at connection time. They do not, by themselves, prove that a particular Mattermost server is reachable or that every destination will remain reachable later.

## Server and network requirements

The deployment must provide all of the following; no server endpoint or test configuration is stored in this repository:

1. The WireGuard peer endpoint and UDP port must be reachable from the Android device, and the interface/peer keys must match the server configuration.
2. Every Mattermost server IP used by the app must be covered by a peer's `AllowedIPs`. For split tunneling, also include every required private DNS server. A full-tunnel `AllowedIPs` configuration is another option.
3. Private Mattermost hostnames must resolve through DNS reachable in the tunnel. Certificate names and trust chains must remain valid for the configured server URL.
4. The WireGuard server must route and, where applicable, NAT traffic to the Mattermost server. Return traffic must route back through the WireGuard network.
5. To require VPN use server-side rather than only in the app, restrict Mattermost HTTPS access in the server firewall, security group, reverse proxy, or network policy to the intended VPN address range or interface. Do not leave a public route that bypasses this policy if VPN-only access is a security requirement.
6. Allow any additional app-controlled destinations intentionally required by the deployment. Per-app inclusion controls which application can use the VPN; `AllowedIPs` still controls which of that application's destinations use it.

## Device acceptance checks

These checks require a physical Android device or emulator and a real test WireGuard/Mattermost deployment:

- Import a known test `.conf`, grant Android VPN permission, and confirm the system key icon appears.
- Confirm the app does not continue to server/login routing before a verified handshake and nonzero received-byte count.
- Confirm the Mattermost server loads and login succeeds only while the required tunnel is connected.
- Disconnect and confirm normal app routing is blocked again; reconnect and replace the configuration; remove it and confirm saved-state reconnection no longer occurs.
- Confirm another application's traffic is not captured by this per-app tunnel.
- On the WireGuard/Mattermost infrastructure, correlate packet captures or connection logs with the device test to verify that Mattermost HTTPS traffic actually traverses the intended tunnel path. Check the direct/public path is rejected when VPN-only access is required.

## Verification boundary

Repository unit tests and Android compilation do not exercise Android VPN permission, WireGuard negotiation, real packet routing, or Mattermost reachability. Those device and infrastructure checks remain necessary before Phase 2 can be considered operationally verified.
