// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// React Native exposes requestIdleCallback/cancelIdleCallback as globals
// but they are not included in the ES2019 lib used by this project.
interface IdleDeadline {
    readonly didTimeout: boolean;
    timeRemaining(): number;
}

declare function requestIdleCallback(callback: (deadline: IdleDeadline) => void, options?: {timeout: number}): number;
declare function cancelIdleCallback(handle: number): void;
