// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

const fse = require('fs-extra');
const glob = require('glob');
const path = require('path');
const processor = require('jest-stare');
const { ARTIFACTS_DIR } = require('./constants');

function flatten(items) {
    return items.reduce((acc, arr) => [...acc, ...arr], []);
}

function flatMap(fn) {
    return (items) => flatten(items.map(fn));
}

const collectSourceFiles = flatMap((pattern) => {
    const files = glob.sync(pattern);
    if (!files.length) {
        console.warn(`Pattern ${pattern} matched no report files`);
        return [];
    }
    return files;
});

function collectReportFiles(files) {
    return Promise.all(
        files.map((filename) =>
            fse.readJson(filename).catch((err) => {
                console.error(`Failed to read JSON file ${filename}:`, err);
                return null;
            })
        )
    ).then((results) => results.filter((r) => r !== null));
}

function collectScreenshots(platform, testName, result) {
    console.log(`Collecting screenshots for test "${testName}" on platform ${platform}`);
    if (!testName || result.status !== 'failed') {
        console.log(`Skipping screenshot collection for test "${testName}" on platform ${platform}`);
        return [];
    }

    const failureTypes = [
        'testFnFailure.png',
        'beforeEachFailure.png',
        'afterEachFailure.png',
        'beforeAllFailure.png',
        'afterAllFailure.png',
    ];

    // The test name from jest results is used as a directory name for artifacts.
    // We need to find the corresponding directory and then the screenshots inside it.
    const searchPath = path.join(
        ARTIFACTS_DIR,
        `${platform}-results-*`,
        `*${platform}.emu.debug*`,
        testName
    );

    const screenshotPaths = glob.sync(path.join(searchPath, `*(${failureTypes.join('|')})`));
    const resolvedPaths = screenshotPaths.map(file => path.resolve(file));

    console.log(`Searching for screenshots in: ${searchPath}`);
    console.log(`Found screenshot paths: ${JSON.stringify(resolvedPaths)}`);

    if (resolvedPaths.length > 0) {
        console.log(`Found screenshots for "${testName}": ${JSON.stringify(resolvedPaths)}`);
    } else {
        console.warn(`No screenshots found for test "${testName}" on platform ${platform}. Searched in: ${searchPath}`);
    }

    return resolvedPaths;
}

function collectScreenshots(platform, testName, result) {
    console.log(`Collecting screenshots for test "${testName}" on platform ${platform}`);
    if (!testName || result.status !== 'failed') {
        console.log(`Skipping screenshot collection for test "${testName}" on platform ${platform}`);
        return [];
    }

    const failureTypes = [
        'testFnFailure.png',
        'beforeEachFailure.png',
        'afterEachFailure.png',
        'beforeAllFailure.png',
        'afterAllFailure.png',
    ];

    // The test name from jest results is used as a directory name for artifacts.
    // We need to find the corresponding directory and then the screenshots inside it.
    const searchPath = path.join(
        ARTIFACTS_DIR,
        `${platform}-results-*`,
        `*${platform}.emu.debug*`,
        testName
    );

    const screenshotPaths = glob.sync(path.join(searchPath, `*(${failureTypes.join('|')})`));
    const resolvedPaths = screenshotPaths.map(file => path.resolve(file));

    console.log(`Searching for screenshots in: ${searchPath}`);
    console.log(`Found screenshot paths: ${JSON.stringify(resolvedPaths)}`);

    if (resolvedPaths.length > 0) {
        console.log(`Found screenshots for "${testName}": ${JSON.stringify(resolvedPaths)}`);
    } else {
        console.warn(`No screenshots found for test "${testName}" on platform ${platform}. Searched in: ${searchPath}`);
    }

    return resolvedPaths;
}

function collectReportSuites(reports, platform) {
    let numFailedTestSuites = 0;
    let numFailedTests = 0;
    let numPassedTestSuites = 0;
    let numPassedTests = 0;
    let numPendingTestSuites = 0;
    let numPendingTests = 0;
    let numRuntimeErrorTestSuites = 0;
    let numTodoTests = 0;
    let numTotalTestSuites = 0;
    let numTotalTests = 0;
    let openHandles = [];
    const snapshot = {
        added: 0,
        didUpdate: false,
        failure: false,
        filesAdded: 0,
        filesRemoved: 0,
        filesRemovedList: [],
        filesUnmatched: 0,
        filesUpdated: 0,
        matched: 0,
        total: 0,
        unchecked: 0,
        uncheckedKeysByFile: [],
        unmatched: 0,
        updated: 0,
    };
    let startTime = 0;
    let success = true;
    let testResults = [];
    let wasInterrupted = false;

    reports.forEach((report) => {
        numFailedTestSuites += report.numFailedTestSuites || 0;
        numFailedTests += report.numFailedTests || 0;
        numPassedTestSuites += report.numPassedTestSuites || 0;
        numPassedTests += report.numPassedTests || 0;
        numPendingTestSuites += report.numPendingTestSuites || 0;
        numPendingTests += report.numPendingTests || 0;
        numRuntimeErrorTestSuites += report.numRuntimeErrorTestSuites || 0;
        numTodoTests += report.numTodoTests || 0;
        numTotalTestSuites += report.numTotalTestSuites || 0;
        numTotalTests += report.numTotalTests || 0;
        openHandles = openHandles.concat(report.openHandles || []);
        snapshot.added += report.snapshot?.added || 0;
        snapshot.didUpdate = snapshot.didUpdate || report.snapshot?.didUpdate || false;
        snapshot.failure = snapshot.failure || report.snapshot?.failure || false;
        snapshot.filesAdded += report.snapshot?.filesAdded || 0;
        snapshot.filesRemoved += report.snapshot?.filesRemoved || 0;
        snapshot.filesRemovedList = snapshot.filesRemovedList.concat(report.snapshot?.filesRemovedList || []);
        snapshot.filesUnmatched += report.snapshot?.filesUnmatched || 0;
        snapshot.filesUpdated += report.snapshot?.filesUpdated || 0;
        snapshot.matched += report.snapshot?.matched || 0;
        snapshot.total += report.snapshot?.total || 0;
        snapshot.unchecked += report.snapshot?.unchecked || 0;
        snapshot.uncheckedKeysByFile = snapshot.uncheckedKeysByFile.concat(report.snapshot?.uncheckedKeysByFile || []);
        snapshot.unmatched += report.snapshot?.unmatched || 0;
        snapshot.updated += report.snapshot?.updated || 0;
        startTime = startTime === 0 ? report.startTime : Math.min(startTime, report.startTime || Infinity);
        success = success && report.success !== false;
        if (report.testResults) {
            console.log(`Processing test results for platform ${platform}`);
            report.testResults.forEach((suite) => {
                console.log(`Processing suite: ${suite.displayName || suite.name}`);
                if (suite.assertionResults) {
                    console.log(`Processing assertion results for suite: ${suite.displayName || suite.name}`);
                    suite.assertionResults.forEach((result) => {
                        console.log(`Processing result: ${result.fullName || result.title}`);
                        const testName = result.fullName || result.title;
                        if (testName) {
                            console.log(`Collecting screenshots for test "${testName}" on platform ${platform}`);
                            // Collect screenshots for the test result
                            result.screenshots = collectScreenshots(platform, testName, result);
                        }
                    });
                }
            });
            testResults = testResults.concat(report.testResults);
        }
        wasInterrupted = wasInterrupted || report.wasInterrupted || false;
    });

    return {
        numFailedTestSuites,
        numFailedTests,
        numPassedTestSuites,
        numPassedTests,
        numPendingTestSuites,
        numPendingTests,
        numRuntimeErrorTestSuites,
        numTodoTests,
        numTotalTestSuites,
        numTotalTests,
        openHandles,
        snapshot,
        startTime,
        success,
        testResults,
        wasInterrupted,
    };
}

async function generateJestStareHtmlReport(outputDir, outputFile, inputFilePath, platform) {
    const suites = fse.readJsonSync(inputFilePath);
    const environment = fse.readJsonSync(path.join(ARTIFACTS_DIR, 'environment.json'));
    const customTemplate = 
`;
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${platform} Mobile App E2E Report</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { font-family: 'Inter', sans-serif; }
        .screenshot-container {
            display: none;
            padding-left: 20px;
            border-left: 2px solid #e5e7eb;
            margin-left: 20px;
        }
        .screenshot {
            max-width: 100%;
            height: auto;
            margin-top: 10px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
        }
        .summary-card { background: linear-gradient(135deg, #f3f4f6, #ffffff); }
        .stat-box { transition: transform 0.2s; }
        .stat-box:hover { transform: scale(1.05); }
        .collapsible {
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            color: #1d4ed8;
        }
        .collapsible .arrow {
            transition: transform 0.2s;
        }
        .collapsible.active .arrow {
            transform: rotate(90deg);
        }
    </style>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto p-6">
        <h1 class="text-3xl font-bold text-gray-800 mb-6">${platform} Mobile App E2E with Detox and Jest</h1>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div class="summary-card p-6 rounded-lg shadow-lg stat-box">
                <h2 class="text-xl font-semibold text-gray-700">Total Tests</h2>
                <p class="text-2xl font-bold text-blue-600">${suites.numTotalTests}</p>
            </div>
            <div class="summary-card p-6 rounded-lg shadow-lg stat-box">
                <h2 class="text-xl font-semibold text-gray-700">Passed</h2>
                <p class="text-2xl font-bold text-green-600">${suites.numPassedTests}</p>
            </div>
            <div class="summary-card p-6 rounded-lg shadow-lg stat-box">
                <h2 class="text-xl font-semibold text-gray-700">Failed</h2>
                <p class="text-2xl font-bold text-red-600">${suites.numFailedTests}</p>
            </div>
        </div>
        <div class="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h2 class="text-xl font-semibold text-gray-800 mb-4">Environment</h2>
            <p class="text-gray-600">Detox: ${environment.detox_version}</p>
            <p class="text-gray-600">Device: ${environment.device_name} @ ${environment.device_os_version}${environment.headless === 'true' ? ' (headless)' : ''}</p>
            <p class="text-gray-600">OS: ${environment.os_name} @ ${environment.os_version}</p>
            <p class="text-gray-600">Node: ${environment.node_version} | NPM: ${environment.npm_version}</p>
        </div>
        <div id="jest-stare"></div>
    </div>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            window.jestStareConfig = {
                reportTitle: '${platform} Mobile App E2E Report',
                hidePassing: false,
                coverageLink: '',
                log: false,
                additionalResultsProcessors: [
                    {
                        process: function(results) {
                            results.testResults.forEach(function(suite) {
                                if (suite.assertionResults) {
                                    suite.assertionResults.forEach(function(result) {
                                        if (result.status === 'failed' && result.screenshots && result.screenshots.length > 0) {
                                            var screenshotHtml = result.screenshots.map(function(src) {
                                                var relativeSrc = src.substring(src.indexOf('artifacts/') + 10);
                                                return '<a href="' + relativeSrc + '" target="_blank"><img src="' + relativeSrc + '" class="screenshot" alt="Test screenshot"></a>';
                                            }).join('');
                                            if (result.failureMessages && result.failureMessages.length > 0) {
                                                result.failureMessages[0] += '\n'
                                                    + '<div class="mt-4">'
                                                    +   '<div class="collapsible">'
                                                    +     '<span class="arrow">▶</span>'
                                                    +     '<span>View Screenshots</span>'
                                                    +   '</div>'
                                                    +   '<div class="screenshot-container">'
                                                    +     screenshotHtml
                                                    +   '</div>'
                                                    + '</div>';
                                            }
                                        }
                                    });
                                }
                            });
                            return results;
                        }
                    }
                ]
            };
            var jestStareEl = document.getElementById('jest-stare');
            if (jestStareEl) {
                var observer = new MutationObserver(function(mutationsList, observer) {
                    for(var i=0; i<mutationsList.length; i++) {
                        var mutation = mutationsList[i];
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            var collapsibles = jestStareEl.querySelectorAll('.collapsible');
                            collapsibles.forEach(function(collapsible) {
                                if (!collapsible.dataset.listenerAttached) {
                                    collapsible.addEventListener('click', function() {
                                        collapsible.classList.toggle('active');
                                        var content = collapsible.nextElementSibling;
                                        if (content.style.display === "block") {
                                            content.style.display = "none";
                                        } else {
                                            content.style.display = "block";
                                        }
                                    });
                                    collapsible.dataset.listenerAttached = true;
                                }
                            });
                        }
                    }
                });
                observer.observe(jestStareEl, { childList: true, subtree: true });
            }
        });
    </script>
    <script src="https://unpkg.com/jest-stare@2.2.1/dist/jest-stare.js"></script>
</body>
</html>
`;

    fse.writeFileSync(path.join(outputDir, outputFile), customTemplate);

    // jest-stare will process the results and render the report
    // The additionalResultsProcessors in the config will add the screenshots
    processor(suites, {
        log: false,
        resultDir: outputDir,
        resultHtml: outputFile,
        reportHeadline: `${platform} Mobile App E2E with Detox and Jest`,
    });

    console.log(`Generated HTML report at ${path.join(outputDir, outputFile)}`);
}

async function mergeJestStareJsonFiles(outputFilePath, inputFiles, platform) {
    const files = collectSourceFiles(inputFiles);
    const reports = await collectReportFiles(files);
    const suites = collectReportSuites(reports, platform);
    fse.writeJsonSync(outputFilePath, suites);
    console.log('Successfully written:', outputFilePath);
}

module.exports = {
    generateJestStareHtmlReport,
    mergeJestStareJsonFiles,
};