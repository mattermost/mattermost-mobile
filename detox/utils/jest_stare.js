// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */
/* eslint-disable max-nested-callbacks */

const path = require('path');

const fse = require('fs-extra');
const glob = require('glob');
const sanitize = require('sanitize-filename');

const {ARTIFACTS_DIR} = require('./constants');

const SANITIZE_OPTIONS = {replacement: '_'};
const sanitizeFn = (filename) => sanitize(filename, SANITIZE_OPTIONS);

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
            }),
        ),
    ).then((results) => results.filter((r) => r !== null));
}

function buildScreenshotMap(platform) {
    const screenshotMap = new Map();
    const pattern = path.join(ARTIFACTS_DIR, `${platform}-results-*`, 'jest-stare', 'screenshots', '**', '*.png');
    const screenshots = glob.sync(pattern);

    screenshots.forEach((screenshotPath) => {
        const relativePath = screenshotPath.split('screenshots/')[1];
        if (relativePath) {
            const parts = relativePath.split('/');
            if (parts.length >= 3) {
                const sanitizedTestFile = parts[0];
                const sanitizedTestName = parts[1];
                const key = `${sanitizedTestFile}_${sanitizedTestName}`;
                if (!screenshotMap.has(key)) {
                    screenshotMap.set(key, []);
                }
                screenshotMap.get(key).push(screenshotPath);
            }
        }
    });

    return screenshotMap;
}

function collectScreenshots(platform, fullName, result, screenshotMap, testFile) {
    if (!fullName || result.status !== 'failed' || !testFile) {
        return [];
    }

    const sanitizedTestFile = sanitizeFn(path.basename(testFile, '.ts'));
    const sanitizedFullName = sanitizeFn(fullName.trim());
    const key = `${sanitizedTestFile}_${sanitizedFullName}`;
    const matchedScreenshots = screenshotMap.get(key) || [];
    if (matchedScreenshots.length === 0) {
        console.warn(`No screenshots found for test "${key}" (testFile: "${testFile}", fullName: "${fullName}")`);
    }

    return matchedScreenshots.map((file) => path.resolve(file));
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

    const screenshotMap = buildScreenshotMap(platform);

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
            report.testResults.forEach((suite) => {
                if (suite.assertionResults) {
                    suite.assertionResults.forEach((result) => {
                        result.testFile = suite.name;
                        const fullName = result.fullName || result.title || 'Unknown Test';
                        if (result.status === 'failed') {
                            result.screenshots = collectScreenshots(platform, fullName, result, screenshotMap, suite.name);
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

    const screenshotDir = path.join(outputDir, 'screenshots');
    if (!fse.existsSync(screenshotDir)) {
        fse.mkdirSync(screenshotDir, {recursive: true});
    }

    if (suites.testResults) {
        suites.testResults.forEach((suite) => {
            if (suite.assertionResults) {
                suite.assertionResults.forEach((result) => {
                    if (result.screenshots && result.screenshots.length > 0) {
                        const updatedScreenshots = [];
                        result.screenshots.forEach((screenshotPath) => {
                            const filename = `${Date.now()}_${path.basename(screenshotPath)}`;
                            const destPath = path.join(screenshotDir, filename);
                            try {
                                fse.copySync(screenshotPath, destPath);
                                updatedScreenshots.push(`screenshots/${filename}`);
                            } catch (err) {
                                console.error(`Failed to copy screenshot ${screenshotPath}:`, err);
                            }
                        });
                        result.screenshots = updatedScreenshots;
                    }
                });
            }
        });
        fse.writeJsonSync(inputFilePath, suites);
    }

    const customTemplate = `
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
            padding: 20px;
            background-color: #f9fafb;
            border-radius: 8px;
            margin-top: 16px;
            margin-bottom: 16px;
        }
        .screenshot-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
            margin-top: 12px;
        }
        .screenshot-item {
            background: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .screenshot-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .screenshot-label {
            padding: 8px 12px;
            background-color: #f3f4f6;
            font-size: 14px;
            font-weight: 500;
            color: #4b5563;
            border-bottom: 1px solid #e5e7eb;
        }
        .screenshot {
            width: 100%;
            height: auto;
            display: block;
            cursor: pointer;
        }
        .screenshot-modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            overflow: auto;
        }
        .screenshot-modal-content {
            margin: auto;
            display: block;
            max-width: 90%;
            max-height: 90%;
            margin-top: 2%;
        }
        .screenshot-modal-close {
            position: absolute;
            top: 15px;
            right: 35px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
        .screenshot-modal-close:hover {
            color: #bbb;
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
    <div id="screenshot-modal" class="screenshot-modal">
        <span class="screenshot-modal-close">×</span>
        <img class="screenshot-modal-content" id="modal-image">
    </div>
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
                                            var screenshotHtml = '<div class="screenshot-grid">';
                                            result.screenshots.forEach(function(src, index) {
                                                var label = 'Screenshot';
                                                if (src.includes('testFnFailure')) label = 'Test Failure';
                                                else if (src.includes('beforeEachFailure')) label = 'Before Each Failure';
                                                else if (src.includes('afterEachFailure')) label = 'After Each Failure';
                                                else if (src.includes('beforeAllFailure')) label = 'Before All Failure';
                                                else if (src.includes('afterAllFailure')) label = 'After All Failure';
                                                screenshotHtml += '<div class="screenshot-item">'
                                                    + '<div class="screenshot-label">' + label + '</div>'
                                                    + '<img src="' + src + '" class="screenshot" alt="' + label + '" data-index="' + index + '">'
                                                    + '</div>';
                                            });
                                            screenshotHtml += '</div>';
                                            if (result.failureMessages && result.failureMessages.length > 0) {
                                                result.failureMessages[0] = result.failureMessages[0].replace(/<div class="mt-4">.*<\/div>/, '') + '\n'
                                                    + '<div class="mt-4">'
                                                    +   '<div class="collapsible">'
                                                    +     '<span class="arrow">▶</span>'
                                                    +     '<span>View Screenshots (' + result.screenshots.length + ')</span>'
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
                var observer = new MutationObserver(function(mutationsList) {
                    for (var mutation of mutationsList) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            var collapsibles = jestStareEl.querySelectorAll('.collapsible');
                            collapsibles.forEach(function(collapsible) {
                                if (!collapsible.dataset.listenerAttached) {
                                    collapsible.addEventListener('click', function() {
                                        collapsible.classList.toggle('active');
                                        var content = collapsible.nextElementSibling;
                                        content.style.display = content.style.display === 'block' ? 'none' : 'block';
                                    });
                                    collapsible.dataset.listenerAttached = true;
                                }
                            });
                        }
                    }
                });
                observer.observe(jestStareEl, { childList: true, subtree: true });
                var modal = document.getElementById('screenshot-modal');
                var modalImg = document.getElementById('modal-image');
                var modalClose = document.getElementsByClassName('screenshot-modal-close')[0];
                document.addEventListener('click', function(e) {
                    if (e.target.classList.contains('screenshot')) {
                        modal.style.display = 'block';
                        modalImg.src = e.target.src;
                    }
                });
                modalClose.onclick = function() {
                    modal.style.display = 'none';
                };
                window.onclick = function(event) {
                    if (event.target === modal) {
                        modal.style.display = 'none';
                    }
                };
            }
        });
    </script>
    <script src="https://unpkg.com/jest-stare@2.2.1/dist/jest-stare.js"></script>
</body>
</html>
`;

    fse.writeFileSync(path.join(outputDir, outputFile), customTemplate);
    const jestStare = require('jest-stare');
    jestStare(suites, {
        log: false,
        jestStareConfig: {
            reportTitle: `${platform} Mobile App E2E Report`,
            hidePassing: false,
            coverageLink: '',
        },
        outputDir,
        outputFile,
    });
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
