// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Navigation} from 'react-native-navigation';

import {Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {act, renderWithIntl} from '@test/intl-test-helper';

import SnackBar from './index';

import type {AvailableScreens} from '@typings/screens/navigation';

jest.mock('@utils/theme', () => ({
    makeStyleSheetFromTheme: jest.fn().mockReturnValue(() => ({})),
}));

jest.mock('react-native-reanimated', () => {
    const View = require('react-native').View;
    return {
        ...jest.requireActual('react-native-reanimated/mock'),
        View,
        useSharedValue: jest.fn().mockReturnValue(0),
        withTiming: jest.fn(),
        FadeIn: {
            duration: jest.fn().mockReturnValue({}),
        },
    };
});

jest.mock('react-native-navigation', () => ({
    Navigation: {
        events: jest.fn().mockReturnValue({
            registerComponentWillAppearListener: jest.fn(),
            registerComponentDidDisappearListener: jest.fn(),
        }),
        dismissOverlay: jest.fn(),
    },
}));

describe('SnackBar', () => {
    let unsubscribeMock: jest.Mock;

    const baseProps = {
        componentId: 'component-id' as AvailableScreens,
        sourceScreen: Screens.CHANNEL,
        barType: SNACK_BAR_TYPE.CODE_COPIED,
        messageValues: {},
        onAction: jest.fn(),
    };

    beforeEach(() => {
        jest.useFakeTimers();
        unsubscribeMock = jest.fn();

        (Navigation.events().registerComponentWillAppearListener as jest.Mock).mockReturnValue({
            remove: unsubscribeMock,
        });
        (Navigation.events().registerComponentDidDisappearListener as jest.Mock).mockReturnValue({
            remove: unsubscribeMock,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    test('renders correctly with base props', () => {
        const {getByTestId} = renderWithIntl(
            <SnackBar {...baseProps}/>,
        );

        expect(getByTestId('toast.message')).toBeVisible();
    });

    test('does not auto-dismiss when keepOpen is true', () => {
        const dismissOverlay = jest.spyOn(Navigation, 'dismissOverlay');
        renderWithIntl(
            <SnackBar
                {...baseProps}
                keepOpen={true}
            />,
        );

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        expect(dismissOverlay).not.toHaveBeenCalled();
    });

    test('renders custom message when provided', () => {
        const customMessage = 'Custom Test Message';
        const {getByText} = renderWithIntl(
            <SnackBar
                {...baseProps}
                customMessage={customMessage}
            />,
        );

        expect(getByText(customMessage)).toBeVisible();
    });

    test('renders close button when keepOpen is true', () => {
        const {getByTestId} = renderWithIntl(
            <SnackBar
                {...baseProps}
                keepOpen={true}
            />,
        );

        expect(getByTestId('close-button')).toBeVisible();
    });
});
