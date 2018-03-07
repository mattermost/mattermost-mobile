// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

const doublePressDelay = 300;

export function preventDoubleTap(func) {
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
