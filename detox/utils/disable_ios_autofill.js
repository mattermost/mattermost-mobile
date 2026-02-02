// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console */

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

function disablePasswordAutofill(udid, simulator) {
    const settingsDir = path.join(
        os.homedir(),
        'Library/Developer/CoreSimulator/Devices',
        udid,
        'data/Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles',
    );
    const settingsPlist = path.join(settingsDir, 'UserSettings.plist');

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

    // Define all keys to set
    const keysToSet = [
        {
            path: 'restrictedBool.allowPasswordAutoFill.value',
            type: 'bool',
            value: 'NO',
            description: 'allowPasswordAutoFill',
        },
        {
            path: 'restrictedBool.allowPasswordAutoFillWithStrongPassword.value',
            type: 'bool',
            value: 'NO',
            description: 'allowPasswordAutoFillWithStrongPassword (iOS 26+)',
        },
        {
            path: 'restrictedBool.forceDisablePasswordAutoFill.value',
            type: 'bool',
            value: 'YES',
            description: 'forceDisablePasswordAutoFill',
        },
        {
            path: 'restrictedBool.allowiCloudKeychain.value',
            type: 'bool',
            value: 'NO',
            description: 'allowiCloudKeychain',
        },
        {
            path: 'restrictedValue.passwordAutoFillPasswords.value',
            type: 'integer',
            value: '0',
            description: 'passwordAutoFillPasswords',
        },
        {
            path: 'restrictedValue.allowAutoFillAuthenticationUI.value',
            type: 'integer',
            value: '0',
            description: 'allowAutoFillAuthenticationUI',
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
        return true;
    } else if (successCount > 0) {
        console.log(`⚠️  Partially successful: ${successCount}/${keysToSet.length} keys set`);

        // Check if this is iOS 26+
        const isIOS26Plus = simulator && simulator.os &&
                            parseFloat(simulator.os.replace('iOS ', '')) >= 26;

        if (isIOS26Plus) {
            console.error('⚠️  CRITICAL: iOS 26+ requires ALL 6 keys to fully disable password autofill');
            console.error('    Missing keys may allow "Strong Password" or iCloud Keychain prompts');
        }

        return false;
    }
    console.error('⚠️  Failed to disable password autofill');
    return false;

}

async function main() {
    console.log('iOS Simulator - Disable Password Autofill\n');
    console.log('This tool disables password autofill on iOS simulators,');
    console.log('which can interfere with Detox E2E test login flows.');
    console.log('Sets 6 iOS restriction keys to fully disable autofill prompts.\n');

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
        // Automatically select iPhone 17 Pro with iOS 26.2
        selectedSimulator = simulators.find((sim) =>
            sim.name === 'iPhone 17 Pro' &&
            sim.os === 'iOS 26.2',
        );

        if (!selectedSimulator) {
            console.error('Error: iPhone 17 Pro (iOS 26.2) simulator not found');
            console.error('Please create this simulator in Xcode first.');
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
    const success = disablePasswordAutofill(selectedSimulator.udid, selectedSimulator);

    process.exit(success ? 0 : 1);
}

main();
