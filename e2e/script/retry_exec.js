// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable */

/**
 * Try executing a function n times recursively.
 * Return 0 the first time it succeeds
 * Return code of the last failed commands if not more retries left
 * @func - function to retry
 * @times - number of times to retry @func
 * @onError - func to execute if @func returns non 0
 */
function retryExec(func, times, onError) {
    const exitCode = func();
    if (exitCode === 0) {
        return exitCode;
    }

    if (onError) {
        onError();
    }

    times--;
    console.warn(`Command failed, ${times} retries left`);

    if (times === 0) {
        return exitCode;
    }

    return retryExec(func, times, onError);
}

module.exports = retryExec;
