// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {dismissBottomSheet} from '@screens/navigation';
import {ScheduledPostOptions} from '@screens/scheduled_post_options/scheduled_post_picker';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';
import {showScheduledPostCreationErrorSnackbar} from '@utils/snack_bar';

import type Database from '@nozbe/watermelondb/Database';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showScheduledPostCreationErrorSnackbar: jest.fn(),
}));

describe('ScheduledPostOptions', () => {
    const timezone = {
        automaticTimezone: 'America/New_York',
        manualTimezone: 'America/New_York',
        useAutomaticTimezone: true,
    };

    const baseProps = {
        onSchedule: jest.fn().mockResolvedValue({data: true}),
        currentUserTimezone: timezone,
    };
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('displays correct title and initial state', () => {
        renderWithEverything(<ScheduledPostOptions {...baseProps}/>, {database});

        expect(screen.getByText('Schedule draft')).toBeVisible();
        expect(screen.getByTestId('scheduled_post_options_bottom_sheet.screen')).toBeVisible();
    });

    it('handles timezone correctly', () => {
        jest.spyOn(Date, 'now').mockImplementation(() => 1735693200000); //1st Jan 2025, Wednesday 12:00 AM (New year!!!)

        renderWithEverything(
            <ScheduledPostOptions
                {...baseProps}
                currentUserTimezone={timezone}
            />,
            {database},
        );

        // Verify timezone-specific options are present
        expect(screen.getByText(/Monday at/)).toBeVisible();
        expect(screen.getByText(/Tomorrow at/)).toBeVisible();
    });

    it('prevents scheduling without time selection', () => {
        renderWithEverything(<ScheduledPostOptions {...baseProps}/>, {database});

        const scheduleButton = screen.getByTestId('scheduled_post_create_button');
        fireEvent.press(scheduleButton);

        expect(baseProps.onSchedule).not.toHaveBeenCalled();
        expect(dismissBottomSheet).not.toHaveBeenCalled();
    });

    it('handles successful scheduling flow', () => {
        const onSchedule = jest.fn().mockResolvedValue({data: true});
        jest.spyOn(Date, 'now').mockImplementation(() => 1735693200000); //1st Jan 2025, Wednesday 12:00 AM (New year!!!)

        renderWithEverything(
            <ScheduledPostOptions
                {...baseProps}
                onSchedule={onSchedule}
            />,
            {database},
        );

        // Select a time option and schedule
        const timeOption = screen.getByText(/Monday at/);
        fireEvent.press(timeOption);

        const scheduleButton = screen.getByTestId('scheduled_post_create_button');
        fireEvent.press(scheduleButton);

        act(() => {
            jest.runAllTimers();
        });

        // Verify scheduling flow
        expect(onSchedule).toHaveBeenCalledWith(expect.objectContaining({
            scheduled_at: expect.any(Number),
        }));
        expect(dismissBottomSheet).toHaveBeenCalled();
    });

    it('handles scheduling errors correctly', () => {
        const error = 'Network error';
        const onSchedule = jest.fn().mockResolvedValue({error});
        renderWithEverything(
            <ScheduledPostOptions
                {...baseProps}
                onSchedule={onSchedule}
            />,
            {database},
        );

        // Select time and attempt to schedule
        const timeOption = screen.getByText(/Monday at/);
        fireEvent.press(timeOption);

        const scheduleButton = screen.getByTestId('scheduled_post_create_button');
        fireEvent.press(scheduleButton);

        act(() => {
            jest.runAllTimers();
        });

        // Verify error handling
        expect(onSchedule).toHaveBeenCalled();
        expect(showScheduledPostCreationErrorSnackbar).toHaveBeenCalledWith(error);
        expect(dismissBottomSheet).not.toHaveBeenCalled();
    });

    it('updates UI state during scheduling', () => {
        const slowSchedule = jest.fn().mockImplementation(() => {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve({data: true});
                }, 5000);
            });
        });

        renderWithEverything(
            <ScheduledPostOptions
                {...baseProps}
                onSchedule={slowSchedule}
            />,
            {database},
        );

        // Start scheduling process
        const timeOption = screen.getByText(/Monday at/);
        fireEvent.press(timeOption);

        fireEvent.press(screen.getByTestId('scheduled_post_create_button'));

        // Verify loading state
        expect(screen.getByTestId('scheduled_post_create_button')).toBeDisabled();

        // Fast-forward timers and verify completion
        act(() => {
            jest.runAllTimers();
        });

        expect(dismissBottomSheet).toHaveBeenCalled();
    });
});
