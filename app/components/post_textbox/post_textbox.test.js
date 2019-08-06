// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from 'mattermost-redux/constants/preferences';

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
});
