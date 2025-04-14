// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen} from '@testing-library/react-native';
import React from 'react';

import {useIsTablet} from '@hooks/device';
import {renderWithEverything} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ScheduledPostFooter from '.';

import type Database from '@nozbe/watermelondb/Database';

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn().mockReturnValue(false),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
    ...jest.requireActual('@gorhom/bottom-sheet'),
    useBottomSheetInternal: jest.fn().mockReturnValue({
        animatedIndex: {value: 1},
        animatedPosition: {value: 0},
        shouldHandleKeyboardEvents: false,
    }),
    BottomSheetFooter: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('react-native-reanimated', () => ({
    Easing: {
        bezier: jest.fn(),
        out: jest.fn(),
    },
    runOnJS: jest.fn((fn) => fn),
    useAnimatedRef: jest.fn(() => ({})),
    useAnimatedStyle: jest.fn((fn) => fn()),
    useEvent: jest.fn(),
    useSharedValue: jest.fn(),
    withTiming: jest.fn(),
    addWhitelistedUIProps: jest.fn(),
    createAnimatedComponent: jest.fn(),
}));

describe('ScheduledPostFooter', () => {
    const baseProps = {
        onSchedule: jest.fn(),
        isScheduling: false,
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

            // @ts-expect-error: TS2741 - ignoring missing renaaimated props
            <ScheduledPostFooter {...baseProps}/>,
            {database},
        );

        expect(screen.getByText('Schedule Draft')).toBeVisible();
        expect(screen.getByTestId('scheduled_post_create_button')).toBeVisible();
        expect(screen.getByTestId('scheduled_post_create_button')).not.toBeDisabled();
    });

    it('renders correctly in scheduling state', () => {
        renderWithEverything(

            // @ts-expect-error: TS2741 - ignoring missing renaaimated props
            <ScheduledPostFooter
                {...baseProps}
                isScheduling={true}
            />,
            {database},
        );

        expect(screen.getByText('Scheduling')).toBeVisible();
        expect(screen.getByTestId('scheduled_post_create_button')).toBeDisabled();
    });

    it('handles schedule button press', () => {
        const onSchedule = jest.fn();
        renderWithEverything(

            // @ts-expect-error: TS2741 - ignoring missing renaaimated props
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

    it('renders correctly for tablet', () => {
        jest.mocked(useIsTablet).mockReturnValueOnce(true);

        renderWithEverything(

            // @ts-expect-error: TS2741 - ignoring missing renaaimated props
            <ScheduledPostFooter
                {...baseProps}
            />,
            {database},
        );

        expect(screen.getByTestId('scheduled_post_create_button')).toBeVisible();
    });

    it('prevents scheduling when already in progress', () => {
        const onSchedule = jest.fn();
        renderWithEverything(

            // @ts-expect-error: TS2741 - ignoring missing renaaimated props
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
