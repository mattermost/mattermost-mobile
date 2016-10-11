// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import Client from 'client/client.js';

class TestHelper {
    assertOnRequestHappensFirst(onSuccess, onFailure) {
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

    assertStatusOkay(data) {
        assert(data);
        assert(data.status === 'OK');
    }

    createClient() {
        const client = new Client();

        client.setUrl('http://localhost:8065');

        return client;
    }

    initBasic(callback) {
        const client = this.createClient();

        callback({client});
    }
}

export default new TestHelper();