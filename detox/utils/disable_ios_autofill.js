// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console, no-process-env */

const os = require('os');
const path = require('path');

const shell = require('shelljs');

// Parse command line arguments
const args = process.argv.slice(2);
let simulatorId = null;

for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--simulator-id' || args[i] === '-s') && args[i + 1]) {
        simulatorId = args[i + 1];
        break;
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
        // Match iOS version headers like "-- iOS 17.2 --"
        const osMatch = line.match(/-- (iOS [0-9.]+) --/);
        if (osMatch) {
            currentOS = osMatch[1];
            continue;
        }

        // Match simulator lines like "    iPhone 15 Pro (A9A6D652-D75B-4C3A-9CD4-C6BA5E76C6F4) (Shutdown)"
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

function disablePasswordAutofill(udid) {
    const settingsDir = path.join(
        os.homedir(),
        'Library/Developer/CoreSimulator/Devices',
        udid,
        'data/Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles',
    );
    const settingsPlist = path.join(settingsDir, 'UserSettings.plist');

    // EffectiveUserSettings.plist is the merged/computed version iOS reads at runtime.
    // Both files must be updated — UserSettings is the source, EffectiveUserSettings
    // is what CoreRestrictions actually enforces.
    const effectivePlist = path.join(settingsDir, 'EffectiveUserSettings.plist');

    console.log(`\nDisabling password autofill for simulator ${udid}...`);

    // Check if file exists
    if (!shell.test('-f', settingsPlist)) {
        console.log('UserSettings.plist not found, creating it...');

        // Ensure directory exists
        shell.mkdir('-p', settingsDir);

        // Create empty plist file
        const result = shell.exec(`plutil -create xml1 "${settingsPlist}"`, {silent: true});
        if (result.code !== 0) {
            console.error(`Error: Failed to create UserSettings.plist at ${settingsPlist}`);
            console.error(result.stderr);
            return false;
        }
    }

    // Keys that actually exist in the iOS 26.2 UserSettings.plist and are
    // recognized by CoreRestrictions. Verified by inspecting the plist on an
    // iOS 26.2 simulator — only keys present in the system-initialized plist
    // are honoured; unknown keys are silently ignored by iOS.
    //
    // NOTE: allowPasswordAutoFill=NO disables the AutoFill KEYBOARD TOOLBAR
    // (the bar above the keyboard that suggests saved passwords). It does NOT
    // prevent the "Save Password?" modal sheet shown by the Passwords.app
    // credential provider on iOS 18+. That modal is handled separately via
    // `xcrun simctl spawn defaults write com.apple.Passwords` in the workflow
    // and by dismissing it in the test login flow after the channel list loads.
    const keysToSet = [
        {
            path: 'restrictedBool.allowPasswordAutoFill.value',
            type: 'bool',
            value: 'NO',
            description: 'allowPasswordAutoFill (disables keyboard autofill bar)',
        },
        {
            path: 'restrictedBool.allowCloudKeychainSync.value',
            type: 'bool',
            value: 'NO',
            description: 'allowCloudKeychainSync (prevents iCloud Keychain sync)',
        },
    ];

    let successCount = 0;

    for (const key of keysToSet) {
        console.log(`Setting ${key.description}...`);

        // Try to replace the value directly first
        let result = shell.exec(
            `plutil -replace ${key.path} -${key.type} ${key.value} "${settingsPlist}"`,
            {silent: true},
        );

        if (result.code === 0) {
            successCount++;
            continue;
        }

        // Direct replace failed, need to create the key structure
        const pathParts = key.path.split('.');
        const rootKey = pathParts[0]; // restrictedBool or restrictedValue
        const middleKey = pathParts[1]; // e.g., allowPasswordAutoFill

        // Ensure root dictionary exists (restrictedBool or restrictedValue)
        const checkRoot = shell.exec(
            `plutil -extract ${rootKey} xml1 -o - "${settingsPlist}" 2>/dev/null`,
            {silent: true},
        );

        if (checkRoot.code !== 0) {
            result = shell.exec(`plutil -insert ${rootKey} -dictionary "${settingsPlist}"`, {silent: true});
            if (result.code !== 0) {
                console.error(`⚠️  Failed to insert ${rootKey} dictionary`);
                console.error(result.stderr);
                continue;
            }
        }

        // Ensure middle dictionary exists (e.g., allowPasswordAutoFill)
        const checkMiddle = shell.exec(
            `plutil -extract ${rootKey}.${middleKey} xml1 -o - "${settingsPlist}" 2>/dev/null`,
            {silent: true},
        );

        if (checkMiddle.code !== 0) {
            result = shell.exec(
                `plutil -insert ${rootKey}.${middleKey} -dictionary "${settingsPlist}"`,
                {silent: true},
            );
            if (result.code !== 0) {
                console.error(`⚠️  Failed to insert ${rootKey}.${middleKey} dictionary`);
                console.error(result.stderr);
                continue;
            }
        }

        // Set the value (insert or replace)
        const checkValue = shell.exec(
            `plutil -extract ${key.path} xml1 -o - "${settingsPlist}" 2>/dev/null`,
            {silent: true},
        );

        if (checkValue.code === 0) {
            // Value exists, replace it
            result = shell.exec(
                `plutil -replace ${key.path} -${key.type} ${key.value} "${settingsPlist}"`,
                {silent: true},
            );
        } else {
            // Value doesn't exist, insert it
            result = shell.exec(
                `plutil -insert ${key.path} -${key.type} ${key.value} "${settingsPlist}"`,
                {silent: true},
            );
        }

        if (result.code === 0) {
            successCount++;
        } else {
            console.error(`⚠️  Failed to set ${key.description}`);
            console.error(result.stderr);
        }
    }

    // Verify that all keys were actually written to the plist
    console.log('\nVerifying restriction keys...');
    let verifiedCount = 0;

    for (const key of keysToSet) {
        const checkResult = shell.exec(
            `plutil -extract ${key.path} xml1 -o - "${settingsPlist}" 2>/dev/null`,
            {silent: true},
        );

        if (checkResult.code === 0) {
            // Extract just the value for logging
            const valueMatch = checkResult.stdout.match(/<(true|false|integer)>([^<]*)<\/(true|false|integer)>/);
            if (valueMatch) {
                console.log(`  ✓ ${key.description}: ${valueMatch[0]}`);
                verifiedCount++;
            }
        } else {
            console.log(`  ✗ ${key.description}: MISSING or FAILED`);
        }
    }

    if (verifiedCount === keysToSet.length) {
        console.log(`\n✅ All ${keysToSet.length} restriction keys verified in plist`);
    } else {
        console.error(`\n⚠️  Only ${verifiedCount}/${keysToSet.length} keys verified`);
    }

    if (successCount === keysToSet.length) {
        console.log(`✅ Password autofill disabled successfully (${keysToSet.length} restriction keys set)`);
    } else if (successCount > 0) {
        console.log(`⚠️  Partially successful: ${successCount}/${keysToSet.length} keys set`);
    } else {
        console.error('⚠️  Failed to disable password autofill');
        return false;
    }

    // Mirror the same keys to EffectiveUserSettings.plist — iOS reads the effective
    // settings at runtime, not the source UserSettings.plist directly.
    // All inputs (effectivePlist, key.path, key.type, key.value) are internal
    // constants — no user-controlled data is interpolated.
    if (shell.test('-f', effectivePlist)) {
        console.log('\nMirroring keys to EffectiveUserSettings.plist...');
        for (const key of keysToSet) {
            const checkValue = shell.exec(
                `plutil -extract ${key.path} xml1 -o - "${effectivePlist}" 2>/dev/null`,
                {silent: true},
            );
            const cmd = checkValue.code === 0 ? 'replace' : 'insert';
            const mirrorResult = shell.exec(
                `plutil -${cmd} ${key.path} -${key.type} ${key.value} "${effectivePlist}"`,
                {silent: true},
            );
            if (mirrorResult.code !== 0) {
                console.log(`  ⚠️  Failed to mirror ${key.description} to EffectiveUserSettings.plist`);
            }
        }
    }

    return successCount > 0;

}

async function main() {
    console.log('iOS Simulator - Disable Password Autofill\n');
    console.log('This tool sets MDM restriction keys in UserSettings.plist to disable');
    console.log('the AutoFill keyboard toolbar on iOS simulators.');
    console.log('NOTE: This does NOT prevent the "Save Password?" modal on iOS 18+.');
    console.log('That modal is handled via xcrun simctl spawn defaults write in CI.\n');

    // Check if running on macOS
    if (process.platform !== 'darwin') {
        console.error('Error: This tool only works on macOS');
        process.exit(1);
    }

    // Check if xcrun is available
    if (!shell.which('xcrun')) {
        console.error('Error: xcrun not found. Please install Xcode and command line tools');
        process.exit(1);
    }

    // Get list of simulators
    const simulators = getSimulators();

    if (simulators.length === 0) {
        console.error('Error: No iOS simulators found');
        console.error('Create a simulator in Xcode first');
        process.exit(1);
    }

    let selectedSimulator;

    if (simulatorId) {
        // Use provided simulator ID
        selectedSimulator = simulators.find((sim) => sim.udid === simulatorId);

        if (!selectedSimulator) {
            console.error(`Error: Simulator with ID ${simulatorId} not found`);
            process.exit(1);
        }

        console.log(`Target: ${selectedSimulator.name} (${selectedSimulator.os})`);
        console.log(`Using simulator: ${selectedSimulator.name} (${selectedSimulator.os})`);
    } else {
        // Automatically select simulator using env-configurable device name and OS prefix.
        // Priority: IOS_SIMULATOR_DEVICE > DEVICE_NAME > hardcoded default (and same for OS).
        const defaultDeviceName = process.env.IOS_SIMULATOR_DEVICE || process.env.DEVICE_NAME || 'iPhone 17 Pro';
        const defaultOsPrefix = process.env.IOS_SIMULATOR_OS_PREFIX || process.env.DEVICE_OS_VERSION || 'iOS 26.';
        selectedSimulator = simulators.find((sim) =>
            sim.name === defaultDeviceName &&
            sim.os.startsWith(defaultOsPrefix),
        );

        if (!selectedSimulator) {
            // Append "x" only when the prefix is a major-version wildcard (ends with "."),
            // e.g. "iOS 26." → "iOS 26.x"; a full version like "iOS 26.2" is shown as-is.
            const osDisplay = defaultOsPrefix.endsWith('.') ? `${defaultOsPrefix}x` : defaultOsPrefix;
            console.error(`Error: No ${defaultDeviceName} running ${osDisplay} found`);
            console.error(`Please create a ${defaultDeviceName} simulator with ${osDisplay} in Xcode first.`);
            console.error('\nAvailable simulators:');
            simulators.forEach((sim) => {
                const stateIndicator = sim.state === 'Booted' ? '🟢' : '⚪';
                console.error(`  ${stateIndicator} ${sim.name} (${sim.os}) - ${sim.state}`);
            });
            process.exit(1);
        }

        console.log(`Target: ${selectedSimulator.name} (${selectedSimulator.os})`);
        console.log(`Using simulator: ${selectedSimulator.name} (${selectedSimulator.os})`);
    }

    // Apply the setting
    const success = disablePasswordAutofill(selectedSimulator.udid);

    process.exit(success ? 0 : 1);
}

main();
