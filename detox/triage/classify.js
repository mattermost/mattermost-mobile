// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Cluster failures, apply the deterministic rule classifier, pick a volume tier,
 * and produce a bounded rerun plan.
 *
 * The load-bearing idea: **triage cost scales with the number of distinct causes,
 * not the number of failures.** Eight hundred failures is essentially never eight
 * hundred independent bugs — it is one cause with eight hundred symptoms. So the
 * budget is expressed as "at most K cluster representatives", which keeps the
 * wall clock roughly flat no matter how bad the run was, and the pathological
 * high-volume run ends up being the *cheapest* to triage rather than the most
 * expensive.
 */

const {matchSignatures, matchSuiteRules, combineConfidence} = require('./signatures');

const DEFAULTS = {

    // Above this many failures a rerun stops being evidence-gathering and starts
    // being a second full test run.
    tier3Threshold: 50,

    // Or above this share of the suite, whichever comes first — 50 failures means
    // something different in a 60-test suite than in a 600-test one.
    tier3Share: 0.15,

    // Past this share the run is not a set of failures, it is a broken run.
    tier4Share: 0.5,
    tier1Max: 10,
    maxRerunSpecs: 8,
    maxSpecsPerCluster: 2,
    maxClusters: 10,
    rerunReps: 2,

    // A rule verdict at or above this needs no rerun to corroborate it: proving
    // the runner lost adb by running the tests again wastes ten minutes to learn
    // nothing.
    skipRerunConfidence: 0.9,
};

const EXHAUSTIVE_SUITE_RULES = new Set([
    'suite.expected-reports-unavailable',
    'suite.no-results',
    'suite.all-shards-failed-early',
]);

/**
 * Group failures by signature hash.
 *
 * Members that span shards or platforms are flagged: a cause that reproduces on
 * both iOS and Android is far more likely to be a real code regression than an
 * environment quirk, and a cause confined to one shard is the reverse.
 */
function cluster(failures) {
    const byHash = new Map();
    for (const failure of failures) {
        const key = failure.signature_hash;
        if (!byHash.has(key)) {
            byHash.set(key, {
                signature_hash: key,
                signature_label: failure.signature_label,
                members: [],
            });
        }
        byHash.get(key).members.push(failure);
    }

    return [...byHash.values()].
        map((c) => {
            const shards = new Set(c.members.map((m) => m.shard));
            const platforms = new Set(c.members.map((m) => m.platform));
            const specs = new Set(c.members.map((m) => m.spec).filter(Boolean));
            return {
                ...c,
                member_count: c.members.length,
                spans_shards: shards.size > 1,
                spans_platforms: platforms.size > 1,
                shards: [...shards],
                platforms: [...platforms],
                specs: [...specs],

                // Every cluster starts unmeasured and only the rerun stage may
                // say otherwise. Stated here rather than left absent so that a
                // consumer reading the bundle cannot mistake a missing field for
                // a negative one — which is exactly what the reproduced_on_rerun
                // boolean allowed, and it guards the waiver.
                determinism: 'not_measured',
            };
        }).
        sort((a, b) => b.member_count - a.member_count);
}

/**
 * Decide the volume tier, which determines how much evidence is affordable.
 *
 * Ordered most-severe first: a run that produced nothing is tier 4 regardless of
 * how many failures were counted, because the count itself is meaningless.
 */
function pickTier(summary, failureCount, opts = {}) {
    const o = {...DEFAULTS, ...opts};
    const total = summary.totalTests || 0;
    const share = total > 0 ? failureCount / total : 0;

    if (summary.reportsComplete === false) {
        return {tier: 4, reason: 'one or more expected reports are unavailable — results are incomplete'};
    }
    if (total === 0 || summary.reportsFound === 0) {
        return {tier: 4, reason: 'no usable results were produced — rules only, no model call'};
    }
    if (share > o.tier4Share) {
        return {
            tier: 4,
            reason: `${Math.round(share * 100)}% of the suite failed — this is a broken run, not a set of failures`,
        };
    }
    if (failureCount === 0) {
        return {tier: 0, reason: 'no failures'};
    }
    if (failureCount > o.tier3Threshold || share > o.tier3Share) {
        return {
            tier: 3,
            reason: `${failureCount} failures (${Math.round(share * 100)}% of the suite) — systemic, so analyse suite shape instead of rerunning`,
        };
    }
    if (failureCount <= o.tier1Max) {
        return {tier: 1, reason: `${failureCount} failures — gathering history and targeted rerun evidence`};
    }
    return {
        tier: 2,
        reason: `${failureCount} failures — gathering history and rerunning representative failures`,
    };
}

/**
 * Apply the signature catalogue to one cluster.
 *
 * Matching is done against the *representative* member's combined text rather
 * than every member: members of a cluster share a normalized message by
 * construction, so matching all of them would multiply the cost for an identical
 * answer. The device-log excerpt is included because the discriminating string
 * ("device offline", "NSURLErrorDomain -1200") is as often in the log as in the
 * assertion.
 */
function classifyCluster(clusterRecord, opts = {}) {
    const o = {...DEFAULTS, ...opts};
    const rep = clusterRecord.members[0];
    const text = [rep.error_message, rep.device_log_excerpt].filter(Boolean).join('\n');
    const matches = matchSignatures(text, {framework: rep.framework});

    if (matches.length === 0) {
        return {
            ...clusterRecord,
            matched_signatures: [],
            rule_verdict: null,
            confidence: 0,
            needs_ai: true,
            reason: 'no signature matched — needs adjudication',
        };
    }

    // Only signatures agreeing with the strongest match's verdict contribute
    // confidence. A device signature and a test signature both matching is
    // ambiguity, not corroboration, and summing them would turn a genuinely
    // unclear failure into a confident one.
    const top = matches[0];
    const agreeing = matches.filter((m) => m.verdict === top.verdict);
    const confidence = combineConfidence(agreeing);

    // A shard/suite-scoped signature only means what it says if the cluster
    // actually spans the shard. One test timing out is not "the runner died",
    // even when the text matches.
    const scopeSatisfied = top.scope === 'test' ||
        clusterRecord.member_count > 1 ||
        rep.suite_level;

    return {
        ...clusterRecord,
        matched_signatures: matches,
        rule_verdict: scopeSatisfied ? top.verdict : null,
        confidence: scopeSatisfied ? confidence : Number((confidence / 2).toFixed(3)),
        needs_ai: !scopeSatisfied || confidence < o.skipRerunConfidence,
        reason: scopeSatisfied ?top.label :`${top.label} (matched, but the ${top.scope}-scoped signature is not supported by a single-test cluster)`,
    };
}

function applyContextualRules(clusterRecord, summary) {
    const representative = clusterRecord.members[0];
    const maestroDriverUnavailable =
        representative.framework === 'maestro' &&
        /io\.grpc\.StatusRuntimeException:\s*UNAVAILABLE[\s\S]{0,3000}MaestroDriverGrpc/i.
            test(representative.error_message);
    if (!maestroDriverUnavailable) {
        return clusterRecord;
    }

    const shardRecovered = summary.shards.some((shard) =>
        shard.shard === representative.shard &&
        shard.platform === representative.platform &&
        shard.passed > 0,
    );
    if (!shardRecovered) {
        return clusterRecord;
    }

    return {
        ...clusterRecord,
        matched_signatures: [
            {
                id: 'device.maestro-grpc-unavailable',
                label: 'Maestro lost its device-driver connection',
                verdict: 'FLAKY_INFRA',
                weight: 0.95,
            },
            {
                id: 'device.maestro-shard-recovered',
                label: 'the same Maestro shard completed other flows',
                verdict: 'FLAKY_INFRA',
                weight: 0.95,
            },
        ],
        rule_verdict: 'FLAKY_INFRA',
        confidence: 0.95,
        needs_ai: false,
        reason: 'Maestro temporarily lost its driver connection and recovered within the same shard',
    };
}

/**
 * Choose which specs to rerun.
 *
 * Capped by cluster, not by failure: two representatives per cluster and eight
 * specs overall. That cap is what makes the rerun stage a fixed ~10 minutes at
 * tier 1 and tier 2 alike, instead of growing with the failure count.
 */
function buildRerunPlan(clusters, tier, opts = {}) {
    const o = {...DEFAULTS, ...opts};

    if (tier === 0) {
        return {enabled: false, reason: 'no failures', specs: [], reps: 0};
    }
    if (tier >= 3) {
        return {
            enabled: false,
            reason: 'systemic failure — a rerun would re-run the whole suite to learn what the suite shape already says',
            specs: [],
            reps: 0,
        };
    }

    const unresolved = clusters.filter((c) => c.confidence < o.skipRerunConfidence);

    if (unresolved.length === 0) {
        return {
            enabled: false,
            reason: `every cluster resolved by signature at >= ${o.skipRerunConfidence} confidence`,
            specs: [],
            reps: 0,
        };
    }

    const specs = [];
    const executionSpecs = new Set();
    let skippedNonDetox = 0;
    for (const c of unresolved) {
        let takenFromCluster = 0;

        // Prefer members carrying a stable test ID: those are the ones whose
        // history and amnesty can be looked up, so they buy the most evidence
        // per runner minute.
        const ordered = [...c.members].sort((a, b) => Number(Boolean(b.test_id)) - Number(Boolean(a.test_id)));
        for (const member of ordered) {
            // Only Detox can be rerun from a spec list. Maestro runs named flows,
            // and its "spec" is the JUnit report path — feeding that to the Detox
            // template would fail spec_list validation and take the rerun with it.
            if (member.framework !== 'detox') {
                skippedNonDetox += 1;
                continue;
            }
            if (!member.spec || takenFromCluster >= o.maxSpecsPerCluster) {
                continue;
            }

            // Keep one target per cluster even when several failures share a
            // spec. writeSpecLists deduplicates execution paths, while these
            // target records let the same rerun classify every affected test.
            const executionKey = `${member.platform}::${member.spec}`;
            if (!executionSpecs.has(executionKey) && executionSpecs.size >= o.maxRerunSpecs) {
                continue;
            }
            executionSpecs.add(executionKey);
            specs.push({
                platform: member.platform,
                spec: member.spec,
                test_id: member.test_id,
                framework: member.framework,
                signature_hash: c.signature_hash,
            });
            takenFromCluster += 1;
        }
    }

    let reason;
    if (specs.length > 0) {
        reason = `${executionSpecs.size} representative spec(s) covering ${specs.length} target(s) across ${unresolved.length} unresolved cluster(s)`;
    } else if (skippedNonDetox > 0) {
        reason = `${unresolved.length} unresolved cluster(s), but no Detox spec to rerun (${skippedNonDetox} Maestro failure(s) are not rerunnable by spec list)`;
    } else {
        reason = 'unresolved clusters carry no rerunnable spec path';
    }

    return {
        enabled: specs.length > 0,
        reason,
        specs,
        reps: o.rerunReps,
    };
}

function buildDecision(clusters, suiteVerdict) {
    const suiteVerdictAuthoritative = Boolean(
        suiteVerdict &&
        !suiteVerdict.invalidated_by &&
        EXHAUSTIVE_SUITE_RULES.has(suiteVerdict.rule_id),
    );
    const unresolved = suiteVerdictAuthoritative ?[] :clusters.filter((c) => c.needs_ai);
    return {
        needs_ai: unresolved.length > 0,

        // A suite rule is useful context, but it cannot decide clusters that its
        // evidence did not resolve. This is the prompt contract's explicit guard
        // against a stale suite verdict suppressing model adjudication.
        suite_verdict_authoritative: suiteVerdictAuthoritative,
    };
}

/**
 * Full deterministic pass: cluster → suite rules → per-cluster rules → tier →
 * rerun plan.
 *
 * An exhaustive suite verdict outranks per-cluster verdicts. If every shard died
 * before running a test, what the individual assertion messages say is noise.
 * Shape heuristics remain context and cannot suppress unresolved clusters.
 */
function classify({summary, failures}, opts = {}) {
    const o = {...DEFAULTS, ...opts};
    const clusters = cluster(failures).
        map((c) => classifyCluster(c, o)).
        map((c) => applyContextualRules(c, summary));
    const tierInfo = pickTier(summary, failures.length, o);
    const suiteHit = matchSuiteRules(summary);

    // More distinct causes than a healthy run can plausibly have is itself
    // evidence of one systemic cause, so escalate rather than triaging ten
    // separate things.
    let tier = tierInfo.tier;
    let tierReason = tierInfo.reason;
    if (tier <= 2 && clusters.length > o.maxClusters) {
        tier = 3;
        tierReason = `${clusters.length} distinct failure clusters exceeds the ${o.maxClusters} expected of an isolated cause — treating as systemic`;
    }

    const suiteVerdict = suiteHit ?{
        verdict: suiteHit.verdict,
        confidence: suiteHit.weight,
        reason: suiteHit.reason,
        rule_id: suiteHit.id,
    } :null;
    const decision = buildDecision(clusters, suiteVerdict);
    if (tier === 4 && decision.needs_ai) {
        tier = 3;
        tierReason = `${tierReason} — unresolved causes still require adjudication`;
    }
    const rerunPlan = buildRerunPlan(clusters, tier, o);
    const suiteSignal = suiteVerdict ?{
        ...suiteVerdict,
        authoritative: decision.suite_verdict_authoritative,
    } :null;

    return {
        tier,
        tier_reason: tierReason,
        summary,

        // Keep the legacy field authoritative-only: the pinned toolkit treats
        // any truthy suite_verdict as exhaustive and would otherwise discard
        // per-cluster model decisions.
        suite_verdict: decision.suite_verdict_authoritative ?suiteSignal :null,
        suite_signal: suiteSignal,
        clusters: clusters.map((c) => ({
            signature_hash: c.signature_hash,
            signature_label: c.signature_label,
            member_count: c.member_count,
            spans_shards: c.spans_shards,
            spans_platforms: c.spans_platforms,
            shards: c.shards,
            platforms: c.platforms,
            specs: c.specs,
            matched_signatures: c.matched_signatures,
            rule_verdict: c.rule_verdict,
            confidence: c.confidence,
            needs_ai: c.needs_ai,
            reason: c.reason,

            // Only the representative travels to the model; the rest are counted.
            representative: c.members[0],
            member_test_ids: c.members.map((m) => m.test_id).filter(Boolean),
        })),
        rerun_plan: rerunPlan,
        needs_ai: decision.needs_ai,
    };
}

module.exports = {
    DEFAULTS,
    cluster,
    pickTier,
    classifyCluster,
    buildRerunPlan,
    buildDecision,
    applyContextualRules,
    classify,
};
