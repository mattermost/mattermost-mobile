// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {dismissBottomSheet, navigateToScreen} from '@screens/navigation';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import RescheduledDraft from './rescheduled_draft';

jest.mock('@screens/navigation', () => {
    return {
        dismissBottomSheet: jest.fn(() => Promise.resolve()),
        navigateToScreen: jest.fn(),
    };
});

describe('RescheduledDraft', () => {
    it('renders correctly', () => {
        const {getByTestId, getByText} = renderWithIntlAndTheme(
            <RescheduledDraft draftId='draft1'/>,
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
            <RescheduledDraft draftId='draft1'/>,
        );

        // Trigger the button press
        fireEvent.press(getByTestId('rescheduled_draft'));

        await TestHelper.wait(0);

        // Wait for dismissBottomSheet to be called
        await waitFor(() => {
            expect(dismissBottomSheet).toHaveBeenCalled();
        });
    });

    it('calls showModal when pressed', async () => {
        // Reset all mocks before the test
        jest.clearAllMocks();

        const {getByTestId} = renderWithIntlAndTheme(
            <RescheduledDraft draftId='draft1'/>,
        );

        // Trigger the button press
        fireEvent.press(getByTestId('rescheduled_draft'));

        await TestHelper.wait(0);

        // Wait for showModal to be called
        await waitFor(() => {
            expect(navigateToScreen).toHaveBeenCalledWith(
                Screens.RESCHEDULE_DRAFT,
                {draftId: 'draft1'},
            );
        });
    });
});
