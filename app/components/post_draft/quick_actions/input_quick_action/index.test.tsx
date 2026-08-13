// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useKeyboardState} from '@context/keyboard_state';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import InputQuickAction from './index';

jest.mock('@context/keyboard_state', () => ({
    useKeyboardState: jest.fn(),
}));

jest.mock('@hooks/use_focus_after_emoji_dismiss', () => ({
    useFocusAfterEmojiDismiss: jest.fn((_inputRef, focusInput) => ({
        focus: focusInput,
    })),
}));

describe('InputQuickAction', () => {
    const mockGetCursorPosition = jest.fn(() => 0);
    const mockSetCursorPosition = jest.fn();
    const mockUpdateCursorPosition = jest.fn();
    const mockUseKeyboardState = jest.mocked(useKeyboardState);

    const baseProps = {
        testID: 'test-id',
        updateValue: jest.fn(),
        inputType: 'at' as const,
        focus: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseKeyboardState.mockReturnValue({
            inputRef: {current: null},
            getCursorPosition: mockGetCursorPosition,
            setCursorPosition: mockSetCursorPosition,
            updateCursorPosition: mockUpdateCursorPosition,
        } as unknown as ReturnType<typeof useKeyboardState>);
    });

    describe('fallback behavior (no cursor position functions)', () => {
        beforeEach(() => {
            mockUseKeyboardState.mockReturnValue({
                inputRef: {current: null},
                getCursorPosition: undefined,
                setCursorPosition: undefined,
                updateCursorPosition: undefined,
            } as unknown as ReturnType<typeof useKeyboardState>);
        });

        it('should add @ to empty string', () => {
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('')).toBe('@');
        });

        it('should add space before @ when text does not end with a space', () => {
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('Hello')).toBe('Hello @');
        });

        it('should not add space before @ when text ends with a space', () => {
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('Hello ')).toBe('Hello @');
        });

        it('should insert / and return it for slash input type', () => {
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    inputType='slash'
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('anything')).toBe('/');
        });

        it('should call focus after updating the value', () => {
            const focus = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    focus={focus}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            expect(focus).toHaveBeenCalledTimes(1);
        });
    });

    describe('@ input type with cursor position', () => {
        it('should insert @ at beginning (cursor=0) without adding a space', () => {
            mockGetCursorPosition.mockReturnValue(0);
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('Hello')).toBe('@Hello');
            expect(mockSetCursorPosition).toHaveBeenCalledWith(1);
            expect(mockUpdateCursorPosition).toHaveBeenCalledWith(1);
        });

        it('should insert @ at a middle cursor position', () => {
            mockGetCursorPosition.mockReturnValue(3);
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('Hello')).toBe('Hel@lo');
            expect(mockSetCursorPosition).toHaveBeenCalledWith(4);
            expect(mockUpdateCursorPosition).toHaveBeenCalledWith(4);
        });

        it('should insert " @" at end when previous char is not a space', () => {
            mockGetCursorPosition.mockReturnValue(5);
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('Hello')).toBe('Hello @');
            expect(mockSetCursorPosition).toHaveBeenCalledWith(7);
            expect(mockUpdateCursorPosition).toHaveBeenCalledWith(7);
        });

        it('should insert "@" at end when previous char is already a space', () => {
            mockGetCursorPosition.mockReturnValue(6);
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('Hello ')).toBe('Hello @');
            expect(mockSetCursorPosition).toHaveBeenCalledWith(7);
            expect(mockUpdateCursorPosition).toHaveBeenCalledWith(7);
        });

        it('should call focus after inserting @', () => {
            mockGetCursorPosition.mockReturnValue(0);
            const focus = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    focus={focus}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            expect(focus).toHaveBeenCalledTimes(1);
        });
    });

    describe('slash input type with cursor position', () => {
        it('should insert / at beginning (cursor=0)', () => {
            mockGetCursorPosition.mockReturnValue(0);
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    inputType='slash'
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('Hello')).toBe('/Hello');
            expect(mockSetCursorPosition).toHaveBeenCalledWith(1);
            expect(mockUpdateCursorPosition).toHaveBeenCalledWith(1);
        });

        it('should insert / at a middle cursor position', () => {
            mockGetCursorPosition.mockReturnValue(3);
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    inputType='slash'
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('Hello')).toBe('Hel/lo');
            expect(mockSetCursorPosition).toHaveBeenCalledWith(4);
            expect(mockUpdateCursorPosition).toHaveBeenCalledWith(4);
        });

        it('should insert / at end', () => {
            mockGetCursorPosition.mockReturnValue(5);
            const updateValue = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    inputType='slash'
                    updateValue={updateValue}
                />,
            );

            fireEvent.press(getByTestId('test-id'));

            const updateFn = updateValue.mock.calls[0][0];
            expect(updateFn('Hello')).toBe('Hello/');
            expect(mockSetCursorPosition).toHaveBeenCalledWith(6);
            expect(mockUpdateCursorPosition).toHaveBeenCalledWith(6);
        });
    });

    describe('disabled state', () => {
        it('should use testID.disabled when disabled=true', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    {...baseProps}
                    disabled={true}
                />,
            );

            expect(getByTestId('test-id.disabled')).toBeTruthy();
        });
    });
});
