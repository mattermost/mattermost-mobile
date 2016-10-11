// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from './test_helper.js';

describe('Client.General', () => {
    it('General.getClientConfig', (done) => {
        TestHelper.initBasic(({client}) => {
            client.getClientConfig(
                null,
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
        });
    });

    it('General.getPing', (done) => {
        TestHelper.initBasic(({client}) => {
            client.getPing(
                null,
                () => {
                    done();
                },
                (err) => {
                    done(new Error(err));
                }
            );
        });
    });

    it('General.getPing - Invalid URL', (done) => {
        TestHelper.initBasic(({client}) => {
            client.setUrl('https://example.com/fake/url');
            client.getPing(
                null,
                () => {
                    done(new Error('ping should\'ve failed'));
                },
                () => {
                    done();
                }
            );
        });
    });

    // it('General.logClientError', function(done) {
    //     TestHelper.initBasic(({client}) => {
    //         client.logClientError(
    //             null,
    //             (data) => {
    //                 TestHelper.assertStatusOkay(data);

    //                 done();
    //             },
    //             (err) => {
    //                 done(new Error(err));
    //             }
    //         )();
    //     });
    // });
});
