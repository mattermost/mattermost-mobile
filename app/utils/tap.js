// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function preventDoubleTap(func, doublePressDelay = 1000) {
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
