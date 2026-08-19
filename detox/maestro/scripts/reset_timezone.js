// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

const {execSync} = require('child_process');

if (process.platform !== 'darwin') {
    process.exit(0);
}

try {
    execSync('xcrun simctl spawn booted launchctl unsetenv TZ', {stdio: 'pipe'});
    console.log('[reset_timezone] Simulator timezone reset to system default');
} catch (err) {
    console.warn(`[reset_timezone] Warning: could not reset timezone: ${err.message}`);
}
