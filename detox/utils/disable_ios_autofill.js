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

function disablePasswordAutofill(udid) {
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
        console.error(`Error: UserSettings.plist not found at ${settingsPlist}`);
        console.error('\nThe simulator may need to be booted at least once to create this file.');
        console.error('Try booting the simulator first, then run this command again.');
        return false;
    }

    // Try to replace the value directly - this works if the key structure exists
    let result = shell.exec(
        `plutil -replace restrictedBool.allowPasswordAutoFill.value -bool NO "${settingsPlist}"`,
        {silent: true},
    );

    if (result.code === 0) {
        console.log('✅ Password autofill disabled successfully');
        return true;
    }

    // If direct replace failed, the key structure might not exist yet
    console.log('Key structure not found, creating it...');

    // Check if restrictedBool exists
    const checkRestrictedBool = shell.exec(
        `plutil -extract restrictedBool xml1 -o - "${settingsPlist}" 2>/dev/null`,
        {silent: true},
    );

    if (checkRestrictedBool.code !== 0) {
        // restrictedBool doesn't exist, create it
        result = shell.exec(`plutil -insert restrictedBool -dictionary "${settingsPlist}"`, {silent: true});
        if (result.code !== 0) {
            console.error('⚠️  Failed to insert restrictedBool dictionary');
            console.error(result.stderr);
            return false;
        }
    }

    // Check if restrictedBool.allowPasswordAutoFill exists
    const checkAutoFill = shell.exec(
        `plutil -extract restrictedBool.allowPasswordAutoFill xml1 -o - "${settingsPlist}" 2>/dev/null`,
        {silent: true},
    );

    if (checkAutoFill.code !== 0) {
        // allowPasswordAutoFill doesn't exist, create it
        result = shell.exec(`plutil -insert restrictedBool.allowPasswordAutoFill -dictionary "${settingsPlist}"`, {silent: true});
        if (result.code !== 0) {
            console.error('⚠️  Failed to insert allowPasswordAutoFill dictionary');
            console.error(result.stderr);
            return false;
        }
    }

    // Check if restrictedBool.allowPasswordAutoFill.value exists
    const checkValue = shell.exec(
        `plutil -extract restrictedBool.allowPasswordAutoFill.value xml1 -o - "${settingsPlist}" 2>/dev/null`,
        {silent: true},
    );

    if (checkValue.code === 0) {
        // value exists, replace it
        result = shell.exec(`plutil -replace restrictedBool.allowPasswordAutoFill.value -bool NO "${settingsPlist}"`, {silent: true});
    } else {
        // value doesn't exist, insert it
        result = shell.exec(`plutil -insert restrictedBool.allowPasswordAutoFill.value -bool NO "${settingsPlist}"`, {silent: true});
    }

    if (result.code !== 0) {
        console.error('⚠️  Failed to set allowPasswordAutoFill');
        console.error(result.stderr);
        return false;
    }

    // Also disable password autofill via restrictedValue.passwordAutoFillPasswords.value
    console.log('Setting restrictedValue.passwordAutoFillPasswords.value...');

    // Try to replace directly first
    result = shell.exec(
        `plutil -replace restrictedValue.passwordAutoFillPasswords.value -integer 0 "${settingsPlist}"`,
        {silent: true},
    );

    if (result.code === 0) {
        console.log('✅ Password autofill disabled successfully (both keys set)');
        return true;
    }

    // If direct replace failed, create the key structure
    console.log('Creating restrictedValue key structure...');

    // Check if restrictedValue exists
    const checkRestrictedValue = shell.exec(
        `plutil -extract restrictedValue xml1 -o - "${settingsPlist}" 2>/dev/null`,
        {silent: true},
    );

    if (checkRestrictedValue.code !== 0) {
        // restrictedValue doesn't exist, create it
        result = shell.exec(`plutil -insert restrictedValue -dictionary "${settingsPlist}"`, {silent: true});
        if (result.code !== 0) {
            console.error('⚠️  Failed to insert restrictedValue dictionary');
            console.error(result.stderr);
            return false;
        }
    }

    // Check if restrictedValue.passwordAutoFillPasswords exists
    const checkPasswordAutoFillPasswords = shell.exec(
        `plutil -extract restrictedValue.passwordAutoFillPasswords xml1 -o - "${settingsPlist}" 2>/dev/null`,
        {silent: true},
    );

    if (checkPasswordAutoFillPasswords.code !== 0) {
        // passwordAutoFillPasswords doesn't exist, create it
        result = shell.exec(`plutil -insert restrictedValue.passwordAutoFillPasswords -dictionary "${settingsPlist}"`, {silent: true});
        if (result.code !== 0) {
            console.error('⚠️  Failed to insert passwordAutoFillPasswords dictionary');
            console.error(result.stderr);
            return false;
        }
    }

    // Check if restrictedValue.passwordAutoFillPasswords.value exists
    const checkPasswordValue = shell.exec(
        `plutil -extract restrictedValue.passwordAutoFillPasswords.value xml1 -o - "${settingsPlist}" 2>/dev/null`,
        {silent: true},
    );

    if (checkPasswordValue.code === 0) {
        // value exists, replace it
        result = shell.exec(`plutil -replace restrictedValue.passwordAutoFillPasswords.value -integer 0 "${settingsPlist}"`, {silent: true});
    } else {
        // value doesn't exist, insert it
        result = shell.exec(`plutil -insert restrictedValue.passwordAutoFillPasswords.value -integer 0 "${settingsPlist}"`, {silent: true});
    }

    if (result.code === 0) {
        console.log('✅ Password autofill disabled successfully (both keys set)');
        return true;
    }
    console.error('⚠️  Failed to disable password autofill');
    console.error(result.stderr);
    return false;

}

async function main() {
    console.log('iOS Simulator - Disable Password Autofill\n');
    console.log('This tool disables password autofill on iOS simulators,');
    console.log('which can interfere with Detox E2E test login flows.');
    console.log('Target: iPhone 17 Pro (iOS 26.2)\n');

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

        console.log(`Using simulator: ${selectedSimulator.name} (${selectedSimulator.os})`);
    }

    // Apply the setting
    const success = disablePasswordAutofill(selectedSimulator.udid);

    if (success) {
        console.log('\nNote: If the simulator is currently running, you may need to restart it');
        console.log('for the changes to take effect.\n');
        process.exit(0);
    } else {
        process.exit(1);
    }
}

main();
