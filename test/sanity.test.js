// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'react-native';

global.WebSocket = require('ws');

// Set up a global hooks to make debugging tests less of a pain
before(() => {
    process.on('unhandledRejection', (reason) => {
        // Rethrow so that tests will actually fail and not just timeout
        throw reason;
    });
});

// Ensure that everything is imported correctly for testing
describe('Sanity test', () => {
    it('Promise', (done) => {
        Promise.resolve(true).then(() => {
            done();
        }).catch((err) => {
            done(err);
        });
    });

    it('async/await', async () => {
        await Promise.resolve(true);
    });

    it('fetch', (done) => {
        fetch('http://example.com').then(() => {
            done();
        }).catch(() => {
            // No internet connection, but fetch still returned at least
            done();
        });
    });
});
