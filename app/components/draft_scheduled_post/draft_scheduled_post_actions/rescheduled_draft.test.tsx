// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {dismissBottomSheet, showModal} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RescheduledDraft from './rescheduled_draft';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@screens/navigation', () => {
    return {
        dismissBottomSheet: jest.fn(() => Promise.resolve()),
        showModal: jest.fn(),
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
    };

    it('renders correctly', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <RescheduledDraft {...baseProps}/>,
        );

        expect(getByTestId('rescheduled_draft')).toBeTruthy();
        expect(getByText('Reschedule')).toBeTruthy();
    });

    it('calls dismissBottomSheet when pressed', async () => {
        // Reset all mocks before the test
        jest.clearAllMocks();

        // Mock the functions directly
        jest.mocked(dismissBottomSheet).mockImplementation(() => Promise.resolve());

        const {getByTestId} = renderWithIntlAndTheme(
            <RescheduledDraft {...baseProps}/>,
        );

        // Trigger the button press
        fireEvent.press(getByTestId('rescheduled_draft'));

        await TestHelper.wait(0);

        // Wait for dismissBottomSheet to be called
        await waitFor(() => {
            expect(dismissBottomSheet).toHaveBeenCalledWith(baseProps.bottomSheetId);
        });
    });

    it('calls showModal when pressed', async () => {
        // Reset all mocks before the test
        jest.clearAllMocks();

        const {getByTestId} = renderWithIntlAndTheme(
            <RescheduledDraft {...baseProps}/>,
        );

        // Trigger the button press
        fireEvent.press(getByTestId('rescheduled_draft'));

        await TestHelper.wait(0);

        // Wait for showModal to be called
        await waitFor(() => {
            expect(showModal).toHaveBeenCalledWith(
                'RescheduleDraft',
                'Change Schedule',
                {
                    closeButtonId: 'close-rescheduled-draft',
                    draft: baseProps.draft,
                },
                {
                    topBar: {
                        leftButtons: [{
                            id: 'close-rescheduled-draft',
                            testID: 'close.reschedule_draft.button',
                            icon: 'mockedImageSource',
                        }],
                    },
                },
            );
        });
    });
});
