// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Session-scoped memory of agent loop-ins the user has already triggered,
// keyed per server by the target post id. The reminder post lives in the
// virtualized post list, so its row unmounts/remounts as it scrolls; without
// this the component's local "done" state resets to an actionable link, which
// could re-fire the loop-in on a second tap. Cleared per server on logout.
class LoopInStoreSingleton {
    private loopedIn: {[serverUrl: string]: Set<string>} = {};

    markLoopedIn = (serverUrl: string, postId: string): void => {
        if (!this.loopedIn[serverUrl]) {
            this.loopedIn[serverUrl] = new Set();
        }
        this.loopedIn[serverUrl].add(postId);
    };

    hasLoopedIn = (serverUrl: string, postId: string): boolean => {
        return this.loopedIn[serverUrl]?.has(postId) ?? false;
    };

    // Called on per-server logout so a different account on the same server
    // doesn't inherit the previous user's loop-in state.
    removeServer = (serverUrl: string): void => {
        delete this.loopedIn[serverUrl];
    };
}

const loopInStore = new LoopInStoreSingleton();

export default loopInStore;
