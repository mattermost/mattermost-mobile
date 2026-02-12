// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {fireEvent, renderWithIntlAndTheme} from '@test/intl-test-helper';

import InputQuickAction from '.';

jest.mock('@context/keyboard_animation', () => ({
    useKeyboardAnimationContext: jest.fn(),
}));

jest.mock('@hooks/useFocusAfterEmojiDismiss', () => ({
    useFocusAfterEmojiDismiss: jest.fn((inputRef, focusInput) => ({
        focus: focusInput,
        isDismissingEmojiPicker: {current: false},
        focusTimeoutRef: {current: null},
        isManuallyFocusingAfterEmojiDismiss: false,
    })),
}));

describe('InputQuickAction', () => {
    const mockUseKeyboardAnimationContext = jest.mocked(useKeyboardAnimationContext);
    const mockUpdateCursorPosition = jest.fn();
    const mockInputRef = {current: undefined};

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('fallback behavior (no cursor position context)', () => {
        beforeEach(() => {
            mockUseKeyboardAnimationContext.mockReturnValue({
                inputRef: mockInputRef,
                cursorPositionRef: undefined,
                updateCursorPosition: undefined,
            } as unknown as ReturnType<typeof useKeyboardAnimationContext>);
        });

        it('should add @ to empty string', () => {
            const updateValue = jest.fn();
            const testID = 'test-id';
            const inputType = 'at';
            const focus = jest.fn();

            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    testID={testID}
                    updateValue={updateValue}
                    inputType={inputType}
                    focus={focus}
                />);

            const icon = getByTestId('test-id');
            fireEvent.press(icon);

            expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
            const updateFunction = updateValue.mock.calls[0][0];
            expect(updateFunction('')).toBe('@');
            expect(focus).toHaveBeenCalled();
        });

        it('should add space before @ if there is existing text and it doesnt end with a space', () => {
            const updateValue = jest.fn();
            const testID = 'test-id';
            const inputType = 'at';
            const focus = jest.fn();

            const {getByTestId} = renderWithIntlAndTheme(
                <InputQuickAction
                    testID={testID}
                    updateValue={updateValue}
                    inputType={inputType}
                    focus={focus}
                />);

            const icon = getByTestId('test-id');
            fireEvent.press(icon);

            expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
            const updateFunction = updateValue.mock.calls[0][0];
            expect(updateFunction('Hello')).toBe('Hello @');
            expect(focus).toHaveBeenCalled();
        });
    });

    describe('cursor position insertion', () => {
        let cursorPositionRef: {current: number};

        beforeEach(() => {
            cursorPositionRef = {current: 0};
            mockUseKeyboardAnimationContext.mockReturnValue({
                inputRef: mockInputRef,
                cursorPositionRef,
                updateCursorPosition: mockUpdateCursorPosition,
            } as unknown as ReturnType<typeof useKeyboardAnimationContext>);
        });

        describe('@ input type', () => {
            it('should insert @ at cursor position at the beginning', () => {
                const updateValue = jest.fn();
                const testID = 'test-id';
                const inputType = 'at';
                const focus = jest.fn();
                cursorPositionRef.current = 0;

                const {getByTestId} = renderWithIntlAndTheme(
                    <InputQuickAction
                        testID={testID}
                        updateValue={updateValue}
                        inputType={inputType}
                        focus={focus}
                    />);

                const icon = getByTestId('test-id');
                fireEvent.press(icon);

                expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
                const updateFunction = updateValue.mock.calls[0][0];
                expect(updateFunction('Hello')).toBe('@Hello');
                expect(cursorPositionRef.current).toBe(1);
                expect(mockUpdateCursorPosition).toHaveBeenCalledWith(1);
                expect(focus).toHaveBeenCalled();
            });

            it('should insert @ at cursor position in the middle', () => {
                const updateValue = jest.fn();
                const testID = 'test-id';
                const inputType = 'at';
                const focus = jest.fn();
                cursorPositionRef.current = 3;

                const {getByTestId} = renderWithIntlAndTheme(
                    <InputQuickAction
                        testID={testID}
                        updateValue={updateValue}
                        inputType={inputType}
                        focus={focus}
                    />);

                const icon = getByTestId('test-id');
                fireEvent.press(icon);

                expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
                const updateFunction = updateValue.mock.calls[0][0];
                expect(updateFunction('Hello')).toBe('Hel@lo');
                expect(cursorPositionRef.current).toBe(4);
                expect(mockUpdateCursorPosition).toHaveBeenCalledWith(4);
                expect(focus).toHaveBeenCalled();
            });

            it('should insert @ at cursor position at the end', () => {
                const updateValue = jest.fn();
                const testID = 'test-id';
                const inputType = 'at';
                const focus = jest.fn();
                cursorPositionRef.current = 5;

                const {getByTestId} = renderWithIntlAndTheme(
                    <InputQuickAction
                        testID={testID}
                        updateValue={updateValue}
                        inputType={inputType}
                        focus={focus}
                    />);

                const icon = getByTestId('test-id');
                fireEvent.press(icon);

                expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
                const updateFunction = updateValue.mock.calls[0][0];
                expect(updateFunction('Hello')).toBe('Hello @');
                expect(cursorPositionRef.current).toBe(7);
                expect(mockUpdateCursorPosition).toHaveBeenCalledWith(7);
                expect(focus).toHaveBeenCalled();
            });

            it('should add space before @ when cursor is at the end and previous char is not space', () => {
                const updateValue = jest.fn();
                const testID = 'test-id';
                const inputType = 'at';
                const focus = jest.fn();
                cursorPositionRef.current = 5;

                const {getByTestId} = renderWithIntlAndTheme(
                    <InputQuickAction
                        testID={testID}
                        updateValue={updateValue}
                        inputType={inputType}
                        focus={focus}
                    />);

                const icon = getByTestId('test-id');
                fireEvent.press(icon);

                expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
                const updateFunction = updateValue.mock.calls[0][0];
                expect(updateFunction('Hello')).toBe('Hello @');
                expect(cursorPositionRef.current).toBe(7);
                expect(mockUpdateCursorPosition).toHaveBeenCalledWith(7);
                expect(focus).toHaveBeenCalled();
            });

            it('should not add space before @ when cursor is at the end and previous char is space', () => {
                const updateValue = jest.fn();
                const testID = 'test-id';
                const inputType = 'at';
                const focus = jest.fn();
                cursorPositionRef.current = 6;

                const {getByTestId} = renderWithIntlAndTheme(
                    <InputQuickAction
                        testID={testID}
                        updateValue={updateValue}
                        inputType={inputType}
                        focus={focus}
                    />);

                const icon = getByTestId('test-id');
                fireEvent.press(icon);

                expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
                const updateFunction = updateValue.mock.calls[0][0];
                expect(updateFunction('Hello ')).toBe('Hello @');
                expect(cursorPositionRef.current).toBe(7);
                expect(mockUpdateCursorPosition).toHaveBeenCalledWith(7);
                expect(focus).toHaveBeenCalled();
            });

            it('should not add space before @ when cursor is at the beginning', () => {
                const updateValue = jest.fn();
                const testID = 'test-id';
                const inputType = 'at';
                const focus = jest.fn();
                cursorPositionRef.current = 0;

                const {getByTestId} = renderWithIntlAndTheme(
                    <InputQuickAction
                        testID={testID}
                        updateValue={updateValue}
                        inputType={inputType}
                        focus={focus}
                    />);

                const icon = getByTestId('test-id');
                fireEvent.press(icon);

                expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
                const updateFunction = updateValue.mock.calls[0][0];
                expect(updateFunction('Hello')).toBe('@Hello');
                expect(cursorPositionRef.current).toBe(1);
                expect(mockUpdateCursorPosition).toHaveBeenCalledWith(1);
                expect(focus).toHaveBeenCalled();
            });
        });

        describe('slash input type', () => {
            it('should insert / at cursor position at the beginning', () => {
                const updateValue = jest.fn();
                const testID = 'test-id';
                const inputType = 'slash';
                const focus = jest.fn();
                cursorPositionRef.current = 0;

                const {getByTestId} = renderWithIntlAndTheme(
                    <InputQuickAction
                        testID={testID}
                        updateValue={updateValue}
                        inputType={inputType}
                        focus={focus}
                    />);

                const icon = getByTestId('test-id');
                fireEvent.press(icon);

                expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
                const updateFunction = updateValue.mock.calls[0][0];
                expect(updateFunction('Hello')).toBe('/Hello');
                expect(cursorPositionRef.current).toBe(1);
                expect(mockUpdateCursorPosition).toHaveBeenCalledWith(1);
                expect(focus).toHaveBeenCalled();
            });

            it('should insert / at cursor position in the middle', () => {
                const updateValue = jest.fn();
                const testID = 'test-id';
                const inputType = 'slash';
                const focus = jest.fn();
                cursorPositionRef.current = 3;

                const {getByTestId} = renderWithIntlAndTheme(
                    <InputQuickAction
                        testID={testID}
                        updateValue={updateValue}
                        inputType={inputType}
                        focus={focus}
                    />);

                const icon = getByTestId('test-id');
                fireEvent.press(icon);

                expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
                const updateFunction = updateValue.mock.calls[0][0];
                expect(updateFunction('Hello')).toBe('Hel/lo');
                expect(cursorPositionRef.current).toBe(4);
                expect(mockUpdateCursorPosition).toHaveBeenCalledWith(4);
                expect(focus).toHaveBeenCalled();
            });

            it('should insert / at cursor position at the end', () => {
                const updateValue = jest.fn();
                const testID = 'test-id';
                const inputType = 'slash';
                const focus = jest.fn();
                cursorPositionRef.current = 5;

                const {getByTestId} = renderWithIntlAndTheme(
                    <InputQuickAction
                        testID={testID}
                        updateValue={updateValue}
                        inputType={inputType}
                        focus={focus}
                    />);

                const icon = getByTestId('test-id');
                fireEvent.press(icon);

                expect(updateValue).toHaveBeenCalledWith(expect.any(Function));
                const updateFunction = updateValue.mock.calls[0][0];
                expect(updateFunction('Hello')).toBe('Hello/');
                expect(cursorPositionRef.current).toBe(6);
                expect(mockUpdateCursorPosition).toHaveBeenCalledWith(6);
                expect(focus).toHaveBeenCalled();
            });
        });
    });
});
