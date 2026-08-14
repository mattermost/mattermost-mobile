// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const SERVER_A = 'https://a.mattermost.com';
const SERVER_B = 'https://b.mattermost.com';

describe('loopInStore', () => {
    let loopInStore: typeof import('./loop_in_store').default;

    beforeEach(() => {
        jest.resetModules();
        loopInStore = require('./loop_in_store').default;
    });

    it('should record a looped-in post and report it per server', () => {
        expect(loopInStore.hasLoopedIn(SERVER_A, 'post1')).toBe(false);

        loopInStore.markLoopedIn(SERVER_A, 'post1');

        expect(loopInStore.hasLoopedIn(SERVER_A, 'post1')).toBe(true);
        expect(loopInStore.hasLoopedIn(SERVER_A, 'post2')).toBe(false);
    });

    it('should isolate loop-ins between servers', () => {
        loopInStore.markLoopedIn(SERVER_A, 'post1');

        expect(loopInStore.hasLoopedIn(SERVER_B, 'post1')).toBe(false);
    });

    it('should drop only the given server on removeServer', () => {
        loopInStore.markLoopedIn(SERVER_A, 'post1');
        loopInStore.markLoopedIn(SERVER_B, 'post1');

        loopInStore.removeServer(SERVER_A);

        expect(loopInStore.hasLoopedIn(SERVER_A, 'post1')).toBe(false);
        expect(loopInStore.hasLoopedIn(SERVER_B, 'post1')).toBe(true);
    });
});
