// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

const doublePressDelay = 300;

let canPress = true;
export function preventDoubleTap(action, thisArg, ...args) {
    if (canPress) {
        canPress = false;
        Reflect.apply(action, thisArg || null, [...args]);

        setTimeout(() => {
            canPress = true;
        }, doublePressDelay);
    }
}

export function wrapWithPreventDoubleTap(func) {
    let canPressWrapped = true;

    return (...args) => {
        if (canPressWrapped) {
            canPressWrapped = false;
            func(...args);

            setTimeout(() => {
                canPressWrapped = true;
            }, doublePressDelay);
        }
    };
}
