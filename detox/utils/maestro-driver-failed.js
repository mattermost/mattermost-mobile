// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI utility script */

/**
 * Detect Maestro batches that never drove the app (driver/ADB/gRPC died at
 * startup) so CI can retry them once. A genuine assertion failure must not
 * match — those write JUnit with a real elapsed time.
 */

const fs = require('fs');

const DRIVER_RE = /IOSDriverTimeoutException|iOS driver not ready in time|StatusRuntimeException: UNAVAILABLE|io\.grpc\.StatusRuntimeException|Command failed \(tcp:/;

/**
 * @param {string} [logText]
 * @param {string} [xmlText]
 * @returns {boolean}
 */
function isMaestroDriverFailure(logText, xmlText) {
    const text = `${logText || ''}\n${xmlText || ''}`;
    if (!DRIVER_RE.test(text)) {
        return false;
    }
    if (!xmlText) {
        return true;
    }
    const times = [...xmlText.matchAll(/<testcase\b[^>]*\btime="([0-9.]+)"/g)].map((m) => Number(m[1]));
    if (times.length === 0) {
        return true;
    }

    // A flow that actually ran is minutes, not sub-second. The attach_logs
    // Android gRPC death reports time="0.0".
    return times.every((t) => Number.isFinite(t) && t < 1);
}

function main() {
    const logPath = process.argv[2];
    const xmlPath = process.argv[3];
    if (!logPath) {
        console.error('usage: maestro-driver-failed.js <batch.log> [batch.xml]');
        process.exit(2);
    }
    const logText = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8') : '';
    const xmlText = xmlPath && fs.existsSync(xmlPath) ? fs.readFileSync(xmlPath, 'utf8') : '';
    process.exit(isMaestroDriverFailure(logText, xmlText) ? 0 : 1);
}

if (require.main === module) {
    main();
}

module.exports = {isMaestroDriverFailure};
