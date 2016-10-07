// Copyright (c) 2016 Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import 'isomorphic-fetch';
import 'react-native';

// Ensure that everything is imported correctly for testing
describe('Sanity test', () => {
    it('Promise', (done) => {
        Promise.resolve(true).then(() => {
            done();
        }).catch((err) => {
            done.fail(err);
        });
    });

    it('fetch', (done) => {
        fetch('http://example.com').then(() => {
            done();
        }).catch((err) => {
            done.fail(err);
        });
    });
});