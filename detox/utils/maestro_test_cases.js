// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console, no-process-env */

const fs = require('fs');
const path = require('path');

const {parseMaestroReport} = require('./maestro_report');
const {createTestCycle, createTestExecutions} = require('./test_cases');

const MM_T_TAG = /^MM-T\d+(?:_\d+)?$/;

function normalizeFlowPath(flowPath) {
    return String(flowPath || '').replace(/\\/g, '/');
}

function readTagsFromFlowYaml(content) {
    const tags = [];
    let inTags = false;

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed.startsWith('tags:')) {
            inTags = true;
            continue;
        }

        if (inTags) {
            if (trimmed.startsWith('- ')) {
                const tag = trimmed.slice(2).split(/\s+/)[0];
                if (MM_T_TAG.test(tag)) {
                    tags.push(tag);
                }
            } else if (trimmed && !line.startsWith(' ')) {
                inTags = false;
            }
        }
    }

    return tags;
}

function resolveMaestroFlowsRoots(repoRoot) {
    const candidates = [
        path.join(repoRoot, 'e2e/maestro/flows'),
        path.join(repoRoot, 'detox/maestro/flows'),
        path.join(repoRoot, 'maestro/flows'),
    ];
    return candidates.filter((dir) => fs.existsSync(dir));
}

function buildFlowTagsMap(repoRoot) {
    const map = {};

    for (const flowsRoot of resolveMaestroFlowsRoots(repoRoot)) {
        const walk = (dir) => {
            for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walk(fullPath);
                    continue;
                }

                if (!entry.name.endsWith('.yml')) {
                    continue;
                }

                const tags = readTagsFromFlowYaml(fs.readFileSync(fullPath, 'utf-8'));
                if (!tags.length) {
                    continue;
                }

                const relativePath = normalizeFlowPath(path.relative(repoRoot, fullPath));
                const underFlows = normalizeFlowPath(path.relative(flowsRoot, fullPath));
                map[relativePath] = tags;

                // Alias keys so JUnit `file=` values from either layout still resolve.
                map[underFlows] = tags;
                map[`flows/${underFlows}`] = tags;
                map[entry.name] = tags;
            }
        };

        walk(flowsRoot);
    }

    return map;
}

function extractTestCaseKey(tag) {
    const match = tag.match(/(MM-T\d+)/);
    return match ? match[0] : null;
}

function maestroSummaryToAllTests(summary, repoRoot) {
    const tagsByFlow = buildFlowTagsMap(repoRoot);
    let incrementalDuration = 0;
    const tests = [];

    for (const flow of summary.flows) {
        const normalizedFile = normalizeFlowPath(flow.file);
        const basename = path.basename(normalizedFile);
        const tags = tagsByFlow[normalizedFile] ||
            tagsByFlow[normalizedFile.split('flows/').pop()] ||
            tagsByFlow[`flows/${normalizedFile.split('flows/').pop()}`] ||
            tagsByFlow[basename] ||
            [];

        const keys = [...new Set(
            tags.map(extractTestCaseKey).filter(Boolean),
        )];

        if (!keys.length) {
            console.log(`Maestro Zephyr: skipping flow without MM-T tag (${flow.name || normalizedFile})`);
            continue;
        }

        let state = 'failed';
        if (flow.status === 'passed') {
            state = 'passed';
        } else if (flow.status === 'skipped') {
            state = 'skipped';
        }
        const durationMs = Math.round((flow.time || 0) * 1000);
        incrementalDuration += durationMs;

        for (const key of keys) {
            tests.push({
                name: `${key} - ${basename || flow.name}`,
                time: durationMs,
                incrementalDuration,
                state,
                pass: state === 'passed',
                fail: state === 'failed',
                pending: state === 'skipped',
            });
        }
    }

    return {
        start: summary.stats.start,
        end: summary.stats.end,
        tests,
    };
}

async function saveMaestroTestCases(xmlPath, repoRoot = path.join(__dirname, '../..')) {
    const summary = parseMaestroReport(xmlPath);
    if (!summary) {
        console.log('Maestro Zephyr: no report to save');
        return null;
    }

    const allTests = maestroSummaryToAllTests(summary, repoRoot);
    if (!allTests.tests.length) {
        console.log('Maestro Zephyr: no MM-T tagged flows found in report');
        return null;
    }

    const testCycle = await createTestCycle(allTests.start, allTests.end, {framework: 'Maestro'});
    if (!testCycle?.key) {
        console.log('Maestro Zephyr: failed to create test cycle');
        return null;
    }

    await createTestExecutions(allTests, testCycle, {framework: 'Maestro'});
    return testCycle;
}

module.exports = {
    buildFlowTagsMap,
    maestroSummaryToAllTests,
    saveMaestroTestCases,
};
