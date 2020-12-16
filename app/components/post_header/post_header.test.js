// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import PostHeader from './post_header';

describe('PostHeader', () => {
    const baseProps = {
        commentCount: 0,
        commentedOnDisplayName: '',
        createAt: 0,
        displayName: 'John Smith',
        enablePostUsernameOverride: false,
        fromWebHook: false,
        isPendingOrFailedPost: false,
        isSearchResult: false,
        isSystemMessage: false,
        fromAutoResponder: false,
        militaryTime: false,
        overrideUsername: '',
        renderReplies: false,
        shouldRenderReplyButton: false,
        showFullDate: false,
        theme: Preferences.THEMES.default,
        username: 'JohnSmith',
        isBot: false,
        isGuest: false,
        isLandscape: false,
        userTimezone: '',
        enableTimezone: false,
        previousPostExists: false,
        post: {id: 'post'},
        beforePrevPostUserId: '0',
        onPress: jest.fn(),
        isFirstReply: true,
    };

    test('should match snapshot when just a base post', () => {
        const wrapper = shallow(
            <PostHeader {...baseProps}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find('#ReplyIcon').exists()).toEqual(false);
    });

    test('should match snapshot when post isBot and shouldRenderReplyButton', () => {
        const props = {
            ...baseProps,
            shouldRenderReplyButton: true,
            isBot: true,
        };

        const wrapper = shallow(
            <PostHeader {...props}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when post should display reply button', () => {
        const props = {
            ...baseProps,
            shouldRenderReplyButton: true,
        };

        const wrapper = shallow(
            <PostHeader {...props}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when post is autoresponder', () => {
        const props = {
            ...baseProps,
            fromAutoResponder: true,
        };

        const wrapper = shallow(
            <PostHeader {...props}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find('#ReplyIcon').exists()).toEqual(false);
    });

    test('should match snapshot when post is from system message', () => {
        const props = {
            ...baseProps,
            isSystemMessage: true,
        };

        const wrapper = shallow(
            <PostHeader {...props}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find('#ReplyIcon').exists()).toEqual(false);
    });

    test('should match snapshot when post renders Commented On for new post', () => {
        const props = {
            ...baseProps,
            isFirstReply: true,
            renderReplies: true,
            commentedOnDisplayName: 'John Doe',
            previousPostExists: true,
        };

        const wrapper = shallow(
            <PostHeader {...props}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when post is same thread, so dont display Commented On', () => {
        const props = {
            ...baseProps,
            isFirstReply: false,
            renderReplies: true,
            commentedOnDisplayName: 'John Doe',
            previousPostExists: true,
        };

        const wrapper = shallow(
            <PostHeader {...props}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when just a base post in landscape mode', () => {
        const props = {
            ...baseProps,
            isLandscape: true,
        };

        const wrapper = shallow(
            <PostHeader {...props}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find('#ReplyIcon').exists()).toEqual(false);
    });

    test('should match snapshot when post isBot and shouldRenderReplyButton in landscape mode', () => {
        const props = {
            ...baseProps,
            shouldRenderReplyButton: true,
            isBot: true,
            isLandscape: true,
        };

        const wrapper = shallow(
            <PostHeader {...props}/>,
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
