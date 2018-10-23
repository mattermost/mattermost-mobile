// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';
import {General, RequestStatus} from 'mattermost-redux/constants';
import PostList from 'app/components/post_list';

import Thread from './thread.js';

jest.mock('react-intl');

describe('thread', () => {
    const navigator = {
        dismissModal: jest.fn(),
        pop: jest.fn(),
        resetTo: jest.fn(),
        setTitle: jest.fn(),
    };
    const baseProps = {
        actions: {
            selectPost: jest.fn(),
        },
        channelId: 'channel_id',
        channelType: General.OPEN_CHANNEL,
        displayName: 'channel_display_name',
        navigator,
        myMember: {last_viewed_at: 0, user_id: 'member_user_id'},
        rootId: 'root_id',
        theme: Preferences.THEMES.default,
        postIds: ['root_id', 'post_id_1', 'post_id_2'],
        channelIsArchived: false,
        threadLoadingStatus: {status: RequestStatus.STARTED},
    };

    test('should match snapshot, has root post', () => {
        const wrapper = shallow(
            <Thread {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot, no root post, loading', () => {
        const newPostIds = ['post_id_1', 'post_id_2'];
        const wrapper = shallow(
            <Thread
                {...baseProps}
                postIds={newPostIds}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call props.navigator on onCloseChannel', () => {
        const channelScreen = {
            screen: 'Channel',
            title: '',
            animated: false,
            backButtonTitle: '',
            navigatorStyle: {
                animated: true,
                animationType: 'fade',
                navBarHidden: true,
                statusBarHidden: false,
                statusBarHideWithNavBar: false,
                screenBackgroundColor: 'transparent',
            },
            passProps: {
                disableTermsModal: true,
            },
        };
        const newNavigator = {...navigator};
        const wrapper = shallow(
            <Thread
                {...baseProps}
                navigator={newNavigator}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        wrapper.instance().onCloseChannel();
        expect(newNavigator.resetTo).toHaveBeenCalledTimes(1);
        expect(newNavigator.resetTo).toBeCalledWith(channelScreen);
    });

    test('should match snapshot, render footer', () => {
        const wrapper = shallow(
            <Thread {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        // return loading
        expect(wrapper.find(PostList).getElement()).toMatchSnapshot();

        // return null
        wrapper.setProps({threadLoadingStatus: {status: RequestStatus.SUCCESS}});
        expect(wrapper.find(PostList).getElement()).toMatchSnapshot();

        // return deleted post
        const newPostIds = ['post_id_1', 'post_id_2'];
        wrapper.setProps({postIds: newPostIds});
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
