// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, fireEvent} from '@testing-library/react-native';
import React from 'react';

import {Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';
import {disableFakeTimers, enableFakeTimers} from '@test/timer_helpers';

import SnackBar from './snack_bar';

jest.mock('@utils/theme', () => ({
    makeStyleSheetFromTheme: jest.fn().mockReturnValue(() => ({})),
}));

jest.mock('react-native-reanimated', () => {
    const View = require('react-native').View;
    return {
        ...jest.requireActual('react-native-reanimated/mock'),
        View,
        useSharedValue: jest.fn().mockReturnValue(0),
        withTiming: jest.fn((toValue, _config, callback) => {
            callback?.(true);
            return toValue;
        }),
        FadeIn: {
            duration: jest.fn().mockReturnValue({}),
        },
    };
});

describe('SnackBar', () => {
    const baseProps = {
        sourceScreen: Screens.CHANNEL,
        barType: SNACK_BAR_TYPE.CODE_COPIED,
        messageValues: {},
        onAction: jest.fn(),
        onDismiss: jest.fn(),
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('renders correctly with base props', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <SnackBar {...baseProps}/>,
        );

        expect(getByTestId('toast.message')).toBeVisible();
    });

    test('renders custom message when provided', () => {
        const customMessage = 'Custom Test Message';
        const {getByText} = renderWithIntlAndTheme(
            <SnackBar
                {...baseProps}
                customMessage={customMessage}
            />,
        );

        expect(getByText(customMessage)).toBeVisible();
    });

    test('renders the description configured for the bar type', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <SnackBar
                {...baseProps}
                barType={SNACK_BAR_TYPE.EPHEMERAL_MODE_ENABLED}
            />,
        );

        expect(getByTestId('toast.description')).toBeVisible();
    });

    test('renders a custom description over the one configured for the bar type', () => {
        const customDescription = 'Custom Test Description';
        const {getByTestId} = renderWithIntlAndTheme(
            <SnackBar
                {...baseProps}
                barType={SNACK_BAR_TYPE.EPHEMERAL_MODE_ENABLED}
                customDescription={customDescription}
            />,
        );

        expect(getByTestId('toast.description')).toHaveTextContent(customDescription);
    });

    test('does not render a description for a bar type without one', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <SnackBar {...baseProps}/>,
        );

        expect(queryByTestId('toast.description')).toBeNull();
    });

    test('auto-dismisses a non-persistent snack bar after the default duration', async () => {
        enableFakeTimers();

        renderWithIntlAndTheme(
            <SnackBar {...baseProps}/>,
        );

        await act(async () => {
            jest.advanceTimersByTime(3000);
        });

        expect(baseProps.onDismiss).toHaveBeenCalled();

        disableFakeTimers();
    });

    test('does not auto-dismiss a persistent snack bar', async () => {
        enableFakeTimers();

        renderWithIntlAndTheme(
            <SnackBar
                {...baseProps}
                barType={SNACK_BAR_TYPE.EPHEMERAL_MODE_WIPE_WARNING}
                messageValues={{minutes: 1}}
            />,
        );

        await act(async () => {
            jest.advanceTimersByTime(10000);
        });

        expect(baseProps.onDismiss).not.toHaveBeenCalled();

        disableFakeTimers();
    });

    test('shows a close button for a persistent snack bar', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <SnackBar
                {...baseProps}
                barType={SNACK_BAR_TYPE.EPHEMERAL_MODE_WIPE_WARNING}
                messageValues={{minutes: 1}}
            />,
        );

        expect(getByTestId('snack_bar.close_button')).toBeVisible();
    });

    test('does not show a close button for a non-persistent snack bar', () => {
        const {queryByTestId} = renderWithIntlAndTheme(
            <SnackBar {...baseProps}/>,
        );

        expect(queryByTestId('snack_bar.close_button')).toBeNull();
    });

    test('dismisses the snack bar when the close button is pressed', () => {
        const {getByTestId} = renderWithIntlAndTheme(
            <SnackBar
                {...baseProps}
                barType={SNACK_BAR_TYPE.EPHEMERAL_MODE_WIPE_WARNING}
                messageValues={{minutes: 1}}
            />,
        );

        fireEvent.press(getByTestId('snack_bar.close_button'));

        expect(baseProps.onDismiss).toHaveBeenCalled();
    });
});
