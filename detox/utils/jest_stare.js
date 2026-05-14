// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console */

const fse = require('fs-extra');
const glob = require('glob');
const processor = require('jest-stare');

function flatten(items) {
    return items.reduce((acc, arr) => {
        return [...acc, ...arr];
    }, []);
}

function flatMap(fn) {
    return (items) => {
        return flatten(items.map(fn));
    };
}

const collectSourceFiles = flatMap((pattern) => {
    const files = glob.sync(pattern);
    if (!files.length) {
        return [];
    }
    return files;
});

function collectReportFiles(files) {
    return Promise.all(files.map((filename) => {
        return fse.readJson(filename);
    }));
}

function collectReportSuites(reports) {
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
        numFailedTestSuites += report.numFailedTestSuites;
        numFailedTests += report.numFailedTests;
        numPassedTestSuites += report.numPassedTestSuites;
        numPassedTests += report.numPassedTests;
        numPendingTestSuites += report.numPendingTestSuites;
        numPendingTests += report.numPendingTests;
        numRuntimeErrorTestSuites += report.numRuntimeErrorTestSuites;
        numTodoTests += report.numTodoTests;
        numTotalTestSuites += report.numTotalTestSuites;
        numTotalTests += report.numTotalTests;
        openHandles = openHandles.concat(report.openHandles);
        snapshot.added += report.snapshot.added;
        if (report.snapshot.didUpdate === true) {
            snapshot.didUpdate = true;
        }
        if (report.snapshot.failure === true) {
            snapshot.failure = true;
        }
        snapshot.filesAdded += report.snapshot.filesAdded;
        snapshot.filesRemoved += report.snapshot.filesRemoved;
        snapshot.filesRemovedList = snapshot.filesRemovedList.concat(report.snapshot.filesRemovedList);
        snapshot.filesUnmatched += report.snapshot.filesUnmatched;
        snapshot.filesUpdated += report.snapshot.filesUpdated;
        snapshot.matched += report.snapshot.matched;
        snapshot.total += report.snapshot.total;
        snapshot.unchecked += report.snapshot.unchecked;
        snapshot.uncheckedKeysByFile = snapshot.uncheckedKeysByFile.concat(report.snapshot.uncheckedKeysByFile);
        snapshot.unmatched += report.snapshot.unmatched;
        snapshot.updated += report.snapshot.updated;
        if (startTime === 0) {
            startTime = report.startTime;
        } else if (report.startTime < startTime) {
            startTime = report.startTime;
        }
        if (report.success === false) {
            success = false;
        }
        testResults = testResults.concat(report.testResults);
        if (report.wasInterrupted === true) {
            wasInterrupted = true;
        }
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

function generateJestStareHtmlReport(outputDir, outputFile, inputFilePath, platform) {
    const suites = fse.readJsonSync(inputFilePath);
    processor(suites, {log: false, resultDir: outputDir, resultHtml: outputFile, reportHeadline: `${platform} Mobile App E2E with Detox and Jest`});
}

async function mergeJestStareJsonFiles(outputFilePath, inputFiles) {
    const files = collectSourceFiles(inputFiles);
    if (!files.length) {
        console.log('No jest-stare JSON inputs matched; writing placeholder combined file');
        const placeholder = {
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
        fse.writeJsonSync(outputFilePath, placeholder);
        return;
    }
    const reports = await collectReportFiles(files);
    const suites = collectReportSuites(reports);
    fse.writeJsonSync(outputFilePath, suites);
    console.log('Successfully written:', outputFilePath);
}

module.exports = {
    generateJestStareHtmlReport,
    mergeJestStareJsonFiles,
};
