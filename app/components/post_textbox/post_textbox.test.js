// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from 'mattermost-redux/constants/preferences';

import Fade from 'app/components/fade';
import SendButton from 'app/components/send_button';

import PostTextbox from './post_textbox.ios';

jest.mock('NativeEventEmitter');

jest.mock('Alert', () => {
    return {
        alert: jest.fn(),
    };
});

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

    test('should not send multiple alerts when message is too long', () => {
        const wrapper = shallowWithIntl(
            <PostTextbox {...baseProps}/>
        );

        const instance = wrapper.instance();
        const longString = [...Array(baseProps.maxMessageLength + 2).keys()].map(() => Math.random().toString(36).slice(0, 1)).join('');

        instance.handleTextChange(longString);
        instance.handleTextChange(longString.slice(1));

        expect(Alert.alert).toBeCalled();
        expect(Alert.alert).toHaveBeenCalledTimes(1);
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
