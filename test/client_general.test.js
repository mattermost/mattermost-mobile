// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from './test_helper.js';

describe('Client.General', () => {
    it('General.getClientConfig', (done) => {
        TestHelper.initBasic(({client}) => {
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

            client.getClientConfig(onRequest, onSuccess, onFailure)();
        });
    });

    it('General.getPing', (done) => {
        TestHelper.initBasic(({client}) => {
            const {onRequest, onSuccess, onFailure} = TestHelper.assertOnRequestHappensFirst(
                () => {
                    done();
                },
                (err) => {
                    done(new Error(err));
                }
            );

            client.getPing(onRequest, onSuccess, onFailure)();
        });
    });

    it('General.getPing - Invalid URL', (done) => {
        TestHelper.initBasic(({client}) => {
            const {onRequest, onSuccess, onFailure} = TestHelper.assertOnRequestHappensFirst(
                () => {
                    done(new Error('ping should\'ve failed'));
                },
                () => {
                    done();
                }
            );

            client.setUrl('https://example.com/fake/url');
            client.getPing(onRequest, onSuccess, onFailure)();
        });
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
