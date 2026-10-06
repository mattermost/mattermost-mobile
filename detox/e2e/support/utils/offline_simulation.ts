// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {execSync} from 'child_process';
import {promises as dnsPromises} from 'dns';
import {mkdtempSync, writeFileSync} from 'fs';
import {tmpdir} from 'os';
import * as path from 'path';

import {device} from 'detox';

import {logDebug} from '../../../provision/log';

const POLL_INTERVAL_MS = 1000;
const OFFLINE_VERIFY_TIMEOUT_MS = 10_000;
const ONLINE_VERIFY_TIMEOUT_MS = 30_000;
const wait = async (ms: number): Promise<void> => {
    await new Promise((resolve) => setTimeout(resolve, ms));
};
const PFCTL_ANCHOR = 'com.apple/000.mattermostE2E';

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

    let hostname = serverUrl;
    try {
        ({hostname} = new URL(serverUrl));
    } catch {
        // Keep the raw value for the log line; it is only used for the message.
    }
    logDebug(`[network] iOS offline unavailable for ${hostname}: ${IOS_OFFLINE_UNSUPPORTED_REASON}`);
    return false;
};

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

    let lastReachableIp = '';
    try {
        await pollUntil(
            async () => {
                if (!hostCanReachServer(serverUrl)) {
                    return true;
                }

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
