// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import Permalink from './permalink.js';

jest.mock('react-intl');

describe('Permalink', () => {
    const actions = {
        getPostsAround: jest.fn(),
        getPostThread: jest.fn(),
        getChannel: jest.fn(),
        handleSelectChannel: jest.fn(),
        handleTeamChange: jest.fn(),
        joinChannel: jest.fn(),
        selectPost: jest.fn(),
    };

    const baseProps = {
        actions,
        channelId: 'channel_id',
        channelIsArchived: false,
        channelName: 'channel_name',
        channelTeamId: 'team_id',
        currentTeamId: 'current_team_id',
        currentUserId: 'current_user_id',
        focusedPostId: 'focused_post_id',
        isPermalink: true,
        myMembers: {},
        onClose: jest.fn(),
        postIds: ['post_id_1', 'focused_post_id', 'post_id_3'],
        theme: Preferences.THEMES.default,
        componentId: 'component-id',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <Permalink {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();

        // match archived icon
        wrapper.setProps({channelIsArchived: true});
        expect(wrapper.instance().archivedIcon()).toMatchSnapshot();
    });

    test('should match state and call loadPosts on retry', () => {
        const wrapper = shallow(
            <Permalink {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().loadPosts = jest.fn();
        wrapper.instance().retry();
        expect(wrapper.instance().loadPosts).toHaveBeenCalledTimes(1);
    });

    test('should call handleClose on onNavigatorEvent(backPress)', () => {
        const wrapper = shallow(
            <Permalink {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.instance().handleClose = jest.fn();
        wrapper.instance().navigationButtonPressed({buttonId: 'backPress'});
        expect(wrapper.instance().handleClose).toHaveBeenCalledTimes(1);
    });
});
