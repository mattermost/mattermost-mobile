// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';
import {intl} from '@test/intl-test-helper';

import {ThreadOptions} from './thread_options';

import type {Post} from '@mm-redux/types/posts';
import type {UserThread} from '@mm-redux/types/threads';

describe('ThreadOptions', () => {
    const actions = {
        flagPost: jest.fn(),
        setThreadFollow: jest.fn(),
        setUnreadPost: jest.fn(),
        showPermalink: jest.fn(),
        unflagPost: jest.fn(),
        updateThreadRead: jest.fn(),
    };

    const post = {
        id: 'post_id',
        message: 'message',
        is_pinned: false,
        channel_id: 'channel_id',
    } as Post;

    const thread = {
        id: 'post_id',
        unread_replies: 4,
    } as UserThread;

    const baseProps = {
        actions,
        currentTeamName: 'current team name',
        currentTeamUrl: 'http://localhost:8065/team-name',
        currentUserId: 'user1',
        deviceHeight: 600,
        isFlagged: true,
        intl,
        post,
        rootId: 'post_id',
        theme: Preferences.THEMES.denim,
        thread,
    };

    function getWrapper(props = {}) {
        return shallow(
            <ThreadOptions
                {...baseProps}
                {...props}
            />,
        );
    }

    test('should match snapshot, showing all possible options', () => {
        const wrapper = getWrapper();
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.findWhere((node) => node.key() === 'flagged')).toMatchObject({});
        expect(wrapper.findWhere((node) => node.key() === 'mark_as_read')).toMatchObject({});
    });

    test('should show unflag option', () => {
        const wrapper = getWrapper({isFlagged: false});
        expect(wrapper.findWhere((node) => node.key() === 'unflag')).toMatchObject({});
    });

    test('should show unflag option', () => {
        const wrapper = getWrapper({
            thread: {
                ...thread,
                unread_replies: 0,
            },
        });
        expect(wrapper.findWhere((node) => node.key() === 'mark_as_unread')).toMatchObject({});
    });
});
