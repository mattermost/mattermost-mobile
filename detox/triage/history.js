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

        // A TSIO deployment without the triage routes serves its single-page app
        // on every unmatched path, so a missing endpoint arrives as 200
        // text/html rather than a 404. res.ok is true and res.json() then fails
        // with `Unexpected token '<'`, which is recorded as history_error and
        // — because unavailable history counts as spent amnesty — quietly turns
        // every confirmed flake into a regression. That is the correct direction
        // to fail, but the reason has to be legible: the message below names the
        // deployment gap instead of leaving a JSON parse error to be traced back
        // through three repositories.
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('json')) {
            return {error: `endpoint not served by this TSIO deployment (${res.status} ${contentType || 'no content-type'})`};
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
 * Was this cluster's test failing on the baseline branch?
 *
 * `unknown` is a first-class answer and covers three distinct situations that a
 * boolean flattened into "no": the lookup failed, no member carried a stable ID
 * to look up, or TSIO answered successfully with no recorded runs. The last is
 * the common one on a new test or a freshly migrated deployment, and it is the
 * one that previously read as "this test is green on main".
 *
 * `failing` requires every identified member to be failing, matching the old
 * boolean: one stale member must not make a mixed cluster pre-existing.
 */
function baselineStatus(entries) {
    if (entries.length === 0 || entries.some((e) => e.history_error)) {
        return 'unknown';
    }

    // lookupTest stores `history.data.summary` directly, so the run count and
    // failing_since_commit are both properties of `e.history`. A successful
    // response with runs === 0 is the case this whole field exists for: TSIO
    // answered, and the answer is that it has never seen this test.
    const observed = entries.filter((e) => e.history && e.history.runs > 0);
    if (observed.length !== entries.length) {
        return 'unknown';
    }
    return entries.every((e) => e.history.failing_since_commit) ? 'failing' : 'passing';
}

/**
 * Is the same test failing on unrelated pull requests right now?
 *
 * `isolated` is a real finding — it is what makes "this PR caused it" credible.
 * It must therefore not be returned when the question was never asked, which is
 * what the boolean did.
 */
function concurrentFailure(entries) {
    // There is no separate failing_elsewhere_error: lookupTest sets the field to
    // null both when the request failed and when no PR number was supplied, so a
    // null entry is precisely "not answered" and covers both.
    if (entries.length === 0) {
        return 'unknown';
    }

    // A present object is not an answer. Without a PR number the endpoint is
    // still called and returns a body with no distinct_prs, and `undefined > 0`
    // is false — which would report "no other PR is affected" on the strength of
    // a field that was never populated. Require the count to actually be a
    // number.
    const answered = entries.filter((e) => e.failing_elsewhere &&
        Number.isFinite(e.failing_elsewhere.distinct_prs));
    if (answered.length !== entries.length) {
        return 'unknown';
    }
    return answered.some((e) => e.failing_elsewhere.distinct_prs > 0) ? 'elsewhere' : 'isolated';
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
        const stableTestIds = c.member_test_ids.filter(Boolean);
        const entries = stableTestIds.map((id) => byId.get(id)).filter(Boolean);
        const hasStableTestIds = stableTestIds.length > 0;
        const allMembersHaveStableTestIds = hasStableTestIds && stableTestIds.length === c.member_count;
        const historyOrAmnestyUnavailable = entries.length !== stableTestIds.length || entries.some(
            (e) => Boolean(e.history_error) || Boolean(e.amnesty_error),
        );
        return {
            ...c,
            history: entries,
            has_stable_test_ids: hasStableTestIds,
            all_members_have_stable_test_ids: allMembersHaveStableTestIds,

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

            // The tri-state forms of the two booleans above, and the reason they
            // exist: `false` there means both "measured, and it is not so" and
            // "never measured". The adjudication prompt documents only the true
            // case, so a model reading false concluded the negative had been
            // established. On mattermost-mobile#9996 run 31874108751 that turned
            // an empty history — a freshly migrated TSIO, no main runs recorded —
            // into "this test passes on main", and from there into PR_REGRESSION
            // against a pull request whose diff was entirely CI configuration.
            //
            // A field that cannot say "unknown" does not fail closed. It fails
            // silently, in whichever direction the reader assumes.
            baseline_status: baselineStatus(entries),
            concurrent_failure: concurrentFailure(entries),

            // A cluster without a stable test ID cannot be granted amnesty:
            // there is no durable identity against which to count waivers.
            // Likewise, unavailable history or amnesty data counts as exhausted.
            //
            // This must stay conservative when only one TSIO endpoint fails:
            // partial history cannot establish eligibility, and an outage may
            // also prevent granted waivers from being recorded.
            amnesty_exhausted: !allMembersHaveStableTestIds || historyOrAmnestyUnavailable || entries.some(
                (e) => e.amnesty && e.amnesty.granted === false,
            ),
            amnesty_ineligible: !allMembersHaveStableTestIds,
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
