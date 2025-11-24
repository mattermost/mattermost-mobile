// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React, {act} from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import ExpiryCountdown from './index';

jest.mock('@utils/theme', () => ({
    changeOpacity: jest.fn().mockReturnValue('rgba(0,0,0,0.5)'),
    makeStyleSheetFromTheme: jest.fn().mockReturnValue(() => ({
        container: {},
        text: {},
    })),
}));

describe('ExpiryCountdown', () => {
    const mockOnExpiry = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test('should render countdown with correct time format', () => {
        const futureTime = Date.now() + 3661000; // 1 hour, 1 minute, 1 second

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={futureTime}
                onExpiry={mockOnExpiry}
            />,
        );

        expect(screen.getByText('1:01:01')).toBeVisible();
    });

    test('should render countdown without hours when less than 1 hour remaining', () => {
        const futureTime = Date.now() + 125000; // 2 minutes, 5 seconds

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={futureTime}
                onExpiry={mockOnExpiry}
            />,
        );

        expect(screen.getByText('02:05')).toBeVisible();
    });

    test('should update countdown every second', async () => {
        const futureTime = Date.now() + 5000; // 5 seconds

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={futureTime}
                onExpiry={mockOnExpiry}
            />,
        );

        expect(screen.getByText('00:05')).toBeVisible();

        // Advance timer by 1 second
        act(async () => {
            jest.advanceTimersByTime(1000);
            await TestHelper.wait(0);
        });

        expect(screen.getByText('00:04')).toBeVisible();
    });

    test('should call onExpiry when countdown reaches zero', async () => {
        const futureTime = Date.now() + 1000; // 1 second

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={futureTime}
                onExpiry={mockOnExpiry}
            />,
        );

        expect(screen.getByText('00:01')).toBeVisible();

        // Advance timer past expiry
        act(() => {
            jest.advanceTimersByTime(3500);
        });

        await TestHelper.wait(0);

        expect(mockOnExpiry).toHaveBeenCalledTimes(1);
        expect(screen.getByText('00:00')).toBeVisible();
    });

    test('should handle already expired time', () => {
        const pastTime = Date.now() - 5000; // 5 seconds ago

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={pastTime}
                onExpiry={mockOnExpiry}
            />,
        );

        expect(screen.getByText('00:00')).toBeVisible();
    });

    test('should work without onExpiry callback', async () => {
        const futureTime = Date.now() + 1000;

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={futureTime}
            />,
        );

        expect(screen.getByText('00:01')).toBeVisible();

        // Should not throw when onExpiry is undefined
        await act(async () => {
            jest.advanceTimersByTime(1500);
            await TestHelper.wait(0);
        });

        expect(screen.getByText('00:00')).toBeVisible();
    });

    test('should format time correctly for various durations', () => {
        // Test different time formats
        const testCases = [
            {duration: 0, expected: '00:00'},
            {duration: 30000, expected: '00:30'}, // 30 seconds
            {duration: 90000, expected: '01:30'}, // 1 minute 30 seconds
            {duration: 3600000, expected: '1:00:00'}, // 1 hour
            {duration: 7265000, expected: '2:01:05'}, // 2 hours 1 minute 5 seconds
        ];

        testCases.forEach(({duration, expected}) => {
            const futureTime = Date.now() + duration;

            const {unmount} = renderWithIntlAndTheme(
                <ExpiryCountdown
                    expiryTime={futureTime}
                    onExpiry={mockOnExpiry}
                />,
            );

            expect(screen.getByText(expected)).toBeVisible();
            unmount();
        });
    });
});

