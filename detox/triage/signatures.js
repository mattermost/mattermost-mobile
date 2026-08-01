// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Failure-signature catalogue for E2E triage.
 *
 * This is the deterministic half of failure triage. Anything that can be
 * pattern-matched is classified here rather than by a model: it is cheaper,
 * reproducible, auditable, and it does not vary run to run. The model only sees
 * what does not match.
 *
 * The catalogue is the asset that compounds. Every time a human triages a failure
 * the model got wrong, the recurring shape becomes an entry here and the model's
 * share of the work shrinks.
 *
 * Each signature declares:
 *   id        stable identifier, used in verdict evidence
 *   label     short human phrase for status descriptions
 *   category  maps to a verdict class (see CATEGORY_VERDICT)
 *   scope     'test'  — this one test failed for this reason
 *             'shard' — the whole shard died; every failure on it shares the cause
 *             'suite' — the run never produced usable results
 *   weight    confidence contribution, 0..1. Weights are additive but capped;
 *             two independent 0.5 signals are stronger than one 0.9.
 *   frameworks which producers the pattern can appear in
 *   patterns  regexes matched against the failure text (message + stack + log)
 */

const CATEGORY = {
    INFRA: 'INFRA',
    SERVER: 'SERVER',
    BUILD: 'BUILD',
    DEVICE: 'DEVICE',
    NETWORK: 'NETWORK',
    TEST: 'TEST',
};

/**
 * Category → verdict. DEVICE and NETWORK both resolve to FLAKY_INFRA: from the
 * PR author's point of view a wedged simulator and a broken bandwidth profile are
 * the same thing — an environment problem they cannot fix in their change. They
 * stay distinct categories because the *remediation* differs, and the label is
 * what a CI engineer reads.
 */
const CATEGORY_VERDICT = {
    [CATEGORY.INFRA]: 'FLAKY_INFRA',
    [CATEGORY.DEVICE]: 'FLAKY_INFRA',
    [CATEGORY.NETWORK]: 'FLAKY_INFRA',
    [CATEGORY.SERVER]: 'FLAKY_SERVER',
    [CATEGORY.BUILD]: 'BUILD_OR_ENV_ERROR',
    [CATEGORY.TEST]: 'FLAKY_TEST',
};

const SIGNATURES = [

    // ---------- Runner / job infrastructure ----------
    {
        id: 'infra.runner-oom',
        label: 'runner ran out of memory',
        category: CATEGORY.INFRA,
        scope: 'shard',
        weight: 0.9,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /Cannot allocate memory/i,
            /JavaScript heap out of memory/i,
            /The runner has received a shutdown signal/i,
            /Killed\s+process|signal\s*:\s*SIGKILL/i,
        ],
    },
    {
        id: 'infra.disk-full',
        label: 'runner disk full',
        category: CATEGORY.INFRA,
        scope: 'shard',
        weight: 0.9,
        frameworks: ['detox', 'maestro'],
        patterns: [/No space left on device/i, /ENOSPC/],
    },
    {
        id: 'infra.artifact-download',
        label: 'build artifact download failed',
        category: CATEGORY.INFRA,
        scope: 'shard',
        weight: 0.85,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /Unable to download artifact/i,
            /artifact .* not found/i,
            /No \.app bundle found/i,
        ],
    },
    {
        id: 'infra.metro-died',
        label: 'Metro bundler died mid-run',
        category: CATEGORY.INFRA,
        scope: 'shard',
        weight: 0.8,
        frameworks: ['detox'],
        patterns: [
            /Metro.*(exited|terminated|has stopped)/i,
            /Could not connect to development server/i,
            /No script URL provided/i,
        ],
    },

    // ---------- Device: simulator / emulator ----------
    {
        id: 'device.sim-boot',
        label: 'simulator failed to boot',
        category: CATEGORY.DEVICE,
        scope: 'shard',
        weight: 0.9,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /Failed to boot .*simulator/i,
            /Unable to boot device/i,
            /simctl.*(failed|error).*boot/i,
            /device is still booting/i,
        ],
    },
    {
        id: 'device.adb-offline',
        label: 'emulator lost adb',
        category: CATEGORY.DEVICE,
        scope: 'shard',
        weight: 0.9,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /device (offline|unauthorized|not found)/i,
            /emulator-\d+\s+offline/i,
            /adb: device .* not found/i,
            /device unauthorized/i,
        ],
    },
    {
        id: 'device.app-crashed',
        label: 'app process died on device',
        category: CATEGORY.DEVICE,
        scope: 'test',
        weight: 0.6,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /app has crashed/i,
            /Application .* is not running/i,
            /FATAL EXCEPTION/,
            /has died|process .* crashed/i,
        ],
    },
    {
        id: 'device.instrumentation-died',
        label: 'Android instrumentation process died',
        category: CATEGORY.DEVICE,
        scope: 'shard',
        weight: 0.85,
        frameworks: ['detox'],
        patterns: [
            /Instrumentation process .* (died|has crashed)/i,
            /INSTRUMENTATION_FAILED/,
        ],
    },
    {
        id: 'device.detox-sync-timeout',
        label: 'Detox never reached idle',
        category: CATEGORY.DEVICE,
        scope: 'test',

        // Deliberately low: this is the single most over-diagnosed signature.
        // A wedged runner and a genuine app-side hang produce identical text, so
        // it can only ever be corroborating evidence, never a verdict on its own.
        weight: 0.25,
        frameworks: ['detox'],
        patterns: [
            /Timeout - Async callback was not invoked within/i,
            /DetoxRuntimeError.*timed out/i,
            /The app has not responded/i,
        ],
    },

    // ---------- Server ----------
    {
        id: 'server.5xx',
        label: 'test server returned 5xx',
        category: CATEGORY.SERVER,
        scope: 'test',
        weight: 0.7,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /status(Code)?[":\s]+5\d\d/i,
            /Request failed with status code 5\d\d/i,
            /\b(502 Bad Gateway|503 Service Unavailable|504 Gateway Timeout)\b/i,
        ],
    },
    {
        id: 'server.unreachable',
        label: 'test server unreachable',
        category: CATEGORY.SERVER,
        scope: 'shard',
        weight: 0.85,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /ECONNREFUSED/,
            /ENOTFOUND/,
            /EHOSTUNREACH/,
            /socket hang up/i,
            /NSURLErrorDomain.*-100[29]/,
        ],
    },
    {
        id: 'server.login-failed',
        label: 'login failed against test server',
        category: CATEGORY.SERVER,
        scope: 'shard',
        weight: 0.6,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /Enter a valid email or username and\/or password/i,
            /apiLogin.*fail/i,
            /Unable to (connect to|reach) the server/i,
        ],
    },

    // ---------- Network / proxy ----------
    {
        id: 'network.proxy',
        label: 'bandwidth proxy failure',
        category: CATEGORY.NETWORK,
        scope: 'shard',
        weight: 0.75,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /mitmdump.*(failed|not running|exited)/i,
            /proxy .*(refused|unavailable)/i,
        ],
    },
    {
        id: 'network.tls',
        label: 'TLS/DNS failure reaching the site',
        category: CATEGORY.NETWORK,
        scope: 'shard',
        weight: 0.8,
        frameworks: ['maestro', 'detox'],

        // -1200 is the iOS TLS handshake failure the Maestro preflight already
        // calls out explicitly as an environment failure.
        patterns: [
            /NSURLErrorDomain.*-1200/,
            /Cancelled during verify block/i,
            /certificate .*(expired|not valid|self.signed)/i,
        ],
    },

    // ---------- Build / environment: looks like infra, is a code problem ----------
    {
        id: 'build.bundler',
        label: 'JS bundle failed to build',
        category: CATEGORY.BUILD,
        scope: 'suite',
        weight: 0.95,
        frameworks: ['detox'],
        patterns: [
            /Unable to resolve module/i,
            /SyntaxError:.*\.tsx?/,
            /Module not found/i,
            /error: bundling failed/i,
        ],
    },
    {
        id: 'build.native',
        label: 'native build or signing failure',
        category: CATEGORY.BUILD,
        scope: 'suite',
        weight: 0.9,
        frameworks: ['detox', 'maestro'],
        patterns: [
            /Code Sign(ing)? error/i,
            /xcodebuild:.*error:/i,
            /Execution failed for task ':app:/,
        ],
    },

    // ---------- Test-side ----------
    {
        id: 'test.stale-selector',
        label: 'element never appeared',
        category: CATEGORY.TEST,
        scope: 'test',

        // Low on purpose: "element not found" is equally consistent with a real
        // regression that removed the element. It narrows nothing by itself and
        // must be combined with rerun or baseline evidence.
        weight: 0.2,
        frameworks: ['detox'],
        patterns: [
            /No elements found for/i,
            /Test Failed: View .* not found/i,
            /could not be found|does not exist/i,
        ],
    },
    {
        id: 'test.not-visible',
        label: 'element present but not hittable',
        category: CATEGORY.TEST,
        scope: 'test',
        weight: 0.25,
        frameworks: ['detox'],
        patterns: [
            /is not visible|not hittable/i,
            /view is not .*visible/i,
            /Matcher.*isDisplayed.*did not match/i,
        ],
    },
];

/**
 * Suite-shape rules — conditions on the run as a whole rather than on any one
 * failure's text.
 *
 * These matter more than text signatures at high failure volume: when 300 tests
 * fail, the shape of the failure ("every shard died before the first test",
 * "one shard produced nothing") identifies the cause far more reliably than any
 * individual error message does.
 *
 * Each rule receives the normalized run summary and returns a verdict or null.
 */
const SUITE_RULES = [
    {
        id: 'suite.no-results',
        label: 'no test results produced',
        weight: 0.95,
        evaluate: (summary) => {
            if (summary.totalTests === 0 && summary.shards.length > 0) {
                return {
                    verdict: 'FLAKY_INFRA',
                    reason: 'no shard produced a usable report — the run died before tests ran',
                };
            }
            return null;
        },
    },
    {
        id: 'suite.all-shards-failed-early',
        label: 'every shard failed before running tests',
        weight: 0.9,
        evaluate: (summary) => {
            const producing = summary.shards.filter((s) => s.total > 0);
            if (summary.shards.length >= 2 && producing.length === 0) {
                return {
                    verdict: 'FLAKY_INFRA',
                    reason: `all ${summary.shards.length} shards failed before producing results`,
                };
            }
            return null;
        },
    },
    {
        id: 'suite.server-unreachable',
        label: 'test server was not answering',

        // Highest weight of any suite rule: this is a direct measurement taken at
        // the time of the run, not an inference from error text. If the server
        // was down, nothing else about the failures is worth reading.
        weight: 0.95,
        evaluate: (summary) => {
            const probes = summary.serverProbes || [];
            const down = probes.filter((p) => p.reachable === false);
            if (down.length > 0 && summary.failed > 0) {
                return {
                    verdict: 'FLAKY_SERVER',
                    reason: `test server did not answer /api/v4/system/ping (${down.
                        map((p) => `${p.site || 'unknown'} → HTTP ${p.ping_http_code}`).
                        join('; ')})`,
                };
            }
            return null;
        },
    },
    {
        id: 'suite.single-shard-wiped',
        label: 'one shard died while the rest passed',
        weight: 0.8,
        evaluate: (summary) => {
            const dead = summary.shards.filter((s) => s.total > 0 && s.passed === 0 && s.failed > 0);
            const healthy = summary.shards.filter((s) => s.passed > 0);

            // A shard where literally nothing passed, next to shards that are fine,
            // is an environment fact about that machine — a code regression would
            // not respect shard boundaries.
            if (dead.length >= 1 && healthy.length >= 1 && dead.length < summary.shards.length) {
                return {
                    verdict: 'FLAKY_INFRA',
                    reason: `shard(s) ${dead.map((s) => s.shard).join(', ')} lost every test while other shards passed`,
                };
            }
            return null;
        },
    },
];

/**
 * Match a failure's text against the catalogue.
 *
 * `text` should be the concatenation of everything known about the failure —
 * error message, stack, and any captured log window — because the discriminating
 * string is as often in the device log as in the assertion message.
 */
function matchSignatures(text, {framework = 'detox'} = {}) {
    if (!text) {
        return [];
    }
    const matched = [];
    for (const sig of SIGNATURES) {
        if (!sig.frameworks.includes(framework)) {
            continue;
        }
        const hit = sig.patterns.find((p) => p.test(text));
        if (hit) {
            matched.push({
                id: sig.id,
                label: sig.label,
                category: sig.category,
                scope: sig.scope,
                weight: sig.weight,
                verdict: CATEGORY_VERDICT[sig.category],
                matched: String(hit),
            });
        }
    }
    return matched.sort((a, b) => b.weight - a.weight);
}

/**
 * Combine signature weights into a single confidence.
 *
 * Diminishing-returns accumulation rather than a sum: two independent 0.5 signals
 * land at 0.75, which is stronger than either alone but still short of certainty.
 * A plain sum would let three weak, correlated matches manufacture a confident
 * verdict out of nothing.
 */
function combineConfidence(matches) {
    let remaining = 1;
    for (const m of matches) {
        remaining *= (1 - m.weight);
    }
    return Number((1 - remaining).toFixed(3));
}

/**
 * Evaluate the suite-shape rules. Returns the highest-weight match, or null.
 */
function matchSuiteRules(summary) {
    const hits = [];
    for (const rule of SUITE_RULES) {
        const result = rule.evaluate(summary);
        if (result) {
            hits.push({id: rule.id, label: rule.label, weight: rule.weight, ...result});
        }
    }
    return hits.sort((a, b) => b.weight - a.weight)[0] || null;
}

module.exports = {
    CATEGORY,
    CATEGORY_VERDICT,
    SIGNATURES,
    SUITE_RULES,
    matchSignatures,
    matchSuiteRules,
    combineConfidence,
};
