// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env, no-console */

const {execSync} = require('child_process');

const timezone = process.env.SIMULATOR_TIMEZONE || process.argv[2] || 'America/New_York';

if (!/^[A-Za-z0-9/_+-]+$/.test(timezone)) {
    console.error(`[set_timezone] Invalid timezone format: ${timezone}`);
    process.exit(1);
}

if (process.platform !== 'darwin') {
    console.log(`[set_timezone] Skipping: not macOS (platform=${process.platform})`);
    process.exit(0);
}

try {
    // 'xcrun simctl timezone' was removed in Xcode 26.
    // 'launchctl setenv TZ' sets the TZ env var in launchd so all new processes pick it up.
    execSync(`xcrun simctl spawn booted launchctl setenv TZ "${timezone}"`, {stdio: 'pipe'});
    console.log(`[set_timezone] Set simulator timezone to ${timezone}`);
} catch (err) {
    console.warn(`[set_timezone] Warning: could not set timezone: ${err.message}`);
}
