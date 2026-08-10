// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const fs = require('fs');
const path = require('path');

/* eslint-disable no-console -- CI utility reports its selection and fatal input errors */

function filterRerunPlan(rerunPlan, candidateArtifact, candidateAvailable) {
    if (candidateAvailable !== true ||
        !candidateArtifact ||
        candidateArtifact.schema_version !== 2 ||
        candidateArtifact.available !== true ||
        !Array.isArray(candidateArtifact.candidates)) {
        return {
            plan: rerunPlan,
            source: 'fallback',
            reason: 'AI candidates unavailable; using the deterministic unresolved-cluster plan',
        };
    }

    const signatures = new Set(candidateArtifact.candidates.
        map((candidate) => candidate && candidate.cluster_signature).
        filter((signature) => typeof signature === 'string' && signature.length > 0));
    const specs = (rerunPlan.specs || []).filter((entry) => signatures.has(entry.signature_hash));
    return {
        plan: {
            ...rerunPlan,
            enabled: specs.length > 0 && rerunPlan.reps > 0,
            reason: specs.length > 0 ?
                `AI selected ${signatures.size} likely-flaky cluster(s) for measurement` :
                'AI found no likely-flaky clusters requiring rerun',
            specs,
        },
        source: 'ai',
        reason: 'reruns limited to validated AI flaky candidates',
    };
}

function writeSpecLists(outputDir, specs) {
    const byPlatform = new Map();
    for (const entry of specs) {
        if (!byPlatform.has(entry.platform)) {
            byPlatform.set(entry.platform, new Set());
        }
        byPlatform.get(entry.platform).add(entry.spec);
    }
    for (const [platform, platformSpecs] of byPlatform) {
        fs.writeFileSync(
            path.join(outputDir, `spec-list-${platform}.txt`),
            `${[...platformSpecs].join('\n')}\n`,
        );
    }
}

function arg(name, fallback = '') {
    const prefix = `--${name}=`;
    const found = process.argv.find((value) => value.startsWith(prefix));
    return found ?found.slice(prefix.length) :fallback;
}

function main() {
    const evidencePath = arg('evidence');
    const candidatePath = arg('candidates');
    const outputDir = arg('output');
    const candidateAvailable = arg('candidate-available') === 'true';
    if (!evidencePath || !outputDir) {
        throw new Error('--evidence and --output are required');
    }

    const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
    let candidates = null;
    try {
        candidates = candidatePath ?JSON.parse(fs.readFileSync(candidatePath, 'utf8')) :null;
    } catch {
        candidates = null;
    }
    const selected = filterRerunPlan(evidence.rerun_plan, candidates, candidateAvailable);

    fs.mkdirSync(outputDir, {recursive: true});
    fs.writeFileSync(
        path.join(outputDir, 'evidence.json'),
        `${JSON.stringify({
            ...evidence,
            rerun_plan: selected.plan,
            rerun_selection: {source: selected.source, reason: selected.reason},
        }, null, 2)}\n`,
    );
    fs.writeFileSync(
        path.join(outputDir, 'rerun-plan.json'),
        `${JSON.stringify(selected.plan, null, 2)}\n`,
    );
    writeSpecLists(outputDir, selected.plan.specs || []);
    console.log(`${selected.source}: ${selected.reason}; ${selected.plan.specs.length} rerun target(s)`);
}

if (require.main === module) {
    try {
        main();
    } catch (error) {
        console.error(error.message);
        process.exit(1);
    }
}

module.exports = {filterRerunPlan, writeSpecLists};
