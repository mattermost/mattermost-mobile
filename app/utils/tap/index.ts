// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

export function preventDoubleTap(func: (...args: any) => any, doublePressDelay = 750) {
    let canPressWrapped = true;

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return (...args) => {
        if (canPressWrapped) {
            canPressWrapped = false;
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            func(...args);

            setTimeout(() => {
                canPressWrapped = true;
            }, doublePressDelay);
        }
    };
}
