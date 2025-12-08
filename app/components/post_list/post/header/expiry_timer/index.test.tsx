// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-hooks';
import {screen, userEvent} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {advanceTimers, disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import ExpiryCountdown from './index';

jest.mock('@utils/theme', () => ({
    changeOpacity: jest.fn().mockReturnValue('rgba(0,0,0,0.5)'),
    makeStyleSheetFromTheme: jest.fn().mockReturnValue(() => ({
        container: {},
        text: {},
    })),
}));

describe('ExpiryCountdown', () => {
    beforeEach(() => {
        enableFakeTimers();
        userEvent.setup({advanceTimers: jest.advanceTimersByTime});
    });

    afterEach(() => {
        disableFakeTimers();
    });

    test('should render countdown with correct time format', async () => {
        const futureTime = Date.now() + 3661000; // 1 hour, 1 minute, 1 second
        const mockOnExpiry = jest.fn();

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={futureTime}
                onExpiry={mockOnExpiry}
            />,
        );

        expect(screen.getByText('1:01:01')).toBeVisible();

        act(() => {
            advanceTimers(2000);
        });
        expect(screen.getByText('1:00:59')).toBeVisible();
    });

    test('should render countdown without hours when less than 1 hour remaining', () => {
        const futureTime = Date.now() + 125000; // 2 minutes, 5 seconds
        const mockOnExpiry = jest.fn();

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={futureTime}
                onExpiry={mockOnExpiry}
            />,
        );

        expect(screen.getByText('2:05')).toBeVisible();
    });

    test('should handle already expired time', () => {
        const pastTime = Date.now() - 5000; // 5 seconds ago
        const mockOnExpiry = jest.fn();

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={pastTime}
                onExpiry={mockOnExpiry}
            />,
        );

        expect(screen.getByText('0:00')).toBeVisible();
    });

    test('should call onExpiry callback when countdown reaches zero', async () => {
        const futureTime = Date.now() + 2000; // 2 seconds
        const mockOnExpiry = jest.fn();

        renderWithIntlAndTheme(
            <ExpiryCountdown
                expiryTime={futureTime}
                onExpiry={mockOnExpiry}
            />,
        );

        act(() => {
            advanceTimers(2000);
        });
        expect(screen.getByText('0:00')).toBeVisible();
        expect(mockOnExpiry).toHaveBeenCalled();
    });
});

