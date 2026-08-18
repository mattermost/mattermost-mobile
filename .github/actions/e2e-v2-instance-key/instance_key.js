'use strict';

/**
 * Stack hostname prefix. The toolkit refuses more than 24 characters.
 *
 *   mobile-pr-<n>-ios|and|ipad
 *   mobile-main-ios|and|ipad
 *   mobile-release-ios|and|ipad
 *   mobile-release-cut-ios|and|ipad
 *
 * Android is `and` so `mobile-release-cut-and` stays within 24 characters.
 */

const PLATFORM_SUFFIX = {
    ios: 'ios',
    android: 'and',
    ipad: 'ipad',
};

const MAX_LENGTH = 24;

function digitsOnly(value) {
    return String(value ?? '').replace(/\D/g, '');
}

function scopeLabel({prNumber, runType, refName} = {}) {
    const pr = digitsOnly(prNumber);
    if (pr) {
        return `pr-${pr}`;
    }

    const type = String(runType ?? '').trim().toUpperCase();
    if (type === 'MAIN' || type === 'MASTER') {
        return 'main';
    }
    if (type === 'RELEASE_CUT') {
        return 'release-cut';
    }
    if (type === 'RELEASE') {
        return 'release';
    }

    const branch = String(refName ?? '').trim().toLowerCase();
    if (branch === 'main') {
        return 'main';
    }
    if (branch.includes('release-cut') || /^release.*cut/.test(branch)) {
        return 'release-cut';
    }
    if (branch.startsWith('release')) {
        return 'release';
    }

    throw new Error('instance_key needs a PR number or a main/release/release-cut run type');
}

function instanceKey({prNumber, runType, refName, platform} = {}) {
    const suffix = PLATFORM_SUFFIX[platform];
    if (!suffix) {
        throw new Error('instance_key needs platform ios, android, or ipad');
    }
    const key = `mobile-${scopeLabel({prNumber, runType, refName})}-${suffix}`;
    if (key.length > MAX_LENGTH) {
        throw new Error(`instance_key is ${key.length} characters (${key}); keep it to ${MAX_LENGTH} or fewer`);
    }
    return key;
}

function parseArgs(argv) {
    const out = {};
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        const next = argv[i + 1];
        if (a === '--pr') {
            out.prNumber = next;
            i += 1;
        } else if (a === '--run-type') {
            out.runType = next;
            i += 1;
        } else if (a === '--ref') {
            out.refName = next;
            i += 1;
        } else if (a === '--platform') {
            out.platform = next;
            i += 1;
        }
    }
    return out;
}

if (require.main === module) {
    process.stdout.write(`${instanceKey(parseArgs(process.argv.slice(2)))}\n`);
}

module.exports = {
    MAX_LENGTH,
    PLATFORM_SUFFIX,
    scopeLabel,
    instanceKey,
    parseArgs,
};
