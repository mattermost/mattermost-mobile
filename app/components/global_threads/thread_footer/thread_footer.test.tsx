// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import * as redux from 'react-redux';
import merge from 'deepmerge';
import {shallow} from 'enzyme';

import * as threadActions from '@mm-redux/actions/threads';
import {UserProfile} from '@mm-redux/types/users';
import {UserThread} from '@mm-redux/types/threads';
import initialState from '@store/initial_state';
import {intl} from 'test/intl-test-helper';

import ThreadFooter from './thread_footer';

describe('Global Thread Footer', () => {
    const testID = 'thread_footer.footer';

    const baseProps = {
        intl,
        testID,
        thread: {
            id: 'thread1',
            participants: [{
                id: 'user1',
            }],
            is_following: true,
            reply_count: 2,
        } as UserThread,
        threadStarter: {
            id: 'user1',
        } as UserProfile,
    };

    const baseState = merge(
        initialState,
        {
            entities: {
                users: {
                    currentUserId: 'user1',
                },
                teams: {
                    currentTeamId: 'team1',
                },
            },
        },
    );

    jest.spyOn(redux, 'useSelector').mockImplementation((callback) => callback(baseState));
    jest.spyOn(redux, 'useDispatch').mockImplementation(() => jest.fn());

    test('Should render for channel view and unfollow the thread on press', () => {
        const setThreadFollow = jest.spyOn(threadActions, 'setThreadFollow');
        const wrapper = shallow(
            <ThreadFooter
                {...baseProps}
                location='channel'
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();

        expect(wrapper.find({testID: `${testID}.unread_replies`}).exists()).toBeFalsy();
        expect(wrapper.find({testID: `${testID}.unfollowing`}).exists()).toBeFalsy();

        const followingButton = wrapper.find({testID: `${testID}.following`});
        expect(followingButton.exists()).toBeTruthy();
        followingButton.simulate('press');
        expect(setThreadFollow).toBeCalledWith('user1', 'team1', 'thread1', false);

        const replyCount = wrapper.find({testID: `${testID}.reply_count`});
        expect(replyCount.exists()).toBeTruthy();
        expect(replyCount.children().text().trim()).toBe('2 replies');
    });

    test('Should follow the thread on press in channel view', () => {
        const setThreadFollow = jest.spyOn(threadActions, 'setThreadFollow');

        const props = {
            ...baseProps,
            thread: {
                ...baseProps.thread,
                is_following: false,
            },
        };
        const wrapper = shallow(
            <ThreadFooter
                {...props}
                location='channel'
            />,
        );
        const followButton = wrapper.find({testID: `${testID}.follow`});
        expect(followButton.exists()).toBeTruthy();
        followButton.simulate('press');
        expect(setThreadFollow).toBeCalledWith('user1', 'team1', 'thread1', true);
    });

    test('Should render for global threads view', () => {
        const props = {
            ...baseProps,
            thread: {
                ...baseProps.thread,
                unread_replies: 2,
            },
            location: 'globalThreads',
        };
        const wrapper = shallow(
            <ThreadFooter
                {...props}
                location='globalThreads'
            />,
        );
        expect(wrapper.getElement()).toMatchSnapshot();

        expect(wrapper.find({testID: `${testID}.unread_replies`}).exists()).toBeTruthy();

        expect(wrapper.find({testID: `${testID}.reply_count`}).exists()).toBeFalsy();
        expect(wrapper.find({testID: `${testID}.following`}).exists()).toBeFalsy();
        expect(wrapper.find({testID: `${testID}.unfollowing`}).exists()).toBeFalsy();
    });
});
