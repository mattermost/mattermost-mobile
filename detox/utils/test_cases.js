// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console, no-process-env */

// See reference: https://support.smartbear.com/tm4j-cloud/api-docs/

const axios = require('axios');
const chalk = require('chalk');

const status = {
    passed: 'Pass',
    failed: 'Fail',
    pending: 'Pending',
    skipped: 'Skip',
};

function getStepStateResult(steps = []) {
    return steps.reduce((acc, item) => {
        if (acc[item.state]) {
            acc[item.state] += 1;
        } else {
            acc[item.state] = 1;
        }

        return acc;
    }, {});
}

function getStepStateSummary(steps = []) {
    const result = getStepStateResult(steps);

    return Object.entries(result).map(([key, value]) => `${value} ${key}`).join(',');
}

function getTM4JTestCases(allTests) {
    return allTests.tests.
        filter((item) => /(MM-T)\w+/g.test(item.name)). // eslint-disable-line wrap-regex
        map((item) => {
            return {
                title: item.name,
                duration: item.time,
                incrementalDuration: item.incrementalDuration,
                state: item.state,
                pass: item.pass,
                fail: item.fail,
                pending: item.pending,
            };
        }).
        reduce((acc, item) => {
            // Extract the key to exactly match with "MM-T[0-9]+"
            const key = item.title.match(/(MM-T\d+)/)[0];

            if (acc[key]) {
                acc[key].push(item);
            } else {
                acc[key] = [item];
            }

            return acc;
        }, {});
}

function saveToEndpoint(url, data) {
    return axios({
        method: 'POST',
        url,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: process.env.ZEPHYR_API_KEY,
        },
        data,
    }).catch((error) => {
        console.log('Something went wrong:', error.response.data.message);
        return error.response.data;
    });
}

async function createTestCycle(startDate, endDate) {
    const {
        BRANCH,
        BUILD_ID,
        COMMIT_HASH,
        JIRA_PROJECT_KEY,
        ZEPHYR_CYCLE_NAME,
        ZEPHYR_FOLDER_ID,
    } = process.env;

    const testCycle = {
        projectKey: JIRA_PROJECT_KEY,
        name: ZEPHYR_CYCLE_NAME ? `${ZEPHYR_CYCLE_NAME} (${BUILD_ID}-${COMMIT_HASH}-${BRANCH})` : `${BUILD_ID}-${COMMIT_HASH}-${BRANCH}`,
        description: `Detox automated test with ${BRANCH}`,
        plannedStartDate: startDate,
        plannedEndDate: endDate,
        statusName: 'Done',
        folderId: ZEPHYR_FOLDER_ID,
    };

    const response = await saveToEndpoint('https://api.zephyrscale.smartbear.com/v2/testcycles', testCycle);
    return response.data;
}

async function createTestExecutions(allTests, testCycle) {
    const {
        IOS,
        JIRA_PROJECT_KEY,
        ZEPHYR_ENVIRONMENT_NAME,
    } = process.env;
    const platform = IOS === 'true' ? 'iOS' : 'Android';

    const testCases = getTM4JTestCases(allTests);
    const startDate = new Date(allTests.start);
    const startTime = startDate.getTime();

    const promises = [];
    Object.entries(testCases).forEach(([key, steps], index) => {
        const testScriptResults = steps.
            sort((a, b) => {
                const aKey = a.title.match(/(MM-T\d+_\d+)/)[0].split('_')[1];
                const bKey = b.title.match(/(MM-T\d+_\d+)/)[0].split('_')[1];
                return parseInt(aKey, 10) - parseInt(bKey, 10);
            }).
            map((item) => {
                return {
                    title: item.title,
                    statusName: status[item.state],
                    actualEndDate: new Date(startTime + item.incrementalDuration).toISOString(),
                    actualResult: 'Detox automated test completed',
                };
            });

        const stateResult = getStepStateResult(steps);

        const testExecution = {
            projectKey: JIRA_PROJECT_KEY,
            testCaseKey: key,
            testCycleKey: testCycle.key,
            statusName: stateResult.passed && stateResult.passed === steps.length ? 'Pass' : 'Fail',
            testScriptResults,
            environmentName: ZEPHYR_ENVIRONMENT_NAME || platform,
            actualEndDate: testScriptResults[testScriptResults.length - 1].actualEndDate,
            executionTime: steps.reduce((acc, prev) => {
                acc += prev.duration; // eslint-disable-line no-param-reassign
                return acc;
            }, 0),
            comment: `Detox automated test - ${getStepStateSummary(steps)}`,
        };

        // Temporarily log to verify cases that were being saved.
        console.log(index, key); // eslint-disable-line no-console

        promises.push(saveTestExecution(testExecution, index));
    });

    await Promise.all(promises);
    console.log('Successfully saved test cases into the Test Management System');
}

const saveTestCases = async (allTests) => {
    const {start, end} = allTests;

    const testCycle = await createTestCycle(start, end);

    await createTestExecutions(allTests, testCycle);
};

const RETRY = [];

async function saveTestExecution(testExecution, index) {
    await axios({
        method: 'POST',
        url: 'https://api.zephyrscale.smartbear.com/v2/testexecutions',
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            Authorization: process.env.ZEPHYR_API_KEY,
        },
        data: testExecution,
    }).then(() => {
        console.log(chalk.green('Success:', index, testExecution.testCaseKey));
    }).catch((error) => {
        // Retry on 500 error code / internal server error
        if (!error.response || error.response.data.errorCode === 500) {
            if (RETRY[testExecution.testCaseKey]) {
                RETRY[testExecution.testCaseKey] += 1;
            } else {
                RETRY[testExecution.testCaseKey] = 1;
            }

            saveTestExecution(testExecution, index);
            console.log(chalk.magenta('Retry:', index, testExecution.testCaseKey, `(${RETRY[testExecution.testCaseKey]}x)`));
        } else {
            console.log(chalk.red('Error:', index, testExecution.testCaseKey, error.response.data.message));
        }
    });
}

module.exports = {
    createTestCycle,
    saveTestCases,
    createTestExecutions,
};
