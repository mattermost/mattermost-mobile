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
            fse.readJson(filename)
                .then((jsonData) => ({filename, jsonData}))
                .catch((err) => {
                    console.error(`Failed to read JSON file ${filename}:`, err);
                    return null;
                }),
        ),
    ).then((results) => results.filter((r) => r !== null));
}

function buildScreenshotMap(platform) {
    const screenshotMap = new Map();
    const pattern = path.join(ARTIFACTS_DIR, `${platform}-results-*`, '**', '*.png');
    const screenshots = glob.sync(pattern);

    screenshots.forEach((screenshotPath) => {
        const match = screenshotPath.match(/([\\/]android-results-[^\\/]+)/);
        if (!match) {
            return;
        }
        const keyPrefix = path.basename(match[1]);

        const keyPathParts = screenshotPath.split(/jest-stare[\\/]screenshots[\\/]/);
        if (keyPathParts.length < 2) {
            return;
        }
        const keyPath = keyPathParts[1];

        const pathSegments = keyPath.split('/');
        const testName = pathSegments.pop().replace(/(\ .png)+$/, '');
        const testSuite = pathSegments.join('/');

        const lookupKey = testSuite ? sanitizeFn(testSuite) : '__global__';
        const compositeKey = `${keyPrefix}/${lookupKey}`;

        if (!screenshotMap.has(compositeKey)) {
            screenshotMap.set(compositeKey, []);
        }
        screenshotMap.get(compositeKey).push({
            path: screenshotPath,
            name: testName,
        });
    });

    return screenshotMap;
}

function collectScreenshots(fullName, screenshotMap, keyPrefix) {
    if (!fullName) {
        return [];
    }

    const lookupKey = sanitizeFn(fullName.trim());
    const compositeKey = `${keyPrefix}/${lookupKey}`;
    const screenshots = screenshotMap.get(compositeKey) || [];

    if (screenshots.length === 0) {
        console.warn(`No screenshots found for test "${compositeKey}"`);
    }

    return screenshots.map((screenshot) => path.resolve(screenshot.path));
}

function collectReportSuites(reports, platform) {
    const finalReport = {
        numFailedTestSuites: 0,
        numFailedTests: 0,
        numPassedTestSuites: 0,
        numPassedTests: 0,
        numPendingTestSuites: 0,
        numPendingTests: 0,
        numRuntimeErrorTestSuites: 0,
        numTodoTests: 0,
        numTotalTestSuites: 0,
        numTotalTests: 0,
        openHandles: [],
        snapshot: {
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
        },
        startTime: 0,
        success: true,
        testResults: [],
        wasInterrupted: false,
    };

    const screenshotMap = buildScreenshotMap(platform);

    reports.forEach((report) => {
        const {filename, jsonData} = report;
        const match = filename.match(/([\\/]android-results-[^\\/]+)/);
        if (!match) {
            return;
        }
        const keyPrefix = path.basename(match[1]);

        if (finalReport.startTime === 0) {
            finalReport.startTime = jsonData.startTime;
        } else if (jsonData.startTime) {
            finalReport.startTime = Math.min(finalReport.startTime, jsonData.startTime);
        }
        finalReport.success = finalReport.success && jsonData.success;
        finalReport.wasInterrupted = finalReport.wasInterrupted || jsonData.wasInterrupted;
        finalReport.numRuntimeErrorTestSuites += jsonData.numRuntimeErrorTestSuites || 0;

        if (jsonData.testResults) {
            jsonData.testResults.forEach((suite) => {
                if (suite.assertionResults) {
                    suite.assertionResults.forEach((result) => {
                        if (result.status === 'failed') {
                            result.screenshots = collectScreenshots(result.fullName, screenshotMap, keyPrefix);
                        }
                    });
                }

                const globalScreenshots = screenshotMap.get(`${keyPrefix}/__global__`) || [];
                if (suite.failureMessage && globalScreenshots.length > 0) {
                    const firstFailedResult = suite.assertionResults.find(r => r.status === 'failed');
                    if (firstFailedResult) {
                        if (!firstFailedResult.screenshots) {
                            firstFailedResult.screenshots = [];
                        }
                        firstFailedResult.screenshots.push(...globalScreenshots.map((s) => path.resolve(s.path)));
                    }
                }
                finalReport.testResults.push(suite);
            });
        }
    });

    const mergedSuites = new Map();
    finalReport.testResults.forEach((suite) => {
        const key = suite.testFilePath;
        if (mergedSuites.has(key)) {
            const existing = mergedSuites.get(key);
            existing.assertionResults.push(...suite.assertionResults);
            if (suite.failureMessage) {
                existing.failureMessage = (existing.failureMessage || '') + '\n' + suite.failureMessage;
            }
        } else {
            mergedSuites.set(key, suite);
        }
    });
    finalReport.testResults = Array.from(mergedSuites.values());

    finalReport.testResults.forEach((suite) => {
        finalReport.numTotalTestSuites++;
        let suiteFailed = false;
        if (suite.assertionResults) {
            suite.assertionResults.forEach((result) => {
                finalReport.numTotalTests++;
                if (result.status === 'failed') {
                    finalReport.numFailedTests++;
                    suiteFailed = true;
                } else if (result.status === 'passed') {
                    finalReport.numPassedTests++;
                } else if (result.status === 'pending') {
                    finalReport.numPendingTests++;
                } else if (result.status === 'todo') {
                    finalReport.numTodoTests++;
                }
            });
        }

        if (suiteFailed || suite.failureMessage) {
            finalReport.numFailedTestSuites++;
        } else if (finalReport.numTotalTests > 0) {
            finalReport.numPassedTestSuites++;
        } else {
            finalReport.numPendingTestSuites++;
        }
    });

    return finalReport;
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
                            const originalBasename = path.basename(screenshotPath);
                            const correctedBasename = originalBasename.replace(/(\ .png)+$/, '.png');
                            const filename = `${Date.now()}_${correctedBasename}`;
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
    }

    const customTemplate = `\n<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>${platform} Mobile App E2E Report</title>\n    <script src="https://cdn.tailwindcss.com"></script>\n    <style>\n        body { font-family: 'Inter', sans-serif; }\n        .screenshot-container {\n            display: none;\n            padding: 20px;\n            background-color: #f9fafb;\n            border-radius: 8px;\n            margin-top: 16px;\n            margin-bottom: 16px;\n        }\n        .screenshot-grid {\n            display: grid;\n            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n            gap: 16px;\n            margin-top: 12px;\n        }\n        .screenshot-item {\n            background: white;\n            border-radius: 8px;\n            overflow: hidden;\n            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n            transition: transform 0.2s, box-shadow 0.2s;\n        }\n        .screenshot-item:hover {\n            transform: translateY(-2px);\n            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n        }\n        .screenshot-label {\n            padding: 8px 12px;\n            background-color: #f3f4f6;\n            font-size: 14px;\n            font-weight: 500;\n            color: #4b5563;\n            border-bottom: 1px solid #e5e7eb;\n        }\n        .screenshot {\n            width: 100%;\n            height: auto;\n            display: block;\n            cursor: pointer;\n            border: 1px solid #e5e7eb;\n        }\n        .screenshot-modal {\n            display: none;\n            position: fixed;\n            z-index: 1000;\n            left: 0;\n            top: 0;\n            width: 100%;\n            height: 100%;\n            background-color: rgba(0, 0, 0, 0.9);\n            overflow: auto;\n        }\n        .screenshot-modal-content {\n            margin: auto;\n            display: block;\n            max-width: 90%;\n            max-height: 90%;\n            margin-top: 2%;\n        }\n        .screenshot-modal-close {\n            position: absolute;\n            top: 15px;\n            right: 35px;\n            color: #f1f1f1;\n            font-size: 40px;\n            font-weight: bold;\n            cursor: pointer;\n        }\n        .screenshot-modal-close:hover {\n            color: #bbb;\n        }\n        .summary-card { background: linear-gradient(135deg, #f3f4f6, #ffffff); }\n        .stat-box { transition: transform 0.2s; }\n        .stat-box:hover { transform: scale(1.05); }\n        .collapsible {\n            cursor: pointer;\n            display: flex;\n            align-items: center;\n            gap: 8px;\n            font-weight: 600;\n            color: #1d4ed8;\n        }\n        .collapsible .arrow {\n            transition: transform 0.2s;\n        }\n        .collapsible.active .arrow {\n            transform: rotate(90deg);\n        }\n    </style>\n</head>\n<body class="bg-gray-100">\n    <div id="screenshot-modal" class="screenshot-modal">\n        <span class="screenshot-modal-close">×</span>\n        <img class="screenshot-modal-content" id="modal-image">\n    </div>\n    <div class="container mx-auto p-6">\n        <h1 class="text-3xl font-bold text-gray-800 mb-6">${platform} Mobile App E2E with Detox and Jest</h1>\n        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">\n            <div class="summary-card p-6 rounded-lg shadow-lg stat-box">\n                <h2 class="text-xl font-semibold text-gray-700">Total Tests</h2>\n                <p class="text-2xl font-bold text-blue-600">${suites.numTotalTests}</p>\n            </div>\n            <div class="summary-card p-6 rounded-lg shadow-lg stat-box">\n                <h2 class="text-xl font-semibold text-gray-700">Passed</h2>\n                <p class="text-2xl font-bold text-green-600">${suites.numPassedTests}</p>\n            </div>\n            <div class="summary-card p-6 rounded-lg shadow-lg stat-box">\n                <h2 class="text-xl font-semibold text-gray-700">Failed</h2>\n                <p class="text-2xl font-bold text-red-600">${suites.numFailedTests}</p>\n            </div>\n        </div>\n        <div class="bg-white p-6 rounded-lg shadow-lg mb-8">\n            <h2 class="text-xl font-semibold text-gray-800 mb-4">Environment</h2>\n            <p class="text-gray-600">Detox: ${environment.detox_version}</p>\n            <p class="text-gray-600">Device: ${environment.device_name} @ ${environment.device_os_version}${environment.headless === 'true' ? ' (headless)' : ''}</p>\n            <p class="text-gray-600">OS: ${environment.os_name} @ ${environment.os_version}</p>\n            <p class="text-gray-600">Node: ${environment.node_version} | NPM: ${environment.npm_version}</p>\n        </div>\n        <div id="jest-stare"></div>\n    </div>\n    <script>\n        document.addEventListener('DOMContentLoaded', function() {\n            window.jestStareConfig = {\n                reportTitle: '${platform} Mobile App E2E Report',\n                hidePassing: false,\n                coverageLink: '',\n                log: false,\n                additionalResultsProcessors: [\n                    {\n                        process: function(results) {\n                            results.testResults.forEach(function(suite) {\n                                if (suite.assertionResults) {\n                                    suite.assertionResults.forEach(function(result) {\n                                        if (result.status === 'failed' && result.screenshots && result.screenshots.length > 0) {\n                                            var screenshotHtml = '<div class="screenshot-grid">';\n                                            result.screenshots.forEach(function(src) {\n                                                var label = 'Screenshot';\n                                                if (src.includes('testFnFailure')) label = 'Test Failure';\n                                                else if (src.includes('beforeEachFailure')) label = 'Before Each Failure';\n                                                else if (src.includes('afterEachFailure')) label = 'After Each Failure';\n                                                else if (src.includes('beforeAllFailure')) label = 'Before All Failure';\n                                                else if (src.includes('afterAllFailure')) label = 'After All Failure';\n                                                screenshotHtml += '<div class="screenshot-item"><div class="screenshot-label">' + label + '</div><img src="' + src + '" class="screenshot" alt="' + label + '"></div>';\n                                            });\n                                            screenshotHtml += '</div>';\n\n                                            var collapsibleHtml = '<div class="mt-4">'\n                                                +   '<div class="collapsible">'\n                                                +     '<span class="arrow">▶</span>'\n                                                +     '<span>View Screenshots (' + result.screenshots.length + ')</span>'\n                                                +   '</div>'\n                                                +   '<div class="screenshot-container">'\n                                                +     screenshotHtml\n                                                +   '</div>'\n                                                + '</div>';\n\n                                            if (!result.failureMessages) {\n                                                result.failureMessages = [];\n                                            }\n                                            result.failureMessages.push(collapsibleHtml);\n                                        }\n                                    });\n                                }\n                            });\n                            return results;\n                        }\n                    }\n                ]\n            };\n            var jestStareEl = document.getElementById('jest-stare');\n            if (jestStareEl) {\n                var observer = new MutationObserver(function(mutationsList) {\n                    for (var mutation of mutationsList) {\n                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {\n                            var collapsibles = jestStareEl.querySelectorAll('.collapsible');\n                            collapsibles.forEach(function(collapsible) {\n                                if (!collapsible.dataset.listenerAttached) {\n                                    collapsible.addEventListener('click', function() {\n                                        collapsible.classList.toggle('active');\n                                        var content = collapsible.nextElementSibling;\n                                        content.style.display = content.style.display === 'block' ? 'none' : 'block';\n                                    });\n                                    collapsible.dataset.listenerAttached = true;\n                                }\n                            });\n                        }\n                    }\n                });\n                observer.observe(jestStareEl, { childList: true, subtree: true });\n                var modal = document.getElementById('screenshot-modal');\n                var modalImg = document.getElementById('modal-image');\n                var modalClose = document.getElementsByClassName('screenshot-modal-close')[0];\n                document.addEventListener('click', function(e) {\n                    if (e.target.classList.contains('screenshot')) {\n                        modal.style.display = 'block';\n                        modalImg.src = e.target.src;\n                    }\n                });\n                modalClose.onclick = function() {\n                    modal.style.display = 'none';\n                };\n                window.onclick = function(event) {\n                    if (event.target === modal) {\n                        modal.style.display = 'none';\n                    }\n                };\n            }\n        });\n    </script>\n    <script src="https://unpkg.com/jest-stare@2.2.1/dist/jest-stare.js"></script>\n</body>\n</html>\n`;

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
        reportData: suites,
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