// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint-disable no-console -- CI evidence capture */

const {execFileSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const {sanitize} = require('./path_builder');

const TIMEOUT_RE = /Exceeded timeout of \d+ ms for a test/;

// Under artifacts/ so the iOS results upload and TSIO pick it up; the folder
// is named like Detox's own so TSIO links the screenshot to the test.
const EVIDENCE_DIR = path.join('artifacts', 'triage-evidence');

/** Jest's fullName: describe titles and the test title, space-separated. */
function fullName(test) {
    const names = [];
    for (let block = test.parent; block && block.parent; block = block.parent) {
        names.unshift(block.name);
    }
    return [...names, test.name].join(' ');
}

/**
 * Screenshots the iOS simulator when a test hits the Jest timeout. Detox's own
 * failure screenshot is discarded on a timeout ("cannot save an already
 * discarded artifact"), so the E2E triage judge saw only "Exceeded timeout"
 * and nothing of where the app was stuck. simctl reads the simulator's screen
 * directly, so it works while the app is still busy.
 */
class TimeoutEvidenceListener {
    constructor({env}) {
        this._env = env;
    }

    test_fn_failure({error, test}) {
        if (process.env.IOS !== 'true' || !TIMEOUT_RE.test(String(error?.message ?? error))) {
            return;
        }
        const udid = this._env.global.device?.id;
        if (!udid) {
            return;
        }
        const name = fullName(test);
        const dir = path.join(EVIDENCE_DIR, sanitize(name));
        try {
            fs.mkdirSync(dir, {recursive: true});
            execFileSync('xcrun', ['simctl', 'io', udid, 'screenshot', '--type=png', path.join(dir, 'timeout.png')], {stdio: 'ignore', timeout: 30000});
        } catch (e) {
            console.warn(`[timeout-evidence] could not screenshot "${name}": ${e.message}`);
        }
    }
}

module.exports = TimeoutEvidenceListener;
module.exports.fullName = fullName;
module.exports.EVIDENCE_DIR = EVIDENCE_DIR;
