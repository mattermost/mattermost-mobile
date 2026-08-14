// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env */

/**
 * Disable Simulator password AutoFill / Save Password for E2E.
 *
 * Writes restriction keys across ConfigurationProfiles + UserConfigurationProfiles
 * plists and WebUI / Passwords preference domains. ConfigurationProfiles must be
 * edited while the simulator is shut down; re-run after boot (or --seed-defaults)
 * if EffectiveUserSettings is reset on first boot.
 */

const os = require('os');
const path = require('path');

const shell = require('shelljs');

const args = process.argv.slice(2);
let simulatorId = null;
let seedDefaultsOnly = false;

for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--simulator-id' || args[i] === '-s') && args[i + 1]) {
        simulatorId = args[i + 1];
    }
    if (args[i] === '--seed-defaults') {
        seedDefaultsOnly = true;
    }
}

function getSimulators() {
    const result = shell.exec('xcrun simctl list devices', {silent: true});

    if (result.code !== 0) {
        console.error('Error: Failed to list iOS simulators');
        console.error('Make sure Xcode is installed and xcrun is available');
        process.exit(1);
    }

    const simulators = [];
    const lines = result.stdout.split('\n');
    let currentOS = '';

    for (const line of lines) {
        const osMatch = line.match(/-- (iOS [0-9.]+) --/);
        if (osMatch) {
            currentOS = osMatch[1];
            continue;
        }

        const simMatch = line.match(/^\s+(.+?)\s+\(([A-F0-9-]{36})\)\s+\((Booted|Shutdown|Creating|Booting)\)/);
        if (simMatch && currentOS) {
            simulators.push({
                name: simMatch[1],
                udid: simMatch[2],
                state: simMatch[3],
                os: currentOS,
            });
        }
    }

    return simulators;
}

function deviceDataRoot(udid) {
    return path.join(os.homedir(), 'Library/Developer/CoreSimulator/Devices', udid, 'data');
}

/**
 * Restriction keys Settings → Passwords → AutoFill Passwords writes.
 * allowPasswordAutoFill=NO is the primary kill switch for credential UI on
 * older iOS; on iOS 18+/26 we still write it plus every Effective* mirror and
 * Passwords defaults because SharedWebCredentialViewService ignores a single
 * plist when the others still say YES.
 */
const RESTRICTION_KEYS = [
    {
        path: 'restrictedBool.allowPasswordAutoFill.value',
        type: 'bool',
        value: 'NO',
        description: 'allowPasswordAutoFill',
    },
    {
        path: 'restrictedBool.allowCloudKeychainSync.value',
        type: 'bool',
        value: 'NO',
        description: 'allowCloudKeychainSync',
    },
    {
        path: 'restrictedBool.allowPasswordSharing.value',
        type: 'bool',
        value: 'NO',
        description: 'allowPasswordSharing',
    },
    {
        path: 'restrictedBool.allowPasswordProximityRequests.value',
        type: 'bool',
        value: 'NO',
        description: 'allowPasswordProximityRequests',
    },
];

function ensurePlist(plistPath) {
    const dir = path.dirname(plistPath);
    shell.mkdir('-p', dir);
    if (!shell.test('-f', plistPath)) {
        const created = shell.exec(`plutil -create xml1 "${plistPath}"`, {silent: true});
        if (created.code !== 0) {
            console.error(`Error: Failed to create ${plistPath}`);
            console.error(created.stderr);
            return false;
        }
    }
    return true;
}

function setPlistKey(plistPath, key) {
    let result = shell.exec(
        `plutil -replace ${key.path} -${key.type} ${key.value} "${plistPath}"`,
        {silent: true},
    );
    if (result.code === 0) {
        return true;
    }

    const pathParts = key.path.split('.');
    const rootKey = pathParts[0];
    const middleKey = pathParts[1];

    const checkRoot = shell.exec(
        `plutil -extract ${rootKey} xml1 -o - "${plistPath}" 2>/dev/null`,
        {silent: true},
    );
    if (checkRoot.code !== 0) {
        result = shell.exec(`plutil -insert ${rootKey} -dictionary "${plistPath}"`, {silent: true});
        if (result.code !== 0) {
            return false;
        }
    }

    const checkMiddle = shell.exec(
        `plutil -extract ${rootKey}.${middleKey} xml1 -o - "${plistPath}" 2>/dev/null`,
        {silent: true},
    );
    if (checkMiddle.code !== 0) {
        result = shell.exec(
            `plutil -insert ${rootKey}.${middleKey} -dictionary "${plistPath}"`,
            {silent: true},
        );
        if (result.code !== 0) {
            return false;
        }
    }

    const checkValue = shell.exec(
        `plutil -extract ${key.path} xml1 -o - "${plistPath}" 2>/dev/null`,
        {silent: true},
    );
    const op = checkValue.code === 0 ? 'replace' : 'insert';
    result = shell.exec(
        `plutil -${op} ${key.path} -${key.type} ${key.value} "${plistPath}"`,
        {silent: true},
    );
    return result.code === 0;
}

function verifyPlistKey(plistPath, key) {
    const checkResult = shell.exec(
        `plutil -extract ${key.path} raw -o - "${plistPath}" 2>/dev/null`,
        {silent: true},
    );
    if (checkResult.code !== 0) {
        return false;
    }
    const raw = String(checkResult.stdout).trim().toLowerCase();
    return raw === 'false' || raw === '0' || raw === 'no';
}

function restrictionPlistPaths(udid) {
    const root = deviceDataRoot(udid);
    return [
        path.join(
            root,
            'Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles/UserSettings.plist',
        ),
        path.join(
            root,
            'Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles/EffectiveUserSettings.plist',
        ),

        // Settings.app toggle also writes these Library mirrors — missing them
        // leaves CoreRestrictions reading allowPasswordAutoFill=YES.
        path.join(root, 'Library/UserConfigurationProfiles/EffectiveUserSettings.plist'),
        path.join(root, 'Library/UserConfigurationProfiles/PublicInfo/PublicEffectiveUserSettings.plist'),
    ];
}

function writeRestrictionPlists(udid) {
    console.log(`\nWriting password restriction plists for ${udid}...`);
    let wrote = 0;
    let verified = 0;

    for (const plistPath of restrictionPlistPaths(udid)) {
        console.log(`\n→ ${plistPath}`);
        if (!ensurePlist(plistPath)) {
            continue;
        }
        for (const key of RESTRICTION_KEYS) {
            if (setPlistKey(plistPath, key)) {
                wrote += 1;
                if (verifyPlistKey(plistPath, key)) {
                    console.log(`  ✓ ${key.description}=NO`);
                    verified += 1;
                } else {
                    console.log(`  ⚠️  ${key.description} written but verify failed`);
                }
            } else {
                console.log(`  ⚠️  failed to set ${key.description}`);
            }
        }
    }

    // WebUI AutoFillPasswords (Safari / credential UI preference domain).
    const webUiPlist = path.join(deviceDataRoot(udid), 'Library/Preferences/com.apple.WebUI.plist');
    console.log(`\n→ ${webUiPlist}`);
    if (ensurePlist(webUiPlist)) {
        const webKey = {path: 'AutoFillPasswords', type: 'bool', value: 'NO', description: 'AutoFillPasswords'};
        if (setPlistKey(webUiPlist, webKey) && verifyPlistKey(webUiPlist, webKey)) {
            console.log('  ✓ AutoFillPasswords=NO');
            wrote += 1;
            verified += 1;
        } else {
            console.log('  ⚠️  failed to set AutoFillPasswords');
        }
    }

    const expected = (restrictionPlistPaths(udid).length * RESTRICTION_KEYS.length) + 1;
    console.log(`\nRestriction write summary: ${verified}/${expected} keys verified (attempts=${wrote})`);

    // Require the primary allowPasswordAutoFill key on UserSettings + both Library mirrors.
    const critical = [
        restrictionPlistPaths(udid)[0],
        restrictionPlistPaths(udid)[2],
        restrictionPlistPaths(udid)[3],
    ];
    const primary = RESTRICTION_KEYS[0];
    const criticalOk = critical.every((p) => shell.test('-f', p) && verifyPlistKey(p, primary));
    if (!criticalOk) {
        console.error('❌ Critical allowPasswordAutoFill=NO not verified on all primary plists');
        return false;
    }
    console.log('✅ Critical allowPasswordAutoFill=NO verified on UserSettings + Library Effective mirrors');
    return true;
}

/**
 * Preference-domain seeds that must run against a *booted* simulator.
 * Best-effort: unknown keys are ignored by the OS.
 */
function seedPasswordDefaults(udid) {
    console.log(`\nSeeding Passwords / SpringBoard defaults on booted sim ${udid}...`);
    const writes = [
        ['com.apple.Passwords', 'AutoFill', 'NO'],
        ['com.apple.Passwords', 'AutoSave', 'NO'],
        ['com.apple.Passwords', 'credentialSaveNotificationsEnabled', 'NO'],
        ['com.apple.Passwords', 'PasswordAutoFill', 'NO'],
        ['com.apple.Passwords', 'AutoFillPasswords', 'NO'],
        ['com.apple.springboard', 'AutoFillPasswords', 'NO'],
        ['com.apple.WebUI', 'AutoFillPasswords', 'NO'],
        ['com.apple.Preferences', 'PasswordAutoFill', 'NO'],
    ];

    let ok = 0;
    for (const [domain, key, value] of writes) {
        const result = shell.exec(
            `xcrun simctl spawn "${udid}" defaults write ${domain} ${key} -bool ${value}`,
            {silent: true},
        );
        if (result.code === 0) {
            ok += 1;
            console.log(`  ✓ ${domain} ${key}=${value}`);
        } else {
            console.log(`  ⚠️  ${domain} ${key} (ignored)`);
        }
    }
    console.log(`Defaults seed: ${ok}/${writes.length} succeeded`);
    return ok > 0;
}

function resolveSimulator() {
    const simulators = getSimulators();
    if (simulators.length === 0) {
        console.error('Error: No iOS simulators found');
        process.exit(1);
    }

    if (simulatorId) {
        const selected = simulators.find((sim) => sim.udid === simulatorId);
        if (!selected) {
            console.error(`Error: Simulator with ID ${simulatorId} not found`);
            process.exit(1);
        }
        return selected;
    }

    const defaultDeviceName = process.env.IOS_SIMULATOR_DEVICE || process.env.DEVICE_NAME || 'iPhone 17 Pro';
    const defaultOsPrefix = process.env.IOS_SIMULATOR_OS_PREFIX || process.env.DEVICE_OS_VERSION || 'iOS 26.';
    const selected = simulators.find((sim) =>
        sim.name === defaultDeviceName &&
        sim.os.startsWith(defaultOsPrefix),
    );
    if (!selected) {
        const osDisplay = defaultOsPrefix.endsWith('.') ? `${defaultOsPrefix}x` : defaultOsPrefix;
        console.error(`Error: No ${defaultDeviceName} running ${osDisplay} found`);
        process.exit(1);
    }
    return selected;
}

async function main() {
    console.log('iOS Simulator — Disable Password AutoFill / Save Password\n');

    if (process.platform !== 'darwin') {
        console.error('Error: This tool only works on macOS');
        process.exit(1);
    }
    if (!shell.which('xcrun')) {
        console.error('Error: xcrun not found. Please install Xcode and command line tools');
        process.exit(1);
    }

    const selected = resolveSimulator();
    console.log(`Target: ${selected.name} (${selected.os}) [${selected.udid}] state=${selected.state}`);

    if (seedDefaultsOnly) {
        if (selected.state !== 'Booted') {
            console.error('Error: --seed-defaults requires a Booted simulator');
            process.exit(1);
        }
        process.exit(seedPasswordDefaults(selected.udid) ? 0 : 1);
    }

    const plistOk = writeRestrictionPlists(selected.udid);
    if (selected.state === 'Booted') {
        seedPasswordDefaults(selected.udid);
    } else {
        console.log('\nSimulator is shut down — defaults seed skipped (run --seed-defaults after boot).');
    }

    process.exit(plistOk ? 0 : 1);
}

main();
