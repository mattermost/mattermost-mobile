// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import Client from 'actions/client.js';
import * as TestHelper from './test_helper.js';

describe('Client.General', () => {
    beforeEach(() => {
        Client.setUrl('http://localhost:8065');
    });

    it('General.getClientConfig', (done) => {
        const {onRequest, onSuccess, onFailure} = TestHelper.assertOnRequestHappensFirst(
            (data) => {
                assert.ok(data.Version);
                assert.ok(data.BuildNumber);
                assert.ok(data.BuildDate);
                assert.ok(data.BuildHash);

                done();
            },
            (err) => {
                done(new Error(err));
            }
        );

        Client.getClientConfig(onRequest, onSuccess, onFailure)();
    });

    it('General.getPing', (done) => {
        const {onRequest, onSuccess, onFailure} = TestHelper.assertOnRequestHappensFirst(
            () => {
                done();
            },
            (err) => {
                done(new Error(err));
            }
        );

        Client.getPing(onRequest, onSuccess, onFailure)();
    });

    it('General.getPing - Invalid URL', (done) => {
        const {onRequest, onSuccess, onFailure} = TestHelper.assertOnRequestHappensFirst(
            () => {
                done(new Error('ping should\'ve failed'));
            },
            () => {
                done();
            }
        );

        Client.setUrl('https://example.com/fake/url');
        Client.getPing(onRequest, onSuccess, onFailure)();
    });

    // it('General.logClientError', function(done) {
    //     const {onRequest, onSuccess, onFailure} = TestHelper.assertOnRequestHappensFirst(
    //         (data) => {
    //             TestHelper.assertStatusOkay(data);

    //             done();
    //         },
    //         (err) => {
    //             done(new Error(err));
    //         }
    //     );

    //     Client.logClientError(onRequest, onSuccess, onFailure)();
    // });
});
