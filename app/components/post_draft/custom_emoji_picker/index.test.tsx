// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {useKeyboardState} from '@context/keyboard_state';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {EmojiIndicesByAlias, Emojis} from '@utils/emoji';

import EmojiPicker from './emoji_picker';

import CustomEmojiPicker from './index';

import type {EmojiPickerProps} from './emoji_picker/emoji_picker';

jest.mock('@context/keyboard_state', () => ({
    useKeyboardState: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    Reanimated.default.call = () => {};
    return Reanimated;
});

jest.mock('./emoji_picker', () => ({
    __esModule: true,
    default: jest.fn(),
}));

let mockOnEmojiPress: ((emoji: string) => void) | null = null;

jest.mocked(EmojiPicker).mockImplementation((props: EmojiPickerProps) => {
    mockOnEmojiPress = props.onEmojiPress;
    return null;
});

describe('CustomEmojiPicker', () => {
    const mockUseKeyboardState = jest.mocked(useKeyboardState);
    const mockUpdateValue = jest.fn();
    const mockUpdateCursorPosition = jest.fn();

    let mockCursorPosition = 0;
    const mockGetCursorPosition = jest.fn(() => mockCursorPosition);
    const mockSetCursorPosition = jest.fn((pos: number) => {
        mockCursorPosition = pos;
    });

    const defaultContextValue = {
        stateContext: {
            inputAccessoryHeight: {value: 300},
        },
        updateValue: mockUpdateValue,
        updateCursorPosition: mockUpdateCursorPosition,
        getCursorPosition: mockGetCursorPosition,
        setCursorPosition: mockSetCursorPosition,
        isEmojiSearchFocused: false,
        setIsEmojiSearchFocused: jest.fn(),
    } as unknown as ReturnType<typeof useKeyboardState>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockCursorPosition = 0;
        mockGetCursorPosition.mockImplementation(() => mockCursorPosition);
        mockSetCursorPosition.mockImplementation((pos: number) => {
            mockCursorPosition = pos;
        });
        mockOnEmojiPress = null;
        mockUseKeyboardState.mockReturnValue(defaultContextValue);
    });

    const triggerEmojiPress = (emojiName: string) => {
        if (mockOnEmojiPress) {
            mockOnEmojiPress(emojiName);
        }
    };

    describe('emoji insertion at cursor position', () => {
        it('should insert emoji at the beginning of text when cursor is at position 0', () => {
            mockCursorPosition = 0;
            const initialValue = 'Hello world';

            renderWithIntlAndTheme(<CustomEmojiPicker/>);

            const emojiName = 'smile';
            triggerEmojiPress(emojiName);

            expect(mockUpdateValue).toHaveBeenCalled();
            const updateFunction = mockUpdateValue.mock.calls[0][0];
            expect(typeof updateFunction).toBe('function');

            const result = updateFunction(initialValue);

            expect(result.endsWith(initialValue)).toBe(true);
            expect(result.length).toBeGreaterThan(initialValue.length);
            expect(result.substring(0, initialValue.length)).not.toBe(initialValue);
        });

        it('should insert emoji at the middle of text when cursor is at position 5', () => {
            mockCursorPosition = 5;
            const initialValue = 'Hello world';

            renderWithIntlAndTheme(<CustomEmojiPicker/>);

            const emojiName = 'smile';
            triggerEmojiPress(emojiName);

            expect(mockUpdateValue).toHaveBeenCalled();
            const updateFunction = mockUpdateValue.mock.calls[0][0];
            const result = updateFunction(initialValue);

            expect(result.substring(0, 5)).toBe('Hello');
            expect(result.substring(5)).toContain(' world');
            expect(result.length).toBeGreaterThan(initialValue.length);

            expect(result.substring(0, 11)).not.toBe(initialValue);
        });

        it('should insert emoji at the end of text when cursor is at the end', () => {
            mockCursorPosition = 11;
            const initialValue = 'Hello world';

            renderWithIntlAndTheme(<CustomEmojiPicker/>);

            const emojiName = 'smile';
            triggerEmojiPress(emojiName);

            expect(mockUpdateValue).toHaveBeenCalled();
            const updateFunction = mockUpdateValue.mock.calls[0][0];
            const result = updateFunction(initialValue);

            expect(result.substring(0, 11)).toBe('Hello world');
            expect(result.length).toBeGreaterThan(initialValue.length);
            expect(result.substring(11)).not.toBe('');
        });

        it('should update cursor position after emoji insertion', () => {
            mockCursorPosition = 5;

            renderWithIntlAndTheme(<CustomEmojiPicker/>);

            const emojiName = 'smile';
            triggerEmojiPress(emojiName);

            const emojiIndex = EmojiIndicesByAlias.get(emojiName);
            let insertedTextLength = 0;
            if (emojiIndex !== undefined) {
                const emoji = Emojis[emojiIndex];
                if (emoji.category === 'custom') {
                    insertedTextLength = ` :${emojiName}: `.length;
                } else {
                    const unicode = emoji.image;
                    if (unicode) {
                        const codeArray = unicode.split('-');
                        const convertToUnicode = (acc: string, c: string) => {
                            return acc + String.fromCodePoint(parseInt(c, 16));
                        };
                        insertedTextLength = codeArray.reduce(convertToUnicode, '').length;
                    } else {
                        insertedTextLength = ` :${emojiName}: `.length;
                    }
                }
            }

            expect(mockUpdateCursorPosition).toHaveBeenCalledWith(5 + insertedTextLength);
            expect(mockCursorPosition).toBe(5 + insertedTextLength);
        });

        it('should set cursor position immediately via setCursorPosition after emoji insertion', () => {
            mockCursorPosition = 5;

            renderWithIntlAndTheme(<CustomEmojiPicker/>);

            const emojiName = 'smile';
            triggerEmojiPress(emojiName);

            expect(mockSetCursorPosition).toHaveBeenCalled();
            const newPos = mockSetCursorPosition.mock.calls[0][0];
            expect(newPos).toBeGreaterThan(5);
        });
    });

    describe('multiple emoji insertions', () => {
        it('should insert second emoji at correct position after first emoji', () => {
            mockCursorPosition = 5;
            const initialValue = 'Hello world';

            renderWithIntlAndTheme(<CustomEmojiPicker/>);

            // First emoji insertion
            const firstEmojiName = 'smile';
            triggerEmojiPress(firstEmojiName);

            expect(mockUpdateValue).toHaveBeenCalledTimes(1);
            const firstUpdateFunction = mockUpdateValue.mock.calls[0][0];
            const valueAfterFirstEmoji = firstUpdateFunction(initialValue);

            // Get the length of the first emoji
            const firstEmojiIndex = EmojiIndicesByAlias.get(firstEmojiName);
            let firstEmojiLength = 0;
            if (firstEmojiIndex !== undefined) {
                const emoji = Emojis[firstEmojiIndex];
                if (emoji.category === 'custom') {
                    firstEmojiLength = ` :${firstEmojiName}: `.length;
                } else {
                    const unicode = emoji.image;
                    if (unicode) {
                        const codeArray = unicode.split('-');
                        const convertToUnicode = (acc: string, c: string) => {
                            return acc + String.fromCodePoint(parseInt(c, 16));
                        };
                        firstEmojiLength = codeArray.reduce(convertToUnicode, '').length;
                    } else {
                        firstEmojiLength = ` :${firstEmojiName}: `.length;
                    }
                }
            }

            const expectedCursorAfterFirst = 5 + firstEmojiLength;
            expect(mockCursorPosition).toBe(expectedCursorAfterFirst);

            mockUpdateValue.mockClear();

            const secondEmojiName = 'heart';
            triggerEmojiPress(secondEmojiName);

            expect(mockUpdateValue).toHaveBeenCalledTimes(1);
            const secondUpdateFunction = mockUpdateValue.mock.calls[0][0];
            const result = secondUpdateFunction(valueAfterFirstEmoji);

            expect(result.length).toBeGreaterThan(valueAfterFirstEmoji.length);
        });
    });

    describe('custom emoji insertion', () => {
        it('should insert custom emoji with :emoji_name: format', () => {
            mockCursorPosition = 5;
            const initialValue = 'Hello world';

            renderWithIntlAndTheme(<CustomEmojiPicker/>);

            // Use an emoji name that doesn't exist in EmojiIndicesByAlias
            // This will trigger the fallback to :emoji_name: format
            const customEmojiName = 'nonexistent_emoji';
            triggerEmojiPress(customEmojiName);

            expect(mockUpdateValue).toHaveBeenCalled();
            const updateFunction = mockUpdateValue.mock.calls[0][0];
            const result = updateFunction(initialValue);

            // Should insert :nonexistent_emoji: format
            expect(result).toContain(` :${customEmojiName}: `);
            expect(result.substring(0, 5)).toBe('Hello');
        });
    });
});
