// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import channelReducer from './channel';

describe('Reducers.channel', () => {
    const initialState = {
        displayName: '',
        drafts: {},
        loading: false,
        refreshing: false,
        loadingPosts: {},
        lastGetPosts: {},
        retryFailed: false,
        lastChannelViewTime: {},
        keepChannelIdAsUnread: null,
        urneadAPIcall: {},
    };

    test('Initial state', () => {
        const nextState = channelReducer(
            {
                displayName: '',
                drafts: {},
                loading: false,
                refreshing: false,
                loadingPosts: {},
                lastGetPosts: {},
                retryFailed: false,
                lastChannelViewTime: {},
                keepChannelIdAsUnread: null,
                urneadAPIcall: {},
            },
            {}
        );

        expect(nextState).toEqual(initialState);
    });
});
