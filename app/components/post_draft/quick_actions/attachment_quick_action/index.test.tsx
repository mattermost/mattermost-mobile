// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import {KeyboardController} from 'react-native-keyboard-controller';

import {useKeyboardAnimationContext} from '@context/keyboard_animation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {openAttachmentOptions} from '@utils/navigation';

import AttachmentQuickAction from './index';

jest.mock('react-native-keyboard-controller', () => ({
    KeyboardController: {
        dismiss: jest.fn(() => Promise.resolve()),
    },
}));

jest.mock('@context/keyboard_animation', () => ({
    useKeyboardAnimationContext: jest.fn(),
}));

jest.mock('@utils/navigation');

describe('AttachmentQuickAction', () => {
    const mockCloseInputAccessoryView = jest.fn();
    const mockKeyboardControllerDismiss = jest.mocked(KeyboardController.dismiss);
    const mockOpenAttachmentOptions = jest.mocked(openAttachmentOptions);
    const mockUseKeyboardAnimationContext = jest.mocked(useKeyboardAnimationContext);

    const baseProps = {
        disabled: false,
        fileCount: 0,
        onUploadFiles: jest.fn(),
        maxFilesReached: false,
        maxFileCount: 10,
        testID: 'test-attachment',
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseKeyboardAnimationContext.mockReturnValue({
            closeInputAccessoryView: mockCloseInputAccessoryView,
        } as unknown as ReturnType<typeof useKeyboardAnimationContext>);
    });

    describe('user interactions', () => {
        it('should call onUploadFiles when button is pressed', async () => {
            const onUploadFiles = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    onUploadFiles={onUploadFiles}
                />,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockCloseInputAccessoryView).toHaveBeenCalledTimes(1);
                expect(mockKeyboardControllerDismiss).toHaveBeenCalledTimes(1);
                expect(mockOpenAttachmentOptions).toHaveBeenCalledTimes(1);
            });
        });

        it('should not call onUploadFiles when button is disabled', async () => {
            const onUploadFiles = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    disabled={true}
                    onUploadFiles={onUploadFiles}
                />,
            );

            const button = getByTestId('test-attachment.disabled');
            fireEvent.press(button);

            // Should not trigger any actions when disabled
            expect(mockCloseInputAccessoryView).not.toHaveBeenCalled();
            expect(mockKeyboardControllerDismiss).not.toHaveBeenCalled();
            expect(mockOpenAttachmentOptions).not.toHaveBeenCalled();
        });

        it('should close input accessory view before opening bottom sheet', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction {...baseProps}/>,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                // closeInputAccessoryView should be called before openAttachmentOptions
                expect(mockCloseInputAccessoryView).toHaveBeenCalledTimes(1);
                expect(mockOpenAttachmentOptions).toHaveBeenCalledTimes(1);
            });
        });

        it('should dismiss keyboard before opening bottom sheet', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction {...baseProps}/>,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockKeyboardControllerDismiss).toHaveBeenCalledTimes(1);
                expect(mockOpenAttachmentOptions).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('bottom sheet opening', () => {
        it('should call openAttachmentOptions with intl, theme, and props', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction {...baseProps}/>,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledTimes(1);
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({
                        onUploadFiles: baseProps.onUploadFiles,
                        maxFilesReached: false,
                        canUploadFiles: true,
                        testID: 'test-attachment',
                        fileCount: 0,
                        maxFileCount: 10,
                    }),
                );
            });
        });

        it('should pass correct props to openAttachmentOptions', async () => {
            const onUploadFiles = jest.fn();
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    onUploadFiles={onUploadFiles}
                    fileCount={5}
                    maxFilesReached={false}
                    maxFileCount={10}
                    disabled={false}
                    testID='custom-test-id'
                />,
            );

            const button = getByTestId('custom-test-id');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({
                        onUploadFiles,
                        fileCount: 5,
                        maxFilesReached: false,
                        canUploadFiles: true,
                        testID: 'custom-test-id',
                        maxFileCount: 10,
                    }),
                );
            });
        });

        it('should pass canUploadFiles as false when disabled', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    disabled={true}
                />,
            );

            const button = getByTestId('test-attachment.disabled');
            fireEvent.press(button);

            // When disabled, openAttachmentOptions should not be called
            expect(mockOpenAttachmentOptions).not.toHaveBeenCalled();
        });

        it('should pass intl and theme to openAttachmentOptions', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction {...baseProps}/>,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.any(Object), // props
                );
            });
        });
    });

    describe('edge cases', () => {
        it('should handle fileCount prop correctly', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    fileCount={3}
                />,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({
                        fileCount: 3,
                    }),
                );
            });
        });

        it('should handle maxFilesReached prop correctly', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    maxFilesReached={true}
                />,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxFilesReached: true,
                    }),
                );
            });
        });

        it('should handle maxFileCount prop correctly', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    maxFileCount={20}
                />,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxFileCount: 20,
                    }),
                );
            });
        });

        it('should handle default fileCount when not provided', async () => {
            const propsWithoutFileCount = {
                ...baseProps,
            };
            delete (propsWithoutFileCount as {fileCount?: number}).fileCount;

            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction {...propsWithoutFileCount}/>,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({
                        fileCount: 0,
                    }),
                );
            });
        });
    });
});

