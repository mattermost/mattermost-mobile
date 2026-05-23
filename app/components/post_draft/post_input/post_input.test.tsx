// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import PostInput from './post_input';

const mockFocus = jest.fn();
const mockSetNativeProps = jest.fn();

jest.mock('@agents/hooks', () => ({
    useRewrite: jest.fn(() => ({isProcessing: false})),
}));

jest.mock('@mattermost/hardware-keyboard', () => ({
    useHardwareKeyboardEvents: jest.fn(),
}));

jest.mock('@mattermost/react-native-paste-input', () => {
    const ReactActual = require('react');
    const {TextInput} = require('react-native');

    return {
        __esModule: true,
        default: ReactActual.forwardRef((props: Record<string, unknown>, ref: React.Ref<unknown>) => {
            ReactActual.useImperativeHandle(ref, () => ({
                focus: mockFocus,
                setNativeProps: mockSetNativeProps,
            }));

            return ReactActual.createElement(TextInput, props);
        }),
    };
});

describe('PostInput', () => {
    const baseProps: Parameters<typeof PostInput>[0] = {
        testID: 'post.input',
        channelId: 'channel-id',
        maxMessageLength: 4000,
        rootId: '',
        timeBetweenUserTypingUpdatesMilliseconds: 5000,
        maxNotificationsPerChannel: 0,
        enableUserTypingMessage: false,
        membersInChannel: 0,
        value: 'Hello',
        updateValue: jest.fn(),
        addFiles: jest.fn(),
        cursorPosition: 5,
        updateCursorPosition: jest.fn(),
        sendMessage: jest.fn(),
        inputRef: {current: undefined},
        setIsFocused: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should keep the iOS input native-owned while processing native text changes', () => {
        const updateValue = jest.fn();
        const {getByTestId} = renderWithIntlAndTheme(
            <PostInput
                {...baseProps}
                updateValue={updateValue}
            />,
        );

        const input = getByTestId('post.input');

        expect(input.props.defaultValue).toBe('Hello');
        expect(input.props.value).toBeUndefined();

        fireEvent.changeText(input, 'Hello vilag');

        expect(updateValue).toHaveBeenCalledWith('Hello vilag');
    });
});
