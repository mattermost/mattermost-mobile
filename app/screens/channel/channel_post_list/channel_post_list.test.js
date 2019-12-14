// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';
import EventEmitter from 'mattermost-redux/utils/event_emitter';
import {WebsocketEvents} from 'mattermost-redux/constants';

import ChannelPostList from './channel_post_list';

describe('ChannelPostList', () => {
    const baseProps = {
        actions: {
            loadPostsIfNecessaryWithRetry: jest.fn(),
            loadThreadIfNecessary: jest.fn(),
            increasePostVisibility: jest.fn(),
            increasePostVisibilityByOne: jest.fn(),
            selectPost: jest.fn(),
            recordLoadTime: jest.fn(),
            refreshChannelWithRetry: jest.fn(),
        },
        channelId: 'channel-id',
        loadMorePostsVisible: false,
        refreshing: false,
        theme: Preferences.THEMES.default,
    };

    test('should call increasePostVisibilityByOne', () => {
        shallow(
            <ChannelPostList {...baseProps}/>
        );

        expect(baseProps.actions.increasePostVisibilityByOne).toHaveBeenCalledTimes(0);

        EventEmitter.emit(WebsocketEvents.INCREASE_POST_VISIBILITY_BY_ONE);
        expect(baseProps.actions.increasePostVisibilityByOne).toHaveBeenCalledWith(baseProps.channelId);
    });
});
