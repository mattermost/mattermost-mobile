// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {dismissBottomSheet} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {showSnackBar} from '@utils/snack_bar';

import RescheduledDraft from './rescheduled_draft';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@screens/navigation', () => {
    return {
        dismissBottomSheet: jest.fn(() => Promise.resolve()),
        showModal: jest.fn(),
    };
});

jest.mock('@utils/snack_bar', () => {
    return {
        showSnackBar: jest.fn(),
    };
});

// Mock CompassIcon as a function component
jest.mock('@components/compass_icon', () => {
    const MockCompassIcon = () => null;
    MockCompassIcon.getImageSourceSync = jest.fn(() => 'mockedImageSource');
    return MockCompassIcon;
});

describe('RescheduledDraft', () => {
    const baseProps = {
        bottomSheetId: 'bottomSheet1' as AvailableScreens,
        draft: {
            id: 'draft1',
            channelId: 'channel1',
            message: 'Test message',
            createAt: 1234567890,
            scheduledAt: 1234567890,
            processedAt: 1234567890,
            errorCode: '',
            toApi: true,
            updateAt: 1234567890,
            rootId: '',
            metadata: {},
        } as unknown as ScheduledPostModel,
        websocketState: 'connected' as WebsocketConnectedState,
    };

    it('renders correctly', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <RescheduledDraft {...baseProps}/>,
        );

        expect(getByTestId('rescheduled_draft')).toBeTruthy();
        expect(getByText('Reschedule')).toBeTruthy();
    });

    it('calls dismissBottomSheet when pressed with connected websocket', async () => {
        // Reset all mocks before the test
        jest.clearAllMocks();

        // Mock the functions directly
        (dismissBottomSheet as jest.Mock).mockImplementation(() => Promise.resolve());

        const {getByTestId} = renderWithIntlAndTheme(
            <RescheduledDraft {...baseProps}/>,
        );

        // Trigger the button press
        fireEvent.press(getByTestId('rescheduled_draft'));

        // Wait for dismissBottomSheet to be called
        await waitFor(() => {
            expect(dismissBottomSheet).toHaveBeenCalledWith(baseProps.bottomSheetId);
        });
    });

    it('shows snackbar error when websocket is not connected', async () => {
        // Reset all mocks before the test
        jest.clearAllMocks();

        // Get references to the original mocks
        const showModal = require('@screens/navigation').showModal;

        // Mock the functions directly
        (dismissBottomSheet as jest.Mock).mockImplementation(() => Promise.resolve());

        const disconnectedProps = {
            ...baseProps,
            websocketState: 'not_connected' as WebsocketConnectedState,
        };

        const {getByTestId} = renderWithIntlAndTheme(
            <RescheduledDraft {...disconnectedProps}/>,
        );

        fireEvent.press(getByTestId('rescheduled_draft'));

        // Wait for dismissBottomSheet to be called
        await waitFor(() => {
            expect(dismissBottomSheet).toHaveBeenCalledWith(baseProps.bottomSheetId);
        });

        // Wait for showSnackBar to be called
        await waitFor(() => {
            expect(showSnackBar).toHaveBeenCalled();
        });

        expect(showSnackBar).toHaveBeenCalledWith({
            barType: 'CONNECTION_ERROR',
            customMessage: 'No internet connection',
            type: 'error',
            keepOpen: true,
        });
        expect(showModal).not.toHaveBeenCalled();
    });
});
