// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'react-native';
import fetchMock from 'fetch_mock';

fetchMock.get('http://example.com', {
    status: 200
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
