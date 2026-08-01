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

/**
 * Read one repetition's artifact directory.
 *
 * A repetition whose report is missing or empty is recorded as unusable rather
 * than as a pass. Treating "no report" as "it passed" would let a rerun that
 * never ran manufacture a flaky verdict — the single most dangerous way this
 * stage could fail.
 */
function readRepetition(artifactRoot) {
    const {summary, failures} = collect(artifactRoot);
    return {
        usable: summary.reportsFound > 0 && summary.totalTests > 0,
        summary,
        failedSpecs: new Set(failures.map((f) => f.spec).filter(Boolean)),
        failedTestIds: new Set(failures.map((f) => f.test_id).filter(Boolean)),
    };
}

/**
 * Decide one spec's rerun outcome across repetitions.
 */
function specOutcome(spec, testId, reps) {
    const usable = reps.filter((r) => r.usable);
    if (usable.length === 0) {
        return {outcome: OUTCOME.INCONCLUSIVE, reps: 0, failed_reps: 0};
    }
    const failed = usable.filter(
        (r) => r.failedSpecs.has(spec) || (testId && r.failedTestIds.has(testId)),
    ).length;

    let outcome;
    if (failed === usable.length) {
        outcome = OUTCOME.DETERMINISTIC;
    } else if (failed > 0) {
        outcome = OUTCOME.FLAKY;
    } else {
        outcome = OUTCOME.PASSED;
    }
    return {outcome, reps: usable.length, failed_reps: failed};
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

    const bySignature = new Map();
    for (const entry of planned) {
        const outcome = specOutcome(entry.spec, entry.test_id, reps);
        if (!bySignature.has(entry.signature_hash)) {
            bySignature.set(entry.signature_hash, []);
        }
        bySignature.get(entry.signature_hash).push({spec: entry.spec, ...outcome});
    }

    const clusters = evidence.clusters.map((c) => {
        const specs = bySignature.get(c.signature_hash);
        if (!specs || specs.length === 0) {
            return c;
        }
        const usable = specs.filter((s) => s.outcome !== OUTCOME.INCONCLUSIVE);
        if (usable.length === 0) {
            return {...c, rerun: {outcome: OUTCOME.INCONCLUSIVE, specs}};
        }

        const allDeterministic = usable.every((s) => s.outcome === OUTCOME.DETERMINISTIC);
        const nonePassed = usable.every((s) => s.outcome !== OUTCOME.PASSED);
        let outcome;
        if (allDeterministic) {
            outcome = OUTCOME.DETERMINISTIC;
        } else if (nonePassed) {
            outcome = OUTCOME.FLAKY;
        } else {
            outcome = usable.some((s) => s.outcome === OUTCOME.DETERMINISTIC) ?OUTCOME.FLAKY :OUTCOME.PASSED;
        }

        return {
            ...c,
            rerun: {outcome, specs, reps: reps.filter((r) => r.usable).length},

            // The flag the policy engine reads. A cluster that reproduced on every
            // repetition cannot be waived as flakiness no matter how confident a
            // model is about the error text — this is the measurement overruling
            // the inference, which is the whole reason the rerun exists.
            reproduced_on_rerun: outcome === OUTCOME.DETERMINISTIC,

            // Evidence going the other way is what earns a flake verdict its
            // second, independent citation.
            cleared_on_rerun: outcome === OUTCOME.PASSED || outcome === OUTCOME.FLAKY,
        };
    });

    return {
        ...evidence,
        clusters,
        rerun_meta: {
            repetitions: reps.length,
            usable_repetitions: reps.filter((r) => r.usable).length,
            specs_rerun: planned.length,
        },
    };
}

module.exports = {mergeRerun, readRepetition, specOutcome, OUTCOME};
