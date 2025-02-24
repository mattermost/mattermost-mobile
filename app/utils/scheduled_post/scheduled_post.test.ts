// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Alert} from 'react-native';

import {deleteScheduledPost} from '@actions/remote/scheduled_post';

import {deleteScheduledPostConfirmation, getErrorStringFromCode, type ScheduledPostErrorCode} from './index';

import type {IntlShape} from 'react-intl';
import type {SwipeableMethods} from 'react-native-gesture-handler/lib/typescript/components/ReanimatedSwipeable';

jest.mock('@actions/remote/scheduled_post', () => ({
    deleteScheduledPost: jest.fn(),
}));

jest.mock('react-native', () => ({
    Alert: {
        alert: jest.fn(),
    },
}));

describe('deleteScheduledPostConfirmation', () => {
    const baseProps: {
        intl: IntlShape;
        serverUrl: string;
        scheduledPostId: string;
        swipeable?: React.RefObject<SwipeableMethods>;
    } = {
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

    it('shows confirmation dialog with correct text', () => {
        deleteScheduledPostConfirmation(baseProps);

        expect(Alert.alert).toHaveBeenCalledWith(
            'Delete scheduled post',
            'Are you sure you want to delete this scheduled post?',
            expect.any(Array),
        );
    });

    it('calls deleteScheduledPost when confirmed', () => {
        deleteScheduledPostConfirmation(baseProps);

        // Get the confirm button callback
        const confirmButton = (Alert.alert as jest.Mock).mock.calls[0][2][1];
        confirmButton.onPress();

        expect(deleteScheduledPost).toHaveBeenCalledWith(
            baseProps.serverUrl,
            baseProps.scheduledPostId,
        );
    });

    it('closes swipeable when cancelled', () => {
        deleteScheduledPostConfirmation(baseProps);

        // Get the cancel button callback
        const cancelButton = (Alert.alert as jest.Mock).mock.calls[0][2][0];
        cancelButton.onPress();

        expect(baseProps.swipeable?.current?.close).toHaveBeenCalled();
    });

    it('handles missing swipeable ref', () => {
        const propsWithoutSwipeable = {
            ...baseProps,
            swipeable: undefined,
        };

        deleteScheduledPostConfirmation(propsWithoutSwipeable);

        // Get the cancel button callback
        const cancelButton = (Alert.alert as jest.Mock).mock.calls[0][2][0];

        // Should not throw when swipeable is undefined
        expect(() => cancelButton.onPress()).not.toThrow();
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
