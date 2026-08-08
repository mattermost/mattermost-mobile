// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Merge targeted-rerun results back into the evidence bundle.
 *
 * The rerun is the one experiment that turns "flaky" from an inference into a
 * measurement. A failure that reproduces on every repetition is deterministic
 * whatever its error text looks like; one that stops reproducing is
 * non-deterministic by definition. Nothing else in the pipeline can establish
 * that — history is suggestive, signatures are heuristics, this is evidence.
 *
 * Each repetition is a separate run of the same spec list on a fresh device, so
 * the reps are independent samples rather than retries of one attempt.
 */

const {buildDecision} = require('./classify');
const {collect} = require('./collect');

const OUTCOME = {

    // Failed every repetition. Cannot be flakiness — something is reliably broken.
    DETERMINISTIC: 'deterministic',

    // Failed some repetitions and passed others. Non-determinism, confirmed.
    FLAKY: 'flaky',

    // Passed every repetition. Either flaky or a transient environment problem.
    PASSED: 'passed',

    // The rerun produced nothing usable, so it adds no evidence either way.
    INCONCLUSIVE: 'inconclusive',
};
const MEASURED_RERUN_CONFIDENCE = 0.95;

/**
 * Read one repetition's artifact directory.
 *
 * A repetition whose report is missing or empty is recorded as unusable rather
 * than as a pass. Treating "no report" as "it passed" would let a rerun that
 * never ran manufacture a flaky verdict — the single most dangerous way this
 * stage could fail.
 */
function readRepetition(artifactRoot) {
    const {summary, failures, reports} = collect(artifactRoot);
    return {
        usable: summary.reportsFound > 0 && summary.totalTests > 0,
        summary,
        reports,
        failures,
    };
}

/**
 * Decide one spec's rerun outcome across repetitions.
 */
function specOutcome(spec, testId, platform, reps, plannedReps = reps.length) {
    if (reps.length !== plannedReps) {
        return {
            outcome: OUTCOME.INCONCLUSIVE,
            reps: reps.length,
            failed_reps: 0,
            incomplete: true,
        };
    }

    let failed = 0;
    let targetReps = 0;
    for (const rep of reps) {
        const targetReport = (rep.reports || []).find((report) => (
            report.framework === 'detox' &&
            report.platform === platform &&
            report.usable &&
            report.specs.includes(spec) &&
            report.executed_specs.includes(spec) &&
            (!testId || report.test_ids.includes(testId))
        ));
        if (!targetReport) {
            return {
                outcome: OUTCOME.INCONCLUSIVE,
                reps: targetReps,
                failed_reps: failed,
                incomplete: true,
            };
        }
        targetReps += 1;

        const targetFailed = (rep.failures || []).some((failure) => (
            failure.platform === platform &&
            (testId ? failure.test_id === testId : failure.spec === spec)
        ));
        if (targetFailed) {
            failed += 1;
        }
    }

    let outcome;
    if (failed === plannedReps) {
        outcome = OUTCOME.DETERMINISTIC;
    } else if (failed > 0) {
        outcome = OUTCOME.FLAKY;
    } else {
        outcome = OUTCOME.PASSED;
    }

    return {outcome, reps: plannedReps, failed_reps: failed};
}

function hasUsablePlatformReport(rep, platform) {
    return rep.reports.some(
        (report) => report.framework === 'detox' && report.platform === platform && report.usable,
    );
}

/**
 * Attach rerun outcomes to the clusters they were gathered for.
 *
 * A cluster is only called deterministic when *every* rerun spec belonging to it
 * reproduced. One member reproducing while another did not is mixed evidence,
 * and mixed evidence is non-determinism — so it reads as flaky rather than as
 * deterministic.
 */
function mergeRerun(evidence, repetitions) {
    const reps = repetitions.map(readRepetition);
    const planned = (evidence.rerun_plan && evidence.rerun_plan.specs) || [];
    const plannedReps = Number((evidence.rerun_plan && evidence.rerun_plan.reps) || 0);

    const bySignature = new Map();
    for (const entry of planned) {
        const outcome = specOutcome(entry.spec, entry.test_id, entry.platform, reps, plannedReps);
        if (!bySignature.has(entry.signature_hash)) {
            bySignature.set(entry.signature_hash, []);
        }
        bySignature.get(entry.signature_hash).push({spec: entry.spec, ...outcome});
    }
    const plannedOutcomes = [...bySignature.values()].flat();
    const rerunComplete = planned.length > 0 &&
        plannedReps > 0 &&
        reps.length === plannedReps &&
        plannedOutcomes.length === planned.length &&
        plannedOutcomes.every((outcome) => !outcome.incomplete && outcome.outcome !== OUTCOME.INCONCLUSIVE);

    const clusters = evidence.clusters.map((c) => {
        const specs = bySignature.get(c.signature_hash);
        if (!specs || specs.length === 0) {
            return c;
        }
        if (specs.some((s) => s.outcome === OUTCOME.INCONCLUSIVE)) {
            return {...c, rerun: {outcome: OUTCOME.INCONCLUSIVE, specs}};
        }

        const allDeterministic = specs.every((s) => s.outcome === OUTCOME.DETERMINISTIC);
        const nonePassed = specs.every((s) => s.outcome !== OUTCOME.PASSED);
        let outcome;
        if (allDeterministic) {
            outcome = OUTCOME.DETERMINISTIC;
        } else if (nonePassed) {
            outcome = OUTCOME.FLAKY;
        } else {
            outcome = specs.some((s) => s.outcome === OUTCOME.DETERMINISTIC) ?OUTCOME.FLAKY :OUTCOME.PASSED;
        }

        const measured = {
            ...c,
            rerun: {outcome, specs, reps: reps.filter((r) => r.usable).length},

            // The flag the policy engine reads. A cluster that reproduced on every
            // repetition cannot be waived as flakiness no matter how confident a
            // model is about the error text — this is the measurement overruling
            // the inference, which is the whole reason the rerun exists.
            reproduced_on_rerun: outcome === OUTCOME.DETERMINISTIC,
        };

        if (!rerunComplete) {
            return measured;
        }

        if (outcome === OUTCOME.PASSED || outcome === OUTCOME.FLAKY) {
            const rerunCitations = Array.from({length: plannedReps}, (_, index) => ({
                id: `rerun.measurement.${index + 1}`,
                label: `targeted rerun repetition ${index + 1}`,
                verdict: 'FLAKY_TEST',
                weight: MEASURED_RERUN_CONFIDENCE,
            }));
            return {
                ...measured,
                matched_signatures: [...(measured.matched_signatures || []), ...rerunCitations],
                rule_verdict: 'FLAKY_TEST',
                confidence: MEASURED_RERUN_CONFIDENCE,
                needs_ai: false,
                reason: `targeted rerun measured ${outcome} across every planned repetition and platform target`,
                cleared_on_rerun: true,
                rerun_evidence: {
                    complete: true,
                    verdict: 'FLAKY_TEST',
                    confidence: MEASURED_RERUN_CONFIDENCE,
                    waivable: true,
                    basis: 'all planned rerun repetitions and platform targets completed',
                },
            };
        }

        return {
            ...measured,
            needs_ai: true,
            rerun_evidence: {
                complete: true,
                verdict: 'DETERMINISTIC_FAILURE',
                confidence: MEASURED_RERUN_CONFIDENCE,
                waivable: false,
                basis: 'failure reproduced across all planned rerun repetitions and platform targets',
            },
        };
    });

    const priorSuiteSignal = evidence.suite_verdict || evidence.suite_signal;
    const suiteVerdictCandidate = priorSuiteSignal && planned.length > 0 ?{
        ...priorSuiteSignal,
        invalidated_by: 'targeted_rerun_evidence',
    } :priorSuiteSignal;
    const decision = buildDecision(clusters, suiteVerdictCandidate);
    const suiteSignal = suiteVerdictCandidate ?{
        ...suiteVerdictCandidate,
        authoritative: decision.suite_verdict_authoritative,
    } :null;

    return {
        ...evidence,
        suite_verdict: decision.suite_verdict_authoritative ?suiteSignal :null,
        suite_signal: suiteSignal,
        clusters,
        decision,
        needs_ai: decision.needs_ai,
        rerun_meta: {
            repetitions: reps.length,
            expected_repetitions: plannedReps,
            usable_repetitions: reps.filter((r) => r.usable).length,
            specs_rerun: planned.length,
            complete: rerunComplete,
            platforms: [...new Set(planned.map((entry) => entry.platform))].map((platform) => ({
                platform,
                usable_repetitions: reps.filter((rep) => hasUsablePlatformReport(rep, platform)).length,
            })),
        },
    };
}

module.exports = {mergeRerun, readRepetition, specOutcome, OUTCOME};
