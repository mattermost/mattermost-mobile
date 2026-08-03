// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * TSIO history enrichment for triage.
 *
 * History is what makes triage cheap. If TSIO says a test failed the last six
 * runs on main, no baseline rerun is needed to know the PR did not break it —
 * an indexed query has replaced ten minutes of runner time. Every failure that
 * history can resolve is a failure the rerun stage never has to look at.
 *
 * Fail-soft throughout: TSIO being unreachable must degrade the evidence, never
 * fail the triage job. Missing history simply means a cluster keeps `needs_ai`
 * and a lower confidence, which resolves red — the correct direction to fail.
 */

const PRODUCTION_URL = 'https://test-io.test.mattermost.com';
const FETCH_TIMEOUT_MS = 10_000;

// Above this many distinct tests, per-test lookups stop being worth the wall
// clock; at that volume the run is systemic and the suite shape decides it.
const MAX_LOOKUPS = 25;

async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, {signal: controller.signal});
        if (!res.ok) {
            return {error: `${res.status} ${res.statusText}`};
        }
        return {data: await res.json()};
    } catch (err) {
        return {error: err.message};
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Look up one test's history, current cross-PR failures, and amnesty state.
 *
 * The three are fetched together because they are always used together: a
 * verdict needs to know whether the test is historically unstable, whether it is
 * failing elsewhere right now, and whether it has any waiver budget left.
 */
async function lookupTest({baseUrl, repo, testId, branch, excludePr, framework}) {
    const qs = (params) => new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
    ).toString();

    const [history, elsewhere, amnesty] = await Promise.all([
        fetchJson(`${baseUrl}/api/v1/tests/history?${qs({
            test_id: testId, repo, branch, framework, limit: 20,
        })}`),
        fetchJson(`${baseUrl}/api/v1/tests/failing-elsewhere?${qs({
            test_id: testId, repo, window: '24h', exclude_pr: excludePr,
        })}`),
        fetchJson(`${baseUrl}/api/v1/triage/amnesty?${qs({
            test_id: testId, repo, branch,
        })}`),
    ]);

    return {
        test_id: testId,
        history: history.data?.summary || null,
        history_error: history.error || null,
        failing_elsewhere: elsewhere.data ?{
            distinct_prs: elsewhere.data.distinct_prs,
            distinct_branches: elsewhere.data.distinct_branch,
        } :null,
        amnesty: amnesty.data || null,
        amnesty_error: amnesty.error || null,
    };
}

/**
 * Enrich a classified result in place-ish (returns a new object).
 *
 * Only tests carrying a stable ID can be looked up; the rest keep null history,
 * which is itself information — an unidentified test cannot be given amnesty,
 * because there is nothing to count waivers against.
 */
async function enrich(classified, {repo, baselineBranch = 'main', prNumber, baseUrl = PRODUCTION_URL} = {}) {
    const testIds = [];
    for (const c of classified.clusters) {
        for (const id of c.member_test_ids) {
            if (id && !testIds.includes(id)) {
                testIds.push(id);
            }
        }
    }

    const truncated = testIds.length > MAX_LOOKUPS;
    const lookups = testIds.slice(0, MAX_LOOKUPS);
    const results = await Promise.all(lookups.map((testId) => lookupTest({
        baseUrl,
        repo,
        testId,
        branch: baselineBranch,
        excludePr: prNumber,
        framework: undefined,
    })));

    const byId = new Map(results.map((r) => [r.test_id, r]));

    const clusters = classified.clusters.map((c) => {
        const entries = c.member_test_ids.map((id) => byId.get(id)).filter(Boolean);
        return {
            ...c,
            history: entries,

            // A cluster where every identified member was already failing on the
            // baseline branch is a main regression, and no rerun will change that.
            // Requiring *every* member rather than any avoids calling a mixed
            // cluster pre-existing on the strength of one stale test.
            all_failing_on_baseline: entries.length > 0 && entries.every(
                (e) => e.history && e.history.failing_since_commit,
            ),
            any_failing_elsewhere: entries.some(
                (e) => e.failing_elsewhere && e.failing_elsewhere.distinct_prs > 0,
            ),
            // An unreachable amnesty endpoint counts as exhausted.
            //
            // This read `e.amnesty.granted === false`, so "TSIO said no" and "TSIO
            // did not answer" both produced false — a TSIO outage silently removed
            // the amnesty veto, and every waiver granted during the outage was
            // also unrecorded, because the ledger write was failing for the same
            // reason. Losing the budget check is precisely when it should bite.
            amnesty_exhausted: entries.some(
                (e) => (e.amnesty && e.amnesty.granted === false) || Boolean(e.amnesty_error),
            ),
            amnesty_unavailable: entries.some((e) => Boolean(e.amnesty_error)),
        };
    });

    return {
        ...classified,
        clusters,
        history_meta: {
            base_url: baseUrl,
            looked_up: lookups.length,
            truncated,
            unavailable: results.filter((r) => r.history_error).length,
        },
    };
}

module.exports = {enrich, lookupTest, PRODUCTION_URL, MAX_LOOKUPS};
