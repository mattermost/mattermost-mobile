// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {act, fireEvent, renderWithIntl} from '@test/intl-test-helper';
import {DeviceEventEmitter} from 'react-native';

import {Navigation} from 'react-native-navigation';
import {Screens} from '@constants';

import SnackBar from './index';

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

describe('SnackBar', () => {
    const baseProps = {
        componentId: 'component-id',
        sourceScreen: Screens.CHANNEL,
        barType: 'success',
        messageValues: {},
        onAction: jest.fn(),
    };

    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
    });

    test('renders correctly with base props', () => {
        const {getByTestId} = renderWithIntl(
            <SnackBar {...baseProps}/>,
        );

        expect(getByTestId('toast')).toBeTruthy();
    });

    test('auto-dismisses after 3 seconds when keepOpen is false', () => {
        const dismissOverlay = jest.spyOn(Navigation, 'dismissOverlay');
        renderWithIntl(
            <SnackBar {...baseProps}/>,
        );

        act(() => {
            jest.advanceTimersByTime(3000);
        });

        expect(dismissOverlay).toHaveBeenCalledWith('component-id');
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

    test('calls onAction when undo is pressed', () => {
        const {getByText} = renderWithIntl(
            <SnackBar
                {...baseProps}
                barType='delete'
            />,
        );

        const undoButton = getByText('Undo');
        fireEvent.press(undoButton);

        expect(baseProps.onAction).toHaveBeenCalled();
    });

    test('dismisses on navigation events', () => {
        const dismissOverlay = jest.spyOn(Navigation, 'dismissOverlay');
        renderWithIntl(<SnackBar {...baseProps}/>);

        // Simulate navigation event
        act(() => {
            DeviceEventEmitter.emit('tabPress');
        });

        expect(dismissOverlay).toHaveBeenCalledWith('component-id');
    });

    test('renders custom message when provided', () => {
        const customMessage = 'Custom Test Message';
        const {getByText} = renderWithIntl(
            <SnackBar
                {...baseProps}
                customMessage={customMessage}
            />,
        );

        expect(getByText(customMessage)).toBeTruthy();
    });

    test('renders close button when keepOpen is true', () => {
        const {getByTestId} = renderWithIntl(
            <SnackBar
                {...baseProps}
                keepOpen={true}
            />,
        );

        expect(getByTestId('close-button')).toBeTruthy();
    });
});
