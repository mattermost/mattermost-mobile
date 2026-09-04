// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Network harness for genuine offline simulation.
 *
 * The app's requests must actually fail — a mechanism that only hides traffic from
 * Detox (device.setURLBlacklist) does not mark a post as failed (verified empirically:
 * the request hangs and eventually completes). The mechanism must also be local to the
 * device under test: CI runners are shared, so nothing that affects other machines or
 * parallel workers is allowed.
 *
 * - Android: airplane mode via adb — emulator-local, works on CI's Ubuntu runners.
 * - iOS: the simulator shares the host's network with no per-simulator control, so the
 *   host blocks the test server itself through a pfctl anchor scoped to the server's
 *   resolved IPs and port. GitHub-hosted macOS runners have passwordless sudo (per
 *   GitHub's runner docs) and each Detox iOS shard runs on its own runner VM, so the
 *   block cannot reach other shards. Requires root: probed non-interactively with
 *   `sudo -n`; unavailable hosts skip loudly with the reason printed at runtime.
 *
 * Scoping rules (load-bearing):
 * - ONLY the resolved IPs of the test server host are blocked — never CDN ranges
 *   (registry.npmjs.org is Cloudflare-fronted like the test server) and never more
 *   ports than the server's own.
 * - Loopback targets are refused on iOS: blocking lo0 would also kill the app<->Detox
 *   sync channel, which runs on localhost.
 *
 * pf rule specifics:
 * - TCP uses `block return-rst` so connections fail instantly (connection-refused), the
 *   same fast failure airplane mode produces — a silent drop would leave the app's
 *   post hanging until a connect timeout instead of failing.
 * - UDP/443 uses `block drop`: the E2E servers advertise `alt-svc: h3=":443"` (verified
 *   live) and the app honours HTTP/3, so a TCP-only block would leave the QUIC path open.
 * - The anchor is loaded directly (`pfctl -a <anchor> -f <file>`), never by reloading
 *   /etc/pf.conf — that collides with the system-managed ruleset on live hosts
 *   (tuist/tuist#11425: "cannot define table … Resource busy").
 *
 * Design property — never green-because-broken: goOffline() polls until the server is
 * genuinely unreachable and throws otherwise, and goOnline() polls until connectivity
 * is restored and throws otherwise. If the block silently failed, the post would
 * succeed and the test would fail at the failed-indicator assertion; the poll makes
 * that failure loud and immediate instead. No fixed sleeps.
 *
 * Verification is platform-split and must stay that way:
 * - Android offline: an internet ICMP canary (8.8.8.8) — airplane mode kills all
 *   routing, and the server's Cloudflare edge does not answer ICMP (verified), so
 *   the canary is the only honest "everything is down" signal from the emulator.
 * - iOS offline: the server itself over TCP — the pf block is scoped to the server's
 *   IPs only, so an internet canary stays reachable BY DESIGN and must never be
 *   consulted on iOS. The check is hostname-based curl rather than a per-IP connect:
 *   if Cloudflare rotation hands the app a different edge IP than the ones blocked,
 *   a per-IP check would pass while the app's request still succeeds — the hostname
 *   check catches that bypass and fails the run.
 * - Both platforms online: the server itself (Android: TCP connect from the emulator
 *   via nc; iOS: curl from the host), never the canary.
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

const PFCTL_ANCHOR = 'com.mattermost.e2e.offline';

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

const isLoopbackHost = (hostname: string): boolean => {
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '10.0.2.2';
};

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

const hostCanReachServer = (serverUrl: string): boolean => {
    const {origin} = new URL(serverUrl);
    return tryRun(`curl -sS --max-time 2 -o /dev/null ${origin}/api/v4/system/ping`);
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

    // iOS — pfctl anchor path.
    if (!tryRun('which pfctl')) {
        logDebug('[network] iOS offline unavailable: pfctl not found');
        return false;
    }

    // Non-interactive sudo: CI macOS runners have passwordless sudo; local Macs
    // without it cannot load pf rules and must not hang on a password prompt.
    if (!tryRun('sudo -n true')) {
        logDebug('[network] iOS offline unavailable: passwordless sudo not available (required for pfctl)');
        return false;
    }
    let hostname = '';
    try {
        ({hostname} = new URL(serverUrl));
    } catch {
        hostname = '';
    }
    if (!hostname || isLoopbackHost(hostname)) {
        logDebug(`[network] iOS offline unavailable: server hostname (${hostname || '<unparseable>'}) is not a remotely routed host (loopback targets are refused: blocking lo0 would also kill the app<->Detox sync channel)`);
        return false;
    }
    return true;
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
    const rulesDir = mkdtempSync(path.join(tmpdir(), 'mm-e2e-pf-'));
    const rulesFile = path.join(rulesDir, 'offline.conf');
    const table = ips.join(' ');
    writeFileSync(rulesFile, [
        `table <mm_e2e_blocked> persist { ${table} }`,

        // Instant failure for new TCP connections — same fast error airplane mode produces.
        `block return-rst out quick proto tcp to <mm_e2e_blocked> port ${port}`,

        // HTTP/3 path: the server advertises alt-svc h3 and the app honours it.
        `block drop out quick proto udp to <mm_e2e_blocked> port ${port}`,
        '',
    ].join('\n'));

    // Capture pf's prior state so goOnline() restores it exactly.
    pfWasEnabled = run('sudo -n pfctl -s info').includes('Status: Enabled');
    if (!pfWasEnabled) {
        run('sudo -n pfctl -E');
        pfEnabledByUs = true;
    }

    // Load the anchor directly — never `pfctl -f /etc/pf.conf` (collides with the
    // system ruleset on live hosts; see file header).
    run(`sudo -n pfctl -a ${PFCTL_ANCHOR} -f ${rulesFile}`);
    pfAnchorLoaded = true;

    // Best-effort: kill pre-existing pf states to the server so an established
    // WebSocket dies too. Non-fatal — the unreachable poll below is the real gate.
    for (const ip of ips) {
        tryRun(`sudo -n pfctl -k 0.0.0.0/0 -k ${ip}`);
    }

    await pollUntil(
        () => !hostCanReachServer(serverUrl),
        OFFLINE_VERIFY_TIMEOUT_MS,
        `pfctl block on ${table}:${port} did not make the server unreachable within ${OFFLINE_VERIFY_TIMEOUT_MS}ms — refusing to continue (a silent block failure would let the post succeed and the test would fail as designed)`,
    );
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
