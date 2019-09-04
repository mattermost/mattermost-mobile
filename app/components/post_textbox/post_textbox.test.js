// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import assert from 'assert';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from 'mattermost-redux/constants/preferences';

import Fade from 'app/components/fade';
import SendButton from 'app/components/send_button';

import PostTextbox from './post_textbox.ios';

jest.mock('NativeEventEmitter');

describe('PostTextBox', () => {
    const baseProps = {
        actions: {
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
        },
        canUploadFiles: true,
        channelId: 'channel-id',
        channelDisplayName: 'Test Channel',
        channelTeamId: 'channel-team-id',
        channelIsLoading: false,
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
    };

    test('should match, full snapshot', () => {
        const wrapper = shallowWithIntl(
            <PostTextbox {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should emit the event but no text is save to draft', () => {
        const wrapper = shallowWithIntl(
            <PostTextbox {...baseProps}/>
        );

        wrapper.setState({value: 'some text'});

        const instance = wrapper.instance();

        instance.changeDraft = jest.fn();
        instance.handleAppStateChange('active');
        expect(instance.changeDraft).not.toBeCalled();
    });

    test('should emit the event and text is save to draft', () => {
        const wrapper = shallowWithIntl(
            <PostTextbox {...baseProps}/>
        );

        const instance = wrapper.instance();
        const value = 'some text';

        wrapper.setState({value});
        instance.handleAppStateChange('background');
        expect(baseProps.actions.handlePostDraftChanged).toHaveBeenCalledWith(baseProps.channelId, value);
        expect(baseProps.actions.handlePostDraftChanged).toHaveBeenCalledTimes(1);
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
                <PostTextbox {...baseProps}/>
            );
            const containsAtChannel = wrapper.instance().textContainsAtAllAtChannel(data.text);
            assert.equal(containsAtChannel, data.result, data.text);
        }
    });

    describe('send button', () => {
        test('should initially disable and hide the send button', () => {
            const wrapper = shallowWithIntl(
                <PostTextbox {...baseProps}/>
            );

            expect(wrapper.find(Fade).prop('visible')).toBe(false);
            expect(wrapper.find(SendButton).prop('disabled')).toBe(true);
        });

        test('should show a disabled send button when uploading a file', () => {
            const props = {
                ...baseProps,
                files: [{loading: true}],
            };

            const wrapper = shallowWithIntl(
                <PostTextbox {...props}/>
            );

            expect(wrapper.find(Fade).prop('visible')).toBe(true);
            expect(wrapper.find(SendButton).prop('disabled')).toBe(true);
        });

        test('should show an enabled send button after uploading a file', () => {
            const props = {
                ...baseProps,
                files: [{loading: false}],
            };

            const wrapper = shallowWithIntl(
                <PostTextbox {...props}/>
            );

            expect(wrapper.find(Fade).prop('visible')).toBe(true);
            expect(wrapper.find(SendButton).prop('disabled')).toBe(false);
        });

        test('should show an enabled send button with a message', () => {
            const props = {
                ...baseProps,
                value: 'test',
            };

            const wrapper = shallowWithIntl(
                <PostTextbox {...props}/>
            );

            expect(wrapper.find(Fade).prop('visible')).toBe(true);
            expect(wrapper.find(SendButton).prop('disabled')).toBe(false);
        });

        test('should show a disabled send button while sending the message', () => {
            const props = {
                ...baseProps,
                value: 'test',
            };

            const wrapper = shallowWithIntl(
                <PostTextbox {...props}/>
            );

            wrapper.setState({sendingMessage: true});

            expect(wrapper.find(Fade).prop('visible')).toBe(true);
            expect(wrapper.find(SendButton).prop('disabled')).toBe(true);
        });
    });
});
