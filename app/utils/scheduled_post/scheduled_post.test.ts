// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {act} from 'react';
import {Alert} from 'react-native';

import {deleteScheduledPost} from '@actions/remote/scheduled_post';
import DatabaseManager from '@database/manager';
import {showSnackBar} from '@utils/snack_bar';

import {deleteScheduledPostConfirmation, hasScheduledPostError, isScheduledPostModel, getErrorStringFromCode, canPostDraftInChannelOrThread} from './index';

import type {ServerDatabase} from '@typings/database/database';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {ScheduledPostErrorCode} from '@typings/utils/scheduled_post';
import type {IntlShape} from 'react-intl';
import type {SwipeableMethods} from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';

// Mock dependencies before importing the module under test
jest.mock('@utils/snack_bar', () => ({
    showSnackBar: jest.fn(),
}));

jest.mock('@actions/remote/scheduled_post', () => ({
    deleteScheduledPost: jest.fn(),
}));

jest.mock('@database/manager', () => ({
    getServerDatabaseAndOperator: jest.fn(),
}));

describe('deleteScheduledPostConfirmation', () => {
    const baseProps: Parameters<typeof deleteScheduledPostConfirmation>[0] = {
        intl: {
            formatMessage: ({defaultMessage}: {defaultMessage: string}) => defaultMessage,
        } as IntlShape,
        serverUrl: 'http://baseUrl.com',
        scheduledPostId: 'post123',
        swipeable: {
            current: {
                close: jest.fn(),
            },
        } as unknown as React.RefObject<SwipeableMethods>,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('shows confirmation dialog with correct text and buttons', () => {
        deleteScheduledPostConfirmation(baseProps);

        const alertCall = jest.mocked(Alert.alert).mock.calls[0];
        expect(alertCall[0]).toBe('Delete scheduled post');
        expect(alertCall[1]).toBe('Are you sure you want to delete this scheduled post?');

        // Ensure buttons exist
        expect(alertCall[2]).toBeDefined();
        const buttons = alertCall[2] ?? [];

        expect(buttons).toHaveLength(2);

        // Check Cancel button
        expect(buttons[0]?.text).toBe('Cancel');
        expect(typeof buttons[0]?.onPress).toBe('function');

        // Check Delete button
        expect(buttons[1]?.text).toBe('Delete');
        expect(typeof buttons[1]?.onPress).toBe('function');
    });

    it('calls deleteScheduledPost when confirmed', () => {
        deleteScheduledPostConfirmation(baseProps);

        const alertMock = jest.mocked(Alert.alert);
        expect(alertMock).toHaveBeenCalled();

        const alertCall = alertMock.mock.calls[0];
        expect(alertCall).toBeDefined();

        const buttons = alertCall[2] ?? [];
        expect(buttons).toHaveLength(2);

        const confirmButton = buttons[1];
        expect(confirmButton).toBeDefined();
        expect(confirmButton.onPress).toBeDefined();

        confirmButton.onPress?.();

        // Verify deleteScheduledPost is called with the correct arguments
        expect(deleteScheduledPost).toHaveBeenCalledWith(
            baseProps.serverUrl,
            baseProps.scheduledPostId,
        );

        expect(showSnackBar).not.toHaveBeenCalled();
    });

    it('closes swipeable when cancelled', () => {
        deleteScheduledPostConfirmation(baseProps);

        const alertMock = jest.mocked(Alert.alert);
        expect(alertMock).toHaveBeenCalled();
        const alertCall = alertMock.mock.calls[0];
        expect(alertCall).toBeDefined();
        const buttons = alertCall[2] ?? [];
        expect(buttons).toHaveLength(2);

        const cancelButton = buttons[0];
        expect(cancelButton).toBeDefined();
        expect(cancelButton.onPress).toBeDefined();

        cancelButton.onPress?.();

        // Verify swipeable close is called
        expect(baseProps.swipeable?.current?.close).toHaveBeenCalled();
        expect(deleteScheduledPost).not.toHaveBeenCalled();
    });

    it('handles missing swipeable ref', () => {
        const propsWithoutSwipeable = {
            ...baseProps,
            swipeable: undefined,
        };

        deleteScheduledPostConfirmation(propsWithoutSwipeable);

        // Get the cancel button callback
        const alertMock = jest.mocked(Alert.alert);
        const buttons = alertMock.mock.calls[0]?.[2] ?? []; // Ensure buttons array exists
        const cancelButton = buttons[0];
        expect(cancelButton).toBeDefined();
        const onPress = cancelButton.onPress!;
        expect(() => onPress()).not.toThrow();
    });

    it('handles missing swipeable.current', () => {
        const propsWithoutSwipeableCurrent = {
            ...baseProps,
            swipeable: {current: null} as unknown as React.RefObject<SwipeableMethods>,
        };

        deleteScheduledPostConfirmation(propsWithoutSwipeableCurrent);

        // Get the cancel button callback
        const alertMock = jest.mocked(Alert.alert);
        const buttons = alertMock.mock.calls[0]?.[2] ?? []; // Ensure buttons array exists
        const cancelButton = buttons[0];
        expect(cancelButton).toBeDefined();
        const onPress = cancelButton.onPress ?? (() => {});
        expect(() => onPress()).not.toThrow();
    });

    it('shows error snackbar when deleteScheduledPost fails', async () => {
        const errorMessage = 'Failed to delete scheduled post';

        jest.mocked(deleteScheduledPost).mockResolvedValueOnce({
            error: new Error(errorMessage),
        });

        deleteScheduledPostConfirmation(baseProps);

        const alertMock = jest.mocked(Alert.alert);
        expect(alertMock).toHaveBeenCalled();

        const alertCall = alertMock.mock.calls[0];
        expect(alertCall).toBeDefined();

        const buttons = alertCall[2] ?? [];
        expect(buttons).toHaveLength(2);

        const confirmButton = buttons[1];
        expect(confirmButton).toBeDefined();
        expect(confirmButton.onPress).toBeDefined();

        await act(async () => {
            await confirmButton.onPress?.();
        });

        expect(showSnackBar).toHaveBeenCalledWith({
            barType: 'DELETE_SCHEDULED_POST_ERROR',
            customMessage: errorMessage,
            type: 'error',
        });
    });
});

describe('isScheduledPostModel', () => {
    it('returns true for a valid scheduled post model', () => {
        const scheduledPostModel = {
            toApi: () => { },
        } as unknown as ScheduledPostModel;
        expect(isScheduledPostModel(scheduledPostModel)).toBe(true);
    });

    it('returns false for an invalid scheduled post model', () => {
        const invalidScheduledPostModel = {} as ScheduledPost;
        expect(isScheduledPostModel(invalidScheduledPostModel)).toBe(false);
    });
});

describe('hasScheduledPostError', () => {
    test('should return true if any scheduled post has an error code', () => {
        const scheduledPosts = [
            {errorCode: 'error1'},
            {errorCode: ''},
            {errorCode: 'error2'},
        ] as ScheduledPostModel[];
        expect(hasScheduledPostError(scheduledPosts)).toBe(true);
    });

    test('should return false if no scheduled post has an error code', () => {
        const scheduledPosts = [
            {errorCode: ''},
            {errorCode: ''},
            {errorCode: ''},
        ] as ScheduledPostModel[];
        expect(hasScheduledPostError(scheduledPosts)).toBe(false);
    });
});

describe('getErrorStringFromCode', () => {
    const mockIntl = {
        formatMessage: jest.fn((message) => message.defaultMessage),
    } as unknown as IntlShape;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return correct error message for known error codes', () => {
        const testCases: ScheduledPostErrorCode[] = [
            'channel_archived',
            'channel_not_found',
            'user_missing',
            'user_deleted',
            'no_channel_permission',
            'no_channel_member',
            'thread_deleted',
            'unable_to_send',
            'invalid_post',
        ];

        const expectedMessages = [
            'Channel Archived',
            'Channel Removed',
            'User Deleted',
            'User Deleted',
            'Missing Permission',
            'Not In Channel',
            'Thread Deleted',
            'Unable to Send',
            'Invalid Post',
        ];

        testCases.forEach((errorCode, index) => {
            const result = getErrorStringFromCode(mockIntl, errorCode);
            expect(result).toBe(expectedMessages[index].toUpperCase());
        });
    });

    it('should return "UNKNOWN ERROR" for undefined error code', () => {
        const result = getErrorStringFromCode(mockIntl);
        expect(result).toBe('UNKNOWN ERROR');
    });

    it('should return "UNKNOWN ERROR" for unknown error code', () => {
        const result = getErrorStringFromCode(mockIntl, 'unknown');
        expect(result).toBe('UNKNOWN ERROR');
    });
});

describe('canPostDraftInChannelOrThread', () => {
    const intl = {
        formatMessage: ({defaultMessage}) => defaultMessage,
    } as IntlShape;
    const serverUrl = 'testServer';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementation((newServerUrl) => ({database: `db_${newServerUrl}`} as unknown as ServerDatabase));
    });

    it('should return false and show alert if root post does not exist', async () => {
        const result = await canPostDraftInChannelOrThread({serverUrl, rootId: '123', intl});
        expect(result).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Sending post failed',
            'Someone delete the message on which you tried to post a comment.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should return false and show alert if channel is archived', async () => {
        const result = await canPostDraftInChannelOrThread({serverUrl, intl, channelIsArchived: true});
        expect(result).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Sending post failed',
            'You cannot post to an archived channel.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should return false and show alert if channel is read-only', async () => {
        const result = await canPostDraftInChannelOrThread({serverUrl, intl, channelIsReadOnly: true});
        expect(result).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Sending post failed',
            'You cannot post to a read-only channel.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should return false and show alert if channel is deactivated', async () => {
        const result = await canPostDraftInChannelOrThread({serverUrl, intl, deactivatedChannel: true});
        expect(result).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Sending post failed',
            'You cannot post to a deactivated channel.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should return false and show alert if user cannot post', async () => {
        const result = await canPostDraftInChannelOrThread({serverUrl, intl, canPost: false});
        expect(result).toBe(false);
        expect(Alert.alert).toHaveBeenCalledWith(
            'Sending post failed',
            'You do not have permission to post in this channel.',
            expect.any(Array),
            {cancelable: false},
        );
    });

    it('should return true if all conditions are met', async () => {
        const result = await canPostDraftInChannelOrThread({
            serverUrl, intl, canPost: true, channelIsArchived: false, channelIsReadOnly: false, deactivatedChannel: false,
        });
        expect(result).toBe(true);
        expect(Alert.alert).not.toHaveBeenCalled();
    });
});
