// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import assert from 'assert';

import TestHelper from 'test_helper.js';

describe('Client.General', () => {
    it('getClientConfig', (done) => {
        TestHelper.initBasic(({client}) => {
            client.getClientConfig(
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

    it('getPing', (done) => {
        TestHelper.initBasic(({client}) => {
            client.getPing(
                () => {
                    done();
                },
                (err) => {
                    done(new Error(err));
                }
            );
        });
    });

    it('getPing - Invalid URL', (done) => {
        TestHelper.initBasic(({client}) => {
            client.setUrl('https://example.com/fake/url');

            client.getPing(
                () => {
                    done(new Error('ping should\'ve failed'));
                },
                () => {
                    done();
                }
            );
        });
    });

    it('logClientError', function(done) {
        TestHelper.initBasic(({client}) => {
            client.logClientError(
                'this is a test',
                'ERROR',
                (data) => {
                    TestHelper.assertStatusOkay(data);

                    done();
                },
                (err) => {
                    done(new Error(err));
                }
            );
        });
    });
});
