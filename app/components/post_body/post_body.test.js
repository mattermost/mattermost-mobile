// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences} from 'mattermost-redux/constants';

import PostBodyAdditionalContent from 'app/components/post_body_additional_content';
import {shallowWithIntl} from 'test/intl-test-helper';

import PostBody from './post_body.js';

describe('PostBody', () => {
    const baseProps = {
        actions: {
            showModalOverCurrentContext: jest.fn(),
        },
        canDelete: true,
        channelIsReadOnly: false,
        deviceHeight: 1920,
        fileIds: [],
        hasBeenDeleted: false,
        hasBeenEdited: false,
        hasReactions: false,
        highlight: false,
        isFailed: false,
        isFlagged: false,
        isPending: false,
        isPostAddChannelMember: false,
        isPostEphemeral: false,
        isReplyPost: false,
        isSearchResult: false,
        isSystemMessage: false,
        managedConfig: {},
        message: 'Hello, World!',
        onFailedPostPress: jest.fn(),
        onHashtagPress: jest.fn(),
        onPermalinkPress: jest.fn(),
        onPress: jest.fn(),
        post: {id: 'post'},
        postProps: {},
        postType: '',
        replyBarStyle: [],
        showAddReaction: true,
        showLongPost: true,
        isEmojiOnly: false,
        shouldRenderJumboEmoji: false,
        theme: Preferences.THEMES.default,
    };

    test('should mount additional content for non-system messages', () => {
        const props = {
            ...baseProps,
            isSystemMessage: false,
        };

        const wrapper = shallowWithIntl(<PostBody {...props}/>);

        expect(wrapper.find(PostBodyAdditionalContent).exists()).toBeTruthy();
    });

    test('should not mount additional content for system messages', () => {
        const props = {
            ...baseProps,
            isSystemMessage: true,
        };

        const wrapper = shallowWithIntl(<PostBody {...props}/>);

        expect(wrapper.find(PostBodyAdditionalContent).exists()).toBeFalsy();
    });

    test('measurePost should update isLongPost when showLongPost is false', () => {
        const event = {
            nativeEvent: {
                layout: {
                    height: null,
                },
            },
        };

        const props = {...baseProps, showLongPost: false};
        const wrapper = shallowWithIntl(<PostBody {...props}/>);
        const instance = wrapper.instance();

        expect(wrapper.state('isLongPost')).toEqual(false);

        event.nativeEvent.layout.height = wrapper.state('maxHeight');
        instance.measurePost(event);
        expect(wrapper.state('isLongPost')).toEqual(true);

        event.nativeEvent.layout.height = wrapper.state('maxHeight') - 1;
        instance.measurePost(event);
        expect(wrapper.state('isLongPost')).toEqual(false);

        event.nativeEvent.layout.height = wrapper.state('maxHeight') + 1;
        instance.measurePost(event);
        expect(wrapper.state('isLongPost')).toEqual(true);
    });

    test('measurePost should not update isLongPost when showLongPost is true', () => {
        const event = {
            nativeEvent: {
                layout: {
                    height: null,
                },
            },
        };

        const props = {...baseProps, showLongPost: true};
        const wrapper = shallowWithIntl(<PostBody {...props}/>);
        const instance = wrapper.instance();

        expect(wrapper.state('isLongPost')).toEqual(false);

        event.nativeEvent.layout.height = wrapper.state('maxHeight');
        instance.measurePost(event);
        expect(wrapper.state('isLongPost')).toEqual(false);

        event.nativeEvent.layout.height = wrapper.state('maxHeight') - 1;
        instance.measurePost(event);
        expect(wrapper.state('isLongPost')).toEqual(false);

        event.nativeEvent.layout.height = wrapper.state('maxHeight') + 1;
        instance.measurePost(event);
        expect(wrapper.state('isLongPost')).toEqual(false);
    });
});
