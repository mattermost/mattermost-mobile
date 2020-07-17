// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';
import assert from 'assert';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from '@mm-redux/constants/preferences';
import PostDraft from './post_draft';

jest.mock('react-native-image-picker', () => ({
    launchCamera: jest.fn(),
}));

describe('PostDraft', () => {
    const baseProps = {
        addReactionToLatestPost: jest.fn(),
        createPost: jest.fn(),
        executeCommand: jest.fn(),
        handleCommentDraftChanged: jest.fn(),
        handlePostDraftChanged: jest.fn(),
        handleClearFiles: jest.fn(),
        handleClearFailedFiles: jest.fn(),
        handleRemoveLastFile: jest.fn(),
        initUploadFiles: jest.fn(),
        userTyping: jest.fn(),
        handleCommentDraftSelectionChanged: jest.fn(),
        setStatus: jest.fn(),
        selectPenultimateChannel: jest.fn(),
        getChannelTimezones: jest.fn(),
        getChannelMemberCountsByGroup: jest.fn(),
        canUploadFiles: true,
        channelId: 'channel-id',
        channelDisplayName: 'Test Channel',
        channelTeamId: 'channel-team-id',
        channelIsReadOnly: false,
        currentUserId: 'current-user-id',
        deactivatedChannel: false,
        files: [],
        maxFileSize: 1024,
        maxMessageLength: 4000,
        rootId: '',
        theme: Preferences.THEMES.default,
        uploadFileRequestStatus: 'NOT_STARTED',
        value: '',
        userIsOutOfOffice: false,
        channelIsArchived: false,
        onCloseChannel: jest.fn(),
        cursorPositionEvent: '',
        valueEvent: '',
        isLandscape: false,
        screenId: 'NavigationScreen1',
        canPost: true,
        currentChannelMembersCount: 50,
        enableConfirmNotificationsToChannel: true,
        useChannelMentions: true,
        useGroupMentions: true,
        groupsWithAllowReference: new Map([
            ['@developers', {
                id: 'developers',
                name: 'developers',
            }],
            ['@qa', {
                id: 'qa',
                name: 'qa',
            }],
        ]),
        channelMemberCountsByGroup: {
            developers: {
                channel_member_count: 10,
                channel_member_timezones_count: 0,
            },
            qa: {
                channel_member_count: 3,
                channel_member_timezones_count: 0,
            },
        },
        membersCount: 10,
    };
    const ref = React.createRef();

    test('should send an alert when sending a message with a channel mention', () => {
        const wrapper = shallowWithIntl(
            <PostDraft
                {...baseProps}
                ref={ref}
            />,
        );
        const message = '@all';
        const instance = wrapper.instance();
        expect(instance.input).toEqual({current: null});
        instance.input = {
            current: {
                getValue: () => message,
                setValue: jest.fn(),
                changeDraft: jest.fn(),
            },
        };

        instance.sendMessage();
        expect(Alert.alert).toBeCalled();
        expect(Alert.alert).toHaveBeenCalledWith('Confirm sending notifications to entire channel', expect.anything(), expect.anything());
    });

    test('should send an alert when sending a message with a group mention with group with count more than NOTIFY_ALL', () => {
        const wrapper = shallowWithIntl(
            <PostDraft
                {...baseProps}
                ref={ref}
            />,
        );
        const message = '@developers';
        const instance = wrapper.instance();
        expect(instance.input).toEqual({current: null});
        instance.input = {
            current: {
                getValue: () => message,
                setValue: jest.fn(),
                changeDraft: jest.fn(),
            },
        };
        instance.sendMessage();
        expect(Alert.alert).toBeCalled();
    });

    test('should not send an alert when sending a message with a group mention with group with count less than NOTIFY_ALL', () => {
        const wrapper = shallowWithIntl(
            <PostDraft
                {...baseProps}
                ref={ref}
            />,
        );
        const message = '@qa';
        const instance = wrapper.instance();
        expect(instance.input).toEqual({current: null});
        instance.input = {
            current: {
                getValue: () => message,
                setValue: jest.fn(),
                changeDraft: jest.fn(),
            },
        };

        instance.sendMessage();
        expect(Alert.alert).not.toBeCalled();
    });

    test('should not send an alert when sending a message with a channel mention when the user does not have channel mentions permission', () => {
        const wrapper = shallowWithIntl(
            <PostDraft
                {...baseProps}
                useChannelMentions={false}
                ref={ref}
            />,
        );
        const message = '@all';
        const instance = wrapper.instance();
        expect(instance.input).toEqual({current: null});
        instance.input = {
            current: {
                getValue: () => message,
                setValue: jest.fn(),
                changeDraft: jest.fn(),
            },
        };

        instance.sendMessage();
        expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('should not send an alert when sending a message with a channel mention when the user does not have group mentions permission', () => {
        const wrapper = shallowWithIntl(
            <PostDraft
                {...baseProps}
                useGroupMentions={false}
                ref={ref}
            />,
        );
        const message = '@developer';
        const instance = wrapper.instance();
        expect(instance.input).toEqual({current: null});
        instance.input = {
            current: {
                getValue: () => message,
                setValue: jest.fn(),
                changeDraft: jest.fn(),
            },
        };

        instance.sendMessage();
        expect(Alert.alert).not.toHaveBeenCalled();
    });

    test('should return correct @all (same for @channel)', () => {
        for (const data of [
            {
                text: '',
                result: false,
            },
            {
                text: 'all',
                result: false,
            },
            {
                text: '@allison',
                result: false,
            },
            {
                text: '@ALLISON',
                result: false,
            },
            {
                text: '@all123',
                result: false,
            },
            {
                text: '123@all',
                result: false,
            },
            {
                text: 'hey@all',
                result: false,
            },
            {
                text: 'hey@all.com',
                result: false,
            },
            {
                text: '@all',
                result: true,
            },
            {
                text: '@ALL',
                result: true,
            },
            {
                text: '@all hey',
                result: true,
            },
            {
                text: 'hey @all',
                result: true,
            },
            {
                text: 'HEY @ALL',
                result: true,
            },
            {
                text: 'hey @all!',
                result: true,
            },
            {
                text: 'hey @all:+1:',
                result: true,
            },
            {
                text: 'hey @ALL:+1:',
                result: true,
            },
            {
                text: '`@all`',
                result: false,
            },
            {
                text: '@someone `@all`',
                result: false,
            },
            {
                text: '``@all``',
                result: false,
            },
            {
                text: '```@all```',
                result: false,
            },
            {
                text: '```\n@all\n```',
                result: false,
            },
            {
                text: '```````\n@all\n```````',
                result: false,
            },
            {
                text: '```code\n@all\n```',
                result: false,
            },
            {
                text: '~~~@all~~~',
                result: true,
            },
            {
                text: '~~~\n@all\n~~~',
                result: false,
            },
            {
                text: ' /not_cmd @all',
                result: true,
            },
            {
                text: '@channel',
                result: true,
            },
            {
                text: '@channel.',
                result: true,
            },
            {
                text: '@channel/test',
                result: true,
            },
            {
                text: 'test/@channel',
                result: true,
            },
            {
                text: '@all/@channel',
                result: true,
            },
            {
                text: '@cha*nnel*',
                result: false,
            },
            {
                text: '@cha**nnel**',
                result: false,
            },
            {
                text: '*@cha*nnel',
                result: false,
            },
            {
                text: '[@chan](https://google.com)nel',
                result: false,
            },
            {
                text: '@cha![](https://myimage)nnel',
                result: false,
            },
        ]) {
            const wrapper = shallowWithIntl(
                <PostDraft {...baseProps}/>,
            );
            const containsAtChannel = wrapper.instance().textContainsAtAllAtChannel(data.text);
            assert.equal(containsAtChannel, data.result, data.text);
        }
    });
});
