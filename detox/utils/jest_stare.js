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

    // Clean up the test name to match directory structure
    // Remove special characters and replace spaces with underscores
    const cleanTestName = testName
        .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '_')     // Replace spaces with underscores
        .replace(/-+/g, '_')      // Replace hyphens with underscores
        .replace(/_+/g, '_')      // Replace multiple underscores with single
        .toLowerCase();

    // Try multiple search patterns to find screenshots
    const searchPatterns = [
        // Pattern 1: Direct test name match
        path.join(ARTIFACTS_DIR, `${platform}-results-*`, `*${platform}*`, `*${cleanTestName}*`, `*(${failureTypes.join('|')})`),
        // Pattern 2: Test name as part of path
        path.join(ARTIFACTS_DIR, `${platform}-results-*`, `*${platform}*`, `**`, `*${cleanTestName}*`, `*(${failureTypes.join('|')})`),
        // Pattern 3: More flexible pattern
        path.join(ARTIFACTS_DIR, `${platform}-results-*`, `**`, `*(${failureTypes.join('|')})`)
    ];

    let allScreenshots = [];
    
    for (const pattern of searchPatterns) {
        const screenshots = glob.sync(pattern);
        if (screenshots.length > 0) {
            // Filter screenshots to only include those that match the test name
            const filtered = screenshots.filter(screenshot => {
                const dir = path.dirname(screenshot);
                const dirName = path.basename(dir).toLowerCase();
                return dirName.includes(cleanTestName) || 
                       testName.toLowerCase().includes(dirName) ||
                       screenshot.toLowerCase().includes(cleanTestName);
            });
            allScreenshots = allScreenshots.concat(filtered);
        }
    }

    // Remove duplicates
    const uniqueScreenshots = [...new Set(allScreenshots)];
    const resolvedPaths = uniqueScreenshots.map(file => path.resolve(file));

    console.log(`Searching for screenshots for test: "${testName}" (clean: "${cleanTestName}")`);
    console.log(`Found ${resolvedPaths.length} screenshot(s)`);

    if (resolvedPaths.length > 0) {
        console.log(`Found screenshots for "${testName}": ${JSON.stringify(resolvedPaths)}`);
    } else {
        console.warn(`No screenshots found for test "${testName}" on platform ${platform}`);
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
                console.log(`Processing suite: ${JSON.stringify(suite)}`);
                if (suite.assertionResults) {
                    // console.log(`Processing ${suite.assertionResults.length} assertion results for suite: ${JSON.stringify(suite)}}`);
                    suite.assertionResults.forEach((result) => {
                        const testName = result.fullName || result.title || 'Unknown Test';
                        console.log(`Processing result: ${testName} (status: ${result.status}) \t ${JSON.stringify(result)}`);
                        if (result.status === 'failed') {
                            // Collect screenshots for failed tests
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
    
    // Copy screenshots to jest-stare directory for relative paths
    const screenshotDir = path.join(outputDir, 'screenshots');
    if (!fse.existsSync(screenshotDir)) {
        fse.mkdirSync(screenshotDir, { recursive: true });
    }
    
    // Process test results to copy screenshots
    if (suites.testResults) {
        suites.testResults.forEach((suite) => {
            if (suite.assertionResults) {
                suite.assertionResults.forEach((result) => {
                    if (result.screenshots && result.screenshots.length > 0) {
                        result.screenshots = result.screenshots.map((screenshotPath) => {
                            const filename = `${Date.now()}_${path.basename(screenshotPath)}`;
                            const destPath = path.join(screenshotDir, filename);
                            try {
                                fse.copySync(screenshotPath, destPath);
                                return `screenshots/${filename}`;
                            } catch (err) {
                                console.error(`Failed to copy screenshot ${screenshotPath}:`, err);
                                return null;
                            }
                        }).filter(Boolean);
                    }
                });
            }
        });
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
        <span class="screenshot-modal-close">&times;</span>
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
                                                result.failureMessages[0] += '\n'
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
                
                // Setup screenshot modal functionality
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
                    if (event.target == modal) {
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

    // Write the custom template
    const outputPath = path.join(outputDir, outputFile);
    fse.writeFileSync(outputPath, customTemplate);
    
    console.log(`Generated HTML report at ${outputPath}`);
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
