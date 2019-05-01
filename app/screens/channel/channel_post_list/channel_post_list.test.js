// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import {Preferences} from 'mattermost-redux/constants';

import ChannelPostList from './channel_post_list';

describe('ChannelPostList', () => {
    const baseProps = {
        actions: {
            loadPostsIfNecessaryWithRetry: jest.fn(),
            loadThreadIfNecessary: jest.fn(),
            increasePostVisibility: jest.fn(),
            selectPost: jest.fn(),
            recordLoadTime: jest.fn(),
            refreshChannelWithRetry: jest.fn(),
        },
        channelId: 'current_channel_id',
        channelRefreshingFailed: false,
        currentUserId: 'current_user_id',
        lastViewedAt: 12345,
        loadMorePostsVisible: false,
        postIds: [],
        postVisibility: 15,
        refreshing: false,
        navigator: {
            pop: jest.fn(),
            setButtons: jest.fn(),
            setOnNavigatorEvent: jest.fn(),
        },
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', async () => {
        const wrapper = shallow(
            <ChannelPostList {...baseProps}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();

        wrapper.setProps({postIds: null});
        expect(wrapper.getElement()).toMatchSnapshot();

        wrapper.setProps({postIds: undefined});
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
