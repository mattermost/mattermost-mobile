#!/usr/bin/env node
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console, no-process-env */

/**
 * Shim for backward compatibility. Prefer: cd detox && npm run provision -- <server_url>
 */

const {spawnSync} = require('child_process');
const path = require('path');

const serverUrl = process.argv[2];
if (!serverUrl) {
    console.error('Usage: node provision_server.js <server_url>');
    process.exit(1);
}

const result = spawnSync('npm', ['run', 'provision', '--', serverUrl], {
    cwd: path.join(__dirname),
    stdio: 'inherit',
    env: process.env,
});

process.exit(result.status ?? 1);
