'use strict';

/**
 * Shared helpers for paths.json — used by the fingerprint action (via node -e)
 * and by unit tests. Keep impact-filter glob conversion here so both sides agree.
 */

const path = require('path');

function loadPaths(pathsFile) {
    // Dynamic path so the composite action can pass GITHUB_ACTION_PATH/paths.json.
    // eslint-disable-next-line import/no-dynamic-require, global-require
    return require(pathsFile || path.join(__dirname, 'paths.json'));
}

/** git ls-tree path → impact-filter glob (dir/ → dir/**). */
function fingerprintPathToGlob(entry) {
    return entry.endsWith('/') ? `${entry}**` : entry;
}

function fingerprintPathsForPlatform(paths, platform) {
    const extra = paths.fingerprintByPlatform[platform];
    if (!extra) {
        throw new Error(`Unknown platform: ${platform}`);
    }
    return [...paths.fingerprintShared, ...extra];
}

/** All globs the label manager should treat as E2E-impacting. */
function impactGlobs(paths) {
    const fromFingerprint = new Set();
    for (const entry of paths.fingerprintShared) {
        fromFingerprint.add(fingerprintPathToGlob(entry));
    }
    for (const platformPaths of Object.values(paths.fingerprintByPlatform)) {
        for (const entry of platformPaths) {
            fromFingerprint.add(fingerprintPathToGlob(entry));
        }
    }
    return [...fromFingerprint, ...paths.triggerExtra];
}

module.exports = {
    loadPaths,
    fingerprintPathToGlob,
    fingerprintPathsForPlatform,
    impactGlobs,
};
