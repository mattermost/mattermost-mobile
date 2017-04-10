// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

let canPress = true;
export function preventDoubleTap(action, thisArg, ...args) {
    if (canPress) {
        canPress = false;
        Reflect.apply(action, thisArg || null, [...args]);

        setTimeout(() => {
            canPress = true;
        }, 300);
    }
}
