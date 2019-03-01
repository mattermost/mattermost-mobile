// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

let mfaPreflightDone = false;

export function setMfaPreflightDone(state) {
    mfaPreflightDone = state;
}

export function getMfaPreflightDone() {
    return mfaPreflightDone;
}

