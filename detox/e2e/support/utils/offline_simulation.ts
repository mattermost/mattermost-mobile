// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Offline simulation for the pending-posts specs.
 *
 * The app's requests must genuinely fail: device.setURLBlacklist only hides traffic
 * from Detox's synchronisation, so the request still completes and the post is never
 * marked failed. The mechanism must also be device-local, because CI runners are
 * shared and anything host-wide would cut the network out from under parallel jobs.
 *
 * - Android: airplane mode via adb. Emulator-local, kills routing outright, and never
 *   has to enumerate the server's addresses. This is the only supported platform.
 * - iOS: refused. isNetworkControlAvailable() always returns false and gated suites
 *   skip loudly. See IOS_OFFLINE_UNSUPPORTED_REASON below for why the pf machinery,
 *   though correct and device-verified, cannot pin a Cloudflare anycast edge.
 *
 * Scoping rules (load-bearing): block only the resolved IPs of the test server host,
 * never CDN ranges (npm is Cloudflare-fronted too) and never extra ports. Loopback is
 * refused on iOS, since blocking lo0 would also kill the app-to-Detox sync channel.
 *
 * pf specifics: TCP uses `block return-rst` so connections fail instantly like
 * airplane mode does, rather than hanging until a connect timeout. UDP/443 uses
 * `block drop` because the servers advertise h3 and the app honours HTTP/3. The
 * anchor is loaded directly, never by reloading /etc/pf.conf, which collides with the
 * system ruleset.
 *
 * Never green-because-broken: goOffline() polls until the server is actually
 * unreachable and throws otherwise, goOnline() polls until it is back. No fixed sleeps.
 */
import {execSync} from 'child_process';
import {promises as dnsPromises} from 'dns';
import {mkdtempSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import * as path from 'path';

import {device} from 'detox';

import {logDebug} from '../../../provision/log';

// Local constants instead of importing from ./index (the barrel re-exports this
// module — importing back would create a load-order-sensitive cycle).
const POLL_INTERVAL_MS = 1000;

// goOffline must fail fast: the block is either working within seconds or the test
// must stop with a clear error rather than burn the whole test timeout.
const OFFLINE_VERIFY_TIMEOUT_MS = 10_000;

// Restoration can legitimately take a few seconds (pf unload, Wi-Fi/airplane
// re-establishment, Cloudflare routing) — poll instead of sleeping a fixed amount.
const ONLINE_VERIFY_TIMEOUT_MS = 30_000;

const wait = async (ms: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
};

// macOS's stock /etc/pf.conf carries a single filter anchor rule, `anchor "com.apple/*"`,
// and the trailing /* does not descend recursively. An anchor attached anywhere else
// loads and is never evaluated: `pfctl -a <anchor> -s rules` prints the rules and the
// kernel ignores every one of them. The 000. prefix sorts ahead of Apple's own children
// (evaluated alphabetically) so our `block ... quick` is reached first.
const PFCTL_ANCHOR = 'com.apple/000.mattermostE2E';

// Harness state so goOnline() can restore exactly what goOffline() changed, and so
// goOnline() is a safe no-op when the suite never went offline (e.g. beforeAll failed).
let pfWasEnabled: boolean | null = null;
let pfEnabledByUs = false;
let pfAnchorLoaded = false;
let detoxSyncDisabled = false;
let resolvedServerIps: string[] = [];

const run = (cmd: string): string => {
    return execSync(cmd, {stdio: 'pipe'}).toString();
};

const tryRun = (cmd: string): boolean => {
    try {
        execSync(cmd, {stdio: 'pipe'});
        return true;
    } catch {
        return false;
    }
};

// iOS offline is refused outright rather than probed. The block works from a table of
// resolved addresses, but the Cloudflare-fronted servers answer AAAA from anycast with a
// different address on nearly every lookup (twelve lookups, four addresses on the CI
// host), so the app dials one that was never in the table: on run 34146969443 the
// "offline" post came back 201. Covering it would mean blocking 2606:4700::/32, all of
// Cloudflare, which the scoping rules above forbid.
//
// Do not replace this with detection. Comparing two AAAA lookups fails because rotation
// is probabilistic; testing for a Cloudflare prefix fails when the resolver returns no
// AAAA at all and reads as "IPv4 only". Both can wrongly report available.
const IOS_OFFLINE_UNSUPPORTED_REASON =
    'the E2E servers are Cloudflare-fronted and answer AAAA from anycast space with a ' +
    'different address per lookup, so a pf table of resolved IPs cannot cover the address ' +
    'the app dials (run 34146969443: the "offline" post returned 201). Android keeps this ' +
    'coverage via airplane mode, which does not depend on enumerating IPs.';

const resolveHost = async (serverUrl: string): Promise<{hostname: string; port: string}> => {
    const parsed = new URL(serverUrl);
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    return {hostname: parsed.hostname, port};
};

const resolveServerIps = async (hostname: string): Promise<string[]> => {
    const [v4, v6] = await Promise.all([
        dnsPromises.resolve4(hostname).catch(() => [] as string[]),
        dnsPromises.resolve6(hostname).catch(() => [] as string[]),
    ]);
    if (!v6.length) {
        logDebug(`[network] no AAAA record for ${hostname} — blocking IPv4 only`);
    }
    return [...v4, ...v6];
};

// Both address families, because the app and a bare curl do not agree on which to
// use. curl picks IPv4; the app dialled native IPv6 + QUIC. With only the A records
// blocked, the IPv4 probe failed, this returned false, goOffline reported success --
// and the "offline" post came back 201 (local repro of CI MM-T416). Reachable means
// reachable by ANY path, so both probes must fail before we call the device offline.
//
// Caveat: the system curl has no HTTP/3 support, so this cannot exercise the app's
// QUIC path directly. It catches the family difference, which was the actual leak.
const hostCanReachServer = (serverUrl: string): boolean => {
    const {origin} = new URL(serverUrl);
    const ping = (family: string) => tryRun(`curl ${family} -sS --max-time 2 -o /dev/null ${origin}/api/v4/system/ping`);
    return ping('-4') || ping('-6');
};

/** IP curl actually connected to, or empty when the request failed. */
const hostReachableServerIp = (serverUrl: string): string => {
    const {origin} = new URL(serverUrl);
    try {
        return run(`curl -sS --max-time 2 -o /dev/null -w '%{remote_ip}' ${origin}/api/v4/system/ping`).trim();
    } catch {
        return '';
    }
};

const loadOfflinePfAnchor = (ips: string[], port: string): void => {
    const rulesDir = mkdtempSync(path.join(tmpdir(), 'mm-e2e-pf-'));
    const rulesFile = path.join(rulesDir, 'offline.conf');
    const table = ips.join(' ');
    writeFileSync(rulesFile, [
        `table <mm_e2e_blocked> persist { ${table} }`,
        `block return-rst out quick proto tcp to <mm_e2e_blocked> port ${port}`,
        `block drop out quick proto udp to <mm_e2e_blocked> port ${port}`,
        '',
    ].join('\n'));
    run(`sudo -n pfctl -a ${PFCTL_ANCHOR} -f ${rulesFile}`);
};

// An ineffective block is indistinguishable from a rotating edge IP in the error
// message alone — MM-T416 burned three CI runs on that ambiguity. Dump the state
// that tells them apart: whether pf is enabled, whether the main ruleset still
// carries the `anchor "com.apple/*"` rule our anchor hangs off, and whether our
// rules and table actually made it into the kernel.
const pfDiagnostics = (): string => {
    const dump = (label: string, cmd: string): string => {
        try {
            return `--- ${label}\n${run(cmd).trim()}`;
        } catch (error) {
            return `--- ${label}\n<failed: ${(error as Error).message}>`;
        }
    };
    return [
        dump('pfctl -s info', 'sudo -n pfctl -s info'),
        dump('main ruleset (must contain an anchor rule reaching com.apple)', 'sudo -n pfctl -s rules'),
        dump(`anchor ${PFCTL_ANCHOR} rules`, `sudo -n pfctl -a ${PFCTL_ANCHOR} -s rules`),
        dump(`anchor ${PFCTL_ANCHOR} table <mm_e2e_blocked>`, `sudo -n pfctl -a ${PFCTL_ANCHOR} -t mm_e2e_blocked -T show`),
    ].join('\n');
};

const emulatorCanReachIp = (ip: string): boolean => {
    return tryRun(`adb shell ping -c 1 -W 2 ${ip}`);
};

// TCP reachability from inside the emulator to the server HOST (toybox nc: exit 0
// on connect, nonzero on failure — verified on the API 35 image). Hostname-based,
// not per-IP: nc resolves fresh inside the emulator and picks whichever family works,
// mirroring the app — per-IP checks over the full A+AAAA set always fail because the
// emulator has no IPv6 route (verified: v4 exit 0, v6 Timeout), and hostname checks
// also catch Cloudflare rotation handing the app an edge IP we did not test.
const emulatorCanTcpReachHost = (hostname: string, port: string): boolean => {
    return tryRun(`adb shell "echo | nc -w 2 ${hostname} ${port}"`);
};

/* eslint-disable no-await-in-loop -- polling loops are the point here */
const pollUntil = async (check: () => boolean | Promise<boolean>, timeoutMs: number, failureMessage: string) => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        if (await check()) {
            return;
        }
        await wait(POLL_INTERVAL_MS);
    }
    throw new Error(failureMessage);
};
/* eslint-enable no-await-in-loop */

/**
 * Whether this machine can genuinely take the device offline for the given server URL.
 * The reason is printed when unavailable — the suite gates on this instead of silently
 * passing (see the spec's describe.skip).
 */
export const isNetworkControlAvailable = (serverUrl: string): boolean => {
    if (device.getPlatform() === 'android') {
        try {
            // `adb devices` exits 0 even with an empty list. Later airplane-mode
            // commands need a row whose state is exactly "device".
            const output = run('adb devices');
            if (/(?:^|\r?\n)[^\s]+\tdevice(?:\r?\n|$)/.test(output)) {
                return true;
            }
            logDebug('[network] Android offline unavailable: no connected device in `adb devices`');
            return false;
        } catch {
            logDebug('[network] Android offline unavailable: adb devices failed');
            return false;
        }
    }

    // iOS — always unavailable. The pfctl / sudo / loopback probes that used to
    // gate this are gone on purpose: every one of them could pass while the block
    // still failed to cover the address the app dialled, and a partial probe that
    // sometimes says "available" is how MM-T416 ran on CI after being made to skip
    // locally. See IOS_OFFLINE_UNSUPPORTED_REASON.
    let hostname = serverUrl;
    try {
        ({hostname} = new URL(serverUrl));
    } catch {
        // Keep the raw value for the log line; it is only used for the message.
    }
    logDebug(`[network] iOS offline unavailable for ${hostname}: ${IOS_OFFLINE_UNSUPPORTED_REASON}`);
    return false;
};

// ICMP canary for emulator reachability. The E2E servers are Cloudflare-fronted and
// Cloudflare edge IPs do not answer ICMP echo — pinging the server itself is both
// vacuous as an offline check and permanently failing as an online check (verified
// empirically). Airplane mode is all-or-nothing, so any internet canary proves it;
// 8.8.8.8 reliably answers ping from the emulator.
const PING_CANARY_IP = '8.8.8.8';

const goOfflineAndroid = async () => {
    execSync('adb shell cmd connectivity airplane-mode enable');
    await pollUntil(
        () => !emulatorCanReachIp(PING_CANARY_IP),
        OFFLINE_VERIFY_TIMEOUT_MS,
        `airplane mode did not make the internet unreachable from the emulator within ${OFFLINE_VERIFY_TIMEOUT_MS}ms`,
    );
};

const goOnlineAndroid = async (serverUrl: string) => {
    execSync('adb shell cmd connectivity airplane-mode disable');

    // Restore verification targets the server, not the canary: the post re-send
    // needs the server reachable from the emulator, and only that proves it.
    const {hostname, port} = await resolveHost(serverUrl);
    await pollUntil(
        () => emulatorCanTcpReachHost(hostname, port),
        ONLINE_VERIFY_TIMEOUT_MS,
        `airplane mode was disabled but the server is still unreachable from the emulator after ${ONLINE_VERIFY_TIMEOUT_MS}ms`,
    );
};

const goOfflineIos = async (serverUrl: string, ips: string[], port: string) => {
    const {hostname} = new URL(serverUrl);
    const blocked = new Set(ips);

    pfWasEnabled = run('sudo -n pfctl -s info').includes('Status: Enabled');
    if (!pfWasEnabled) {
        run('sudo -n pfctl -E');
        pfEnabledByUs = true;
    }

    const reloadAnchor = () => {
        loadOfflinePfAnchor([...blocked], port);
        pfAnchorLoaded = true;
        for (const ip of blocked) {
            tryRun(`sudo -n pfctl -k 0.0.0.0/0 -k ${ip}`);
        }
    };

    reloadAnchor();

    // The message is built after the poll, not passed into it: the argument to
    // pollUntil is evaluated before polling starts, so the old message always
    // printed the pre-rotation IP set and hid whether the set had grown.
    let lastReachableIp = '';
    try {
        await pollUntil(
            async () => {
                if (!hostCanReachServer(serverUrl)) {
                    return true;
                }

                // Cloudflare can hand curl a different edge IP than the A/AAAA set we
                // blocked (CI 33877432724 MM-T416). Add that IP and any newly resolved
                // records, then keep polling within the same 10s budget.
                const extra = hostReachableServerIp(serverUrl);
                lastReachableIp = extra || lastReachableIp;
                const fresh = hostname.match(/^[0-9a-fA-F:.]+$/) ? [] : await resolveServerIps(hostname);
                let added = false;
                for (const ip of [...fresh, extra]) {
                    if (ip && !blocked.has(ip)) {
                        blocked.add(ip);
                        added = true;
                    }
                }
                if (added) {
                    resolvedServerIps = [...blocked];
                    reloadAnchor();
                    logDebug(`[network] pfctl table now has ${blocked.size} edge IPs after rotation`);
                }
                return false;
            },
            OFFLINE_VERIFY_TIMEOUT_MS,
            'offline block ineffective',
        );
    } catch {
        // An already-blocked reachable IP means the ruleset is not being evaluated;
        // a new IP each poll means the edge is rotating faster than we can block it.
        // The diagnostics below say which, so this never costs another CI round trip.
        const stillBlocked = lastReachableIp && blocked.has(lastReachableIp);
        throw new Error(
            `pfctl block on [${[...blocked].join(', ')}] port ${port} did not make the server unreachable ` +
            `within ${OFFLINE_VERIFY_TIMEOUT_MS}ms — refusing to continue (a silent block failure would let ` +
            'the post succeed and the test would fail as designed). curl last reached ' +
            `${lastReachableIp || '<unknown>'}, which is ${stillBlocked ? 'IN' : 'NOT in'} the blocked set.\n` +
            `pf state at failure:\n${pfDiagnostics()}`,
        );
    }
};

const goOnlineIos = async (serverUrl: string) => {
    if (pfAnchorLoaded) {
        run(`sudo -n pfctl -a ${PFCTL_ANCHOR} -F all`);
        pfAnchorLoaded = false;
    }

    // Restore pf itself even when the anchor never finished loading (e.g. the
    // anchor command failed after pfctl -E succeeded) — goOnline must not leave
    // the host's firewall state modified by a failed attempt.
    if (pfEnabledByUs) {
        run('sudo -n pfctl -d');
        pfEnabledByUs = false;
    }
    await pollUntil(
        () => hostCanReachServer(serverUrl),
        ONLINE_VERIFY_TIMEOUT_MS,
        `pf rules were flushed but the server is still unreachable after ${ONLINE_VERIFY_TIMEOUT_MS}ms`,
    );
};

/**
 * Take the device genuinely offline for serverUrl. Polls until the server is
 * unreachable and throws otherwise — never proceeds on a block that may not exist.
 * Detox synchronization is disabled while offline: the dropped WebSocket keeps
 * reconnecting and would otherwise keep Detox's synchronization busy forever.
 */
export const goOffline = async (serverUrl: string): Promise<void> => {
    const {hostname, port} = await resolveHost(serverUrl);
    const isRawIp = Boolean(hostname.match(/^[0-9a-fA-F:.]+$/));
    resolvedServerIps = isRawIp ? [hostname] : await resolveServerIps(hostname);

    // iOS needs the server's IPs for the pf block; Android does not (airplane mode is
    // not per-IP), but resolving either way keeps the availability probe and the error
    // paths identical on both platforms.
    if (!isRawIp && !resolvedServerIps.length) {
        throw new Error(`could not resolve any IP for ${hostname} — cannot build the offline block`);
    }

    await device.disableSynchronization();
    detoxSyncDisabled = true;

    if (device.getPlatform() === 'android') {
        await goOfflineAndroid();
    } else {
        await goOfflineIos(serverUrl, resolvedServerIps, port);
    }
};

/**
 * Restore connectivity and Detox synchronization. Polls until the server is
 * reachable again and throws otherwise. Safe to call even if goOffline never ran.
 */
export const goOnline = async (serverUrl: string): Promise<void> => {
    try {
        if (device.getPlatform() === 'android') {
            if (resolvedServerIps.length) {
                await goOnlineAndroid(serverUrl);
            }
        } else {
            await goOnlineIos(serverUrl);
        }
    } finally {
        if (detoxSyncDisabled) {
            await device.enableSynchronization();
            detoxSyncDisabled = false;
        }
    }
};
