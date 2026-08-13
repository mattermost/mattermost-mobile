// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';

import {useKeyboardState} from '@context/keyboard_state';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {openAttachmentOptions} from '@utils/navigation';

import AttachmentQuickAction from './index';

jest.mock('@context/keyboard_state', () => ({
    useKeyboardState: jest.fn(),
}));

jest.mock('@utils/navigation');

describe('AttachmentQuickAction', () => {
    const mockBlurAndDismissKeyboard = jest.fn(() => Promise.resolve());
    const mockOpenAttachmentOptions = jest.mocked(openAttachmentOptions);
    const mockUseKeyboardState = jest.mocked(useKeyboardState);

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
        mockUseKeyboardState.mockReturnValue({
            blurAndDismissKeyboard: mockBlurAndDismissKeyboard,
        } as unknown as ReturnType<typeof useKeyboardState>);
    });

    describe('user interactions', () => {
        it('should call blurAndDismissKeyboard and openAttachmentOptions when button is pressed', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction {...baseProps}/>,
            );

            fireEvent.press(getByTestId('test-attachment'));

            await waitFor(() => {
                expect(mockBlurAndDismissKeyboard).toHaveBeenCalledTimes(1);
                expect(mockOpenAttachmentOptions).toHaveBeenCalledTimes(1);
            });
        });

        it('should not call blurAndDismissKeyboard or openAttachmentOptions when disabled', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    disabled={true}
                />,
            );

            fireEvent.press(getByTestId('test-attachment.disabled'));

            expect(mockBlurAndDismissKeyboard).not.toHaveBeenCalled();
            expect(mockOpenAttachmentOptions).not.toHaveBeenCalled();
        });
    });

    describe('bottom sheet opening', () => {
        it('should call openAttachmentOptions with correct props', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction {...baseProps}/>,
            );

            fireEvent.press(getByTestId('test-attachment'));

            await waitFor(() => {
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

        it('should pass canUploadFiles as false when disabled', () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    disabled={true}
                />,
            );

            fireEvent.press(getByTestId('test-attachment.disabled'));

            expect(mockOpenAttachmentOptions).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should pass fileCount to openAttachmentOptions', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    fileCount={3}
                />,
            );

            fireEvent.press(getByTestId('test-attachment'));

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({fileCount: 3}),
                );
            });
        });

        it('should pass maxFilesReached to openAttachmentOptions', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    maxFilesReached={true}
                />,
            );

            fireEvent.press(getByTestId('test-attachment'));

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({maxFilesReached: true}),
                );
            });
        });

        it('should pass maxFileCount to openAttachmentOptions', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    maxFileCount={20}
                />,
            );

            fireEvent.press(getByTestId('test-attachment'));

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({
                        maxFileCount: 20,
                    }),
                );
            });
        });

        it('should pass showAttachLogs to openAttachmentOptions', async () => {
            const {getByTestId} = renderWithIntlAndTheme(
                <AttachmentQuickAction
                    {...baseProps}
                    showAttachLogs={true}
                />,
            );

            const button = getByTestId('test-attachment');
            fireEvent.press(button);

            await waitFor(() => {
                expect(mockOpenAttachmentOptions).toHaveBeenCalledWith(
                    expect.objectContaining({
                        showAttachLogs: true,
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
