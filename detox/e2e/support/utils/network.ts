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
 *   (tuist/tuist#11425: "cannot define table … Resource busy"). The attachment
 *   point matters as much as the rules: see PFCTL_ANCHOR below.
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
 *   check catches that bypass and fails the run. It must query BOTH address
 *   families: a bare curl picks IPv4, and an IPv4-only view of reachability once
 *   reported "offline" while the app posted successfully over IPv6 (status 201).
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

// pf evaluates an anchor only when a loaded ruleset contains an anchor rule that
// reaches it (pf.conf(5): "When evaluation of the main ruleset reaches an anchor
// rule, packet filter will proceed to evaluate all rules specified in that
// anchor"). macOS's stock /etc/pf.conf main ruleset carries exactly one filter
// anchor rule — `anchor "com.apple/*"` — and the trailing `/*` "will only
// evaluate anchors that are directly attached to the [com.apple] anchor, and
// will not descend to evaluate anchors recursively".
//
// An anchor attached to the main ruleset instead (the old
// 'com.mattermost.e2e.offline') is therefore never reached: pfctl loads the
// rules, `pfctl -a <anchor> -s rules` prints them, and the kernel never
// evaluates a single one. That — not Cloudflare rotation — is why MM-T416
// failed on every iOS run with the same four edge IPs and the rotation branch
// in goOfflineIos never fired: curl kept connecting to IPs we had "blocked".
//
// Attaching directly under com.apple/ puts the ruleset on the one evaluated
// path. The 000. prefix sorts it ahead of Apple's own 200.AirDrop and
// 250.ApplicationFirewall (children are evaluated in alphabetical order), so
// our `block ... quick` is reached before any of their rules can match first.
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

// The pf block is a table of resolved addresses, so it can only work if the set the
// app dials is stable and enumerable. Cloudflare hands the E2E hostnames a different
// AAAA on nearly every lookup (measured: five lookups, four distinct addresses, e.g.
// 2606:4700:83b2:7ab5:879e:0:94bb:d53c then 2606:4700:90d2:7ab5:87c5:0:94bb:d53c),
// while the A records stay put. The app therefore resolves an IPv6 address that was
// never in our table and connects straight past the block. Covering that would mean
// blocking 2606:4700::/32 -- all of Cloudflare -- which the scoping rules above
// forbid outright, since registry.npmjs.org sits behind the same range.
//
// So detect it and skip loudly instead of pretending to be offline. Sync on purpose:
// the caller gates a `describe` at module load and cannot await. A missing `dig`, or
// any lookup failure, is treated as "cannot pin" -- refusing costs a skipped test,
// while a wrong "available" silently runs the suite against a live server.
// Cloudflare's IPv6 space. Every rotating address observed for the E2E hosts has
// fallen inside it, and the A records that sit alongside them (104.18.x) are
// Cloudflare too, so an AAAA in this range means the edge is anycast and the
// address the app dials cannot be enumerated ahead of time.
const CLOUDFLARE_IPV6_PREFIX = '2606:4700:';

const hasPinnableIpv6 = (hostname: string): boolean => {
    let records: string[];
    try {
        records = run(`dig +short AAAA ${hostname}`).
            split('\n').
            map((line) => line.trim().toLowerCase()).
            filter(Boolean);
    } catch {
        // No dig, or the lookup failed. Refusing costs a skipped test; guessing
        // "available" runs the suite against a server we never disconnected.
        return false;
    }

    // No AAAA at all: the app can only use IPv4, which the A-record block covers.
    if (!records.length) {
        return true;
    }

    // Deterministic on purpose. The first version of this sampled two lookups and
    // called the host pinnable when they matched — but rotation is probabilistic,
    // and repeated lookups of the same host return duplicates often enough that
    // the check passed on CI while failing locally (run 34146969443: MM-T416 ran
    // instead of skipping, then failed exactly as it had before). Whether an
    // address is inside Cloudflare's range does not depend on which sample we drew.
    return !records.some((record) => record.startsWith(CLOUDFLARE_IPV6_PREFIX));
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
    if (!hasPinnableIpv6(hostname)) {
        logDebug(`[network] iOS offline unavailable: ${hostname} is served from Cloudflare's anycast IPv6 range, which hands out a different AAAA per lookup, so a pf table of resolved IPs cannot cover the address the app dials — it reaches the server over IPv6 while the block only holds the addresses we happened to resolve. Android keeps this coverage: airplane mode is a genuine offline and does not depend on enumerating IPs.`);
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
