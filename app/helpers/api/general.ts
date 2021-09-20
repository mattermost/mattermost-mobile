// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Debounce function based on underscores modified to use es6 and a cb

export function debounce(func: (...args: any) => unknown, wait: number, immediate?: boolean, cb?: () => unknown) {
    let timeout: NodeJS.Timeout|null;
    return function fx(...args: any[]) {
        const runLater = () => {
            timeout = null;
            if (!immediate) {
                Reflect.apply(func, this, args);
                if (cb) {
                    cb();
                }
            }
        };
        const callNow = immediate && !timeout;
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(runLater, wait);
        if (callNow) {
            Reflect.apply(func, this, args);
            if (cb) {
                cb();
            }
        }
    };
}
