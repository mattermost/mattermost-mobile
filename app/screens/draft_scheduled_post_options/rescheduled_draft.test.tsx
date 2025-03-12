// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {dismissBottomSheet, showModal} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RescheduledDraft from './rescheduled_draft';

import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';
import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
    showModal: jest.fn(),
}));

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

    it('calls dismissBottomSheet and showModal when pressed', async () => {
        jest.mocked(dismissBottomSheet).mockResolvedValue(undefined);

        const {getByTestId} = renderWithIntlAndTheme(
            <RescheduledDraft {...baseProps}/>,
        );

        fireEvent.press(getByTestId('rescheduled_draft'));

        await TestHelper.wait(0);

        expect(dismissBottomSheet).toHaveBeenCalledWith(baseProps.bottomSheetId);
        expect(showModal).toHaveBeenCalledWith(
            Screens.RESCHEDULE_DRAFT,
            'Change Schedule',
            expect.objectContaining({
                closeButtonId: 'close-rescheduled-draft',
                draft: baseProps.draft,
            }),
            expect.objectContaining({
                topBar: expect.objectContaining({
                    leftButtons: expect.arrayContaining([
                        expect.objectContaining({
                            id: 'close-rescheduled-draft',
                        }),
                    ]),
                }),
            }),
        );
    });
});
