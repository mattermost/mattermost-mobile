// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

export function assertOnRequestHappensFirst(onSuccess, onFailure) {
    let hasReceivedOnRequest = false;

    return {
        onRequest: () => {
            hasReceivedOnRequest = true;
        },
        onSuccess: (response, data) => {
            assert(hasReceivedOnRequest);

            onSuccess(response, data);
        },
        onFailure: (err) => {
            assert(hasReceivedOnRequest);

            onFailure(err);
        }
    };
}

export function assertStatusOkay(data) {
    assert(data);
    assert(data.status === 'OK');
}
