// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Alert} from 'react-native';
import assert from 'assert';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from 'mattermost-redux/constants/preferences';
import EventEmitter from 'mattermost-redux/utils/event_emitter';

import Fade from 'app/components/fade';
import SendButton from 'app/components/send_button';
import PasteableTextInput from 'app/components/pasteable_text_input';
import EphemeralStore from 'app/store/ephemeral_store';

import PostTextbox from './post_textbox.ios';

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
        screenId: 'NavigationScreen1',
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

    describe('Paste images', () => {
        test('should show error dialog if error occured', () => {
            jest.spyOn(Alert, 'alert').mockReturnValue(null);
            const wrapper = shallowWithIntl(<PostTextbox {...baseProps}/>);
            EphemeralStore.addNavigationComponentId('NavigationScreen1');
            wrapper.find(PasteableTextInput).first().simulate('paste', {error: 'some error'}, []);
            expect(Alert.alert).toHaveBeenCalled();
        });

        test('should show file max warning and not uploading', () => {
            jest.spyOn(EventEmitter, 'emit').mockReturnValue(null);
            const wrapper = shallowWithIntl(<PostTextbox {...baseProps}/>);
            EphemeralStore.addNavigationComponentId('NavigationScreen1');
            wrapper.find(PasteableTextInput).first().simulate('paste', null, [
                {
                    fileSize: 1000,
                    fileName: 'fileName.png',
                    type: 'images/png',
                    url: 'path/to/image',
                },
                {
                    fileSize: 1000,
                    fileName: 'fileName.png',
                    type: 'images/png',
                    url: 'path/to/image',
                },
                {
                    fileSize: 1000,
                    fileName: 'fileName.png',
                    type: 'images/png',
                    url: 'path/to/image',
                },
                {
                    fileSize: 1000,
                    fileName: 'fileName.png',
                    type: 'images/png',
                    url: 'path/to/image',
                },
                {
                    fileSize: 1000,
                    fileName: 'fileName.png',
                    type: 'images/png',
                    url: 'path/to/image',
                },
                {
                    fileSize: 1000,
                    fileName: 'fileName.png',
                    type: 'images/png',
                    url: 'path/to/image',
                },
            ]);
            expect(EventEmitter.emit).toHaveBeenCalledWith('fileMaxWarning');
            expect(baseProps.actions.initUploadFiles).not.toHaveBeenCalled();
        });

        test('should show file size warning and not uploading', () => {
            jest.spyOn(EventEmitter, 'emit').mockReturnValue(null);
            const wrapper = shallowWithIntl(
                <PostTextbox
                    {...baseProps}
                    maxFileSize={50 * 1024 * 1024}
                />
            );
            wrapper.find(PasteableTextInput).first().simulate('paste', null, [
                {
                    fileSize: 51 * 1024 * 1024,
                    fileName: 'fileName.png',
                    type: 'images/png',
                    url: 'path/to/image',
                },
            ]);
            expect(EventEmitter.emit).toHaveBeenCalledWith('fileSizeWarning', 'File above 50 MB cannot be uploaded: fileName.png');
            expect(baseProps.actions.initUploadFiles).not.toHaveBeenCalled();
        });

        test('should upload images', () => {
            const wrapper = shallowWithIntl(<PostTextbox {...baseProps}/>);
            EphemeralStore.addNavigationComponentId('NavigationScreen1');
            wrapper.find(PasteableTextInput).first().simulate('paste', null, [
                {
                    fileSize: 1000,
                    fileName: 'fileName.png',
                    type: 'images/png',
                    url: 'path/to/image',
                },
            ]);
            expect(baseProps.actions.initUploadFiles).toHaveBeenCalled();
        });

        test('should NOT upload images when not the top most screen', () => {
            const wrapper = shallowWithIntl(<PostTextbox {...baseProps}/>);
            EphemeralStore.addNavigationComponentId('NavigationScreen2');
            wrapper.find(PasteableTextInput).first().simulate('paste', null, [
                {
                    fileSize: 1000,
                    fileName: 'fileName.png',
                    type: 'images/png',
                    url: 'path/to/image',
                },
            ]);
            expect(baseProps.actions.initUploadFiles).not.toHaveBeenCalled();
        });
    });
});

