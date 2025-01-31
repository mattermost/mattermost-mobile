// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import Animated from 'react-native-reanimated';

import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import {ScheduledPostFooter} from './scheduled_post_footer';

import type Database from '@nozbe/watermelondb/Database';

describe('ScheduledPostFooter', () => {
    const baseProps = {
        onSchedule: jest.fn(),
        isScheduling: false,
        animatedFooterPosition: new Animated.Value(0),
    };
    let database: Database;

    beforeAll(async () => {
        const server = await TestHelper.setupServerDatabase();
        database = server.database;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders correctly in initial state', () => {
        renderWithEverything(
            <ScheduledPostFooter {...baseProps}/>,
            {database},
        );

        expect(screen.getByText('Schedule Draft')).toBeTruthy();
        expect(screen.getByTestId('scheduled_post_create_button')).toBeTruthy();
        expect(screen.getByTestId('scheduled_post_create_button')).not.toBeDisabled();
    });

    it('renders correctly in scheduling state', () => {
        renderWithEverything(
            <ScheduledPostFooter
                {...baseProps}
                isScheduling={true}
            />,
            {database},
        );

        expect(screen.getByText('Scheduling')).toBeTruthy();
        expect(screen.getByTestId('scheduled_post_create_button')).toBeDisabled();
    });

    it('handles schedule button press', () => {
        const onSchedule = jest.fn();
        renderWithEverything(
            <ScheduledPostFooter
                {...baseProps}
                onSchedule={onSchedule}
            />,
            {database},
        );

        const scheduleButton = screen.getByTestId('scheduled_post_create_button');
        fireEvent.press(scheduleButton);

        expect(onSchedule).toHaveBeenCalled();
    });

    it('prevents scheduling when already in progress', () => {
        const onSchedule = jest.fn();
        renderWithEverything(
            <ScheduledPostFooter
                {...baseProps}
                onSchedule={onSchedule}
                isScheduling={true}
            />,
            {database},
        );

        const scheduleButton = screen.getByTestId('scheduled_post_create_button');
        fireEvent.press(scheduleButton);

        expect(onSchedule).not.toHaveBeenCalled();
    });
});
