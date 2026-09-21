// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Minimal `--key value` / `--key=value` argv parser for CI utility scripts.
 *
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
function parseArgs(argv) {
    const out = {};
    for (let i = 2; i < argv.length; i++) {
        let key = argv[i];
        if (!key.startsWith('--')) {
            continue;
        }
        key = key.slice(2);
        if (key.includes('=')) {
            const idx = key.indexOf('=');
            out[key.slice(0, idx)] = key.slice(idx + 1);
        } else {
            const next = argv[i + 1];
            if (next === undefined || next.startsWith('--')) {
                out[key] = 'true';
            } else {
                out[key] = next;
                i++;
            }
        }
    }
    return out;
}

module.exports = {parseArgs};
