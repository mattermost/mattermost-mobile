// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {SNACK_BAR_TYPE} from '@constants/snack_bar';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

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
        withTiming: jest.fn(),
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
});
