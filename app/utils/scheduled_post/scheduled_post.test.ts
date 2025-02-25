// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import {Alert} from 'react-native';

import {deleteScheduledPost} from '@actions/remote/scheduled_post';

import {deleteScheduledPostConfirmation} from './index';

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

        const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
        expect(alertCall[0]).toBe('Delete scheduled post');
        expect(alertCall[1]).toBe('Are you sure you want to delete this scheduled post?');

        const buttons = alertCall[2];
        expect(buttons).toHaveLength(2);

        // Check Cancel button
        expect(buttons[0].text).toBe('Cancel');
        expect(typeof buttons[0].onPress).toBe('function');

        // Check Delete button
        expect(buttons[1].text).toBe('Delete');
        expect(typeof buttons[1].onPress).toBe('function');
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

    it('handles missing swipeable.current', () => {
        const propsWithoutSwipeableCurrent = {
            ...baseProps,
            swipeable: {current: null} as unknown as React.RefObject<SwipeableMethods>,
        };

        deleteScheduledPostConfirmation(propsWithoutSwipeableCurrent);

        // Get the cancel button callback
        const cancelButton = (Alert.alert as jest.Mock).mock.calls[0][2][0];

        // Should not throw when swipeable.current is null
        expect(() => cancelButton.onPress()).not.toThrow();
    });
});
