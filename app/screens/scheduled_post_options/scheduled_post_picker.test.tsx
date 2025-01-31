// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithEverything} from '@test/intl-test-helper';
import {dismissBottomSheet} from '@screens/navigation';

import {ScheduledPostOptions} from './scheduled_post_picker';

jest.mock('@screens/navigation', () => ({
    dismissBottomSheet: jest.fn(),
}));

describe('components/scheduled_post_picker', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render', () => {
        const onSchedule = jest.fn();
        const wrapper = renderWithEverything(
            <ScheduledPostOptions
                onSchedule={onSchedule}
            />,
        );
        expect(wrapper.toJSON()).toBeTruthy();
    });

    it('should render with timezone', () => {
        const onSchedule = jest.fn();
        const timezone = {
            automaticTimezone: 'America/New_York',
            manualTimezone: 'America/New_York',
            useAutomaticTimezone: true,
        };

        const wrapper = renderWithEverything(
            <ScheduledPostOptions
                currentUserTimezone={timezone}
                onSchedule={onSchedule}
            />,
        );
        expect(wrapper.toJSON()).toBeTruthy();
    });

    it('should not schedule when no time selected', async () => {
        const onSchedule = jest.fn();
        const wrapper = renderWithEverything(
            <ScheduledPostOptions
                onSchedule={onSchedule}
            />,
        );

        const scheduleButton = wrapper.getByText('Schedule');
        await fireEvent.press(scheduleButton);

        expect(onSchedule).not.toHaveBeenCalled();
        expect(dismissBottomSheet).not.toHaveBeenCalled();
    });

    it('should handle successful scheduling', async () => {
        const onSchedule = jest.fn().mockResolvedValue({data: true});
        const wrapper = renderWithEverything(
            <ScheduledPostOptions
                onSchedule={onSchedule}
            />,
        );

        // Simulate time selection (you'll need to adjust this based on your actual UI)
        const timeOption = wrapper.getByText('Today at 12:00 PM');
        await fireEvent.press(timeOption);

        const scheduleButton = wrapper.getByText('Schedule');
        await fireEvent.press(scheduleButton);

        expect(onSchedule).toHaveBeenCalledWith(expect.objectContaining({
            scheduled_at: expect.any(Number),
        }));
        expect(dismissBottomSheet).toHaveBeenCalled();
    });

    it('should handle scheduling error', async () => {
        const error = 'Scheduling failed';
        const onSchedule = jest.fn().mockResolvedValue({error});
        const wrapper = renderWithEverything(
            <ScheduledPostOptions
                onSchedule={onSchedule}
            />,
        );

        // Simulate time selection
        const timeOption = wrapper.getByText('Today at 12:00 PM');
        await fireEvent.press(timeOption);

        const scheduleButton = wrapper.getByText('Schedule');
        await fireEvent.press(scheduleButton);

        expect(onSchedule).toHaveBeenCalled();
        expect(dismissBottomSheet).not.toHaveBeenCalled();
    });
});
