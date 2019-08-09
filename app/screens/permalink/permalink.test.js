// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

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
        loadThreadIfNecessary: jest.fn(),
        selectPost: jest.fn(),
        setChannelDisplayName: jest.fn(),
        setChannelLoading: jest.fn(),
        goToScreen: jest.fn(),
        dismissModal: jest.fn(),
        dismissAllModals: jest.fn(),
        resetToChannel: jest.fn(),
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
        onPress: jest.fn(),
        postIds: ['post_id_1', 'focused_post_id', 'post_id_3'],
        theme: Preferences.THEMES.default,
        componentId: 'component-id',
        isLandscape: false,
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
        expect(wrapper.instance().loadPosts).toHaveBeenCalledTimes(2);
        expect(wrapper.instance().loadPosts).toBeCalledWith(baseProps);
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

    test('should match state', () => {
        const wrapper = shallow(
            <Permalink {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.state('channelIdState')).toEqual(baseProps.channelId);
        expect(wrapper.state('channelNameState')).toEqual(baseProps.channelName);
        expect(wrapper.state('focusedPostIdState')).toEqual(baseProps.focusedPostId);
        expect(wrapper.state('postIdsState')).toEqual(baseProps.postIds);

        wrapper.setProps({channelId: ''});
        expect(wrapper.state('channelIdState')).toEqual(baseProps.channelId);
        wrapper.setProps({channelId: null});
        expect(wrapper.state('channelIdState')).toEqual(baseProps.channelId);
        wrapper.setProps({channelId: 'new_channel_id'});
        expect(wrapper.state('channelIdState')).toEqual('new_channel_id');

        wrapper.setProps({channelName: ''});
        expect(wrapper.state('channelNameState')).toEqual(baseProps.channelName);
        wrapper.setProps({channelName: null});
        expect(wrapper.state('channelNameState')).toEqual(baseProps.channelName);
        wrapper.setProps({channelName: 'new_channel_name'});
        expect(wrapper.state('channelNameState')).toEqual('new_channel_name');

        wrapper.setProps({focusedPostId: 'new_focused_post_id'});
        expect(wrapper.state('focusedPostIdState')).toEqual('new_focused_post_id');

        wrapper.setProps({postIds: []});
        expect(wrapper.state('postIdsState')).toEqual(baseProps.postIds);
        wrapper.setProps({postIds: ['post_id_1', 'focused_post_id']});
        expect(wrapper.state('postIdsState')).toEqual(['post_id_1', 'focused_post_id']);

        wrapper.setProps({postIds: baseProps.postIds, focusedPostId: baseProps.focusedPostId});
        expect(wrapper.state('loading')).toEqual(true);
        wrapper.setProps({postIds: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'], focusedPostId: 'new_focused_post_id'});
        expect(wrapper.state('loading')).toEqual(false);
    });
});
