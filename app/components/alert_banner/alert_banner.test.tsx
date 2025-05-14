// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';

// We're mocking useTheme but not using it directly

import AlertBanner from './alert_banner';

jest.mock('@context/theme', () => ({
    useTheme: jest.fn(() => ({
        sidebarTextActiveBorder: '#1C58D9',
        awayIndicator: '#F5AB1E',
        dndIndicator: '#D24B4E',
        centerChannelColor: '#3F4350',
    })),
}));

describe('components/alert_banner', () => {
    const baseProps = {
        type: 'info' as const,
        message: 'Test message',
        testID: 'test-banner',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should render correctly with base props', () => {
        const {getByTestId, getByText} = render(
            <AlertBanner
                {...baseProps}
            />,
        );

        expect(getByTestId('test-banner')).toBeTruthy();
        expect(getByTestId('test-banner-icon')).toBeTruthy();
        expect(getByText('Test message')).toBeTruthy();
    });

    it('should render description when provided', () => {
        const props = {
            ...baseProps,
            description: 'Test description',
        };

        const {getByText} = render(
            <AlertBanner {...props}/>,
        );

        expect(getByText('Test description')).toBeTruthy();
    });

    it('should render tags when provided', () => {
        const props = {
            ...baseProps,
            tags: ['Tag1', 'Tag2'],
        };

        const {getByText} = render(
            <AlertBanner {...props}/>,
        );

        expect(getByText('Tag1')).toBeTruthy();
        expect(getByText('Tag2')).toBeTruthy();
    });

    it('should render dismiss button when isDismissable is true', () => {
        const props = {
            ...baseProps,
            isDismissable: true,
            onDismiss: jest.fn(),
        };

        const {getByTestId} = render(
            <AlertBanner {...props}/>,
        );

        expect(getByTestId('test-banner-dismiss')).toBeTruthy();
    });

    it('should call onDismiss when dismiss button is pressed', () => {
        const onDismiss = jest.fn();
        const props = {
            ...baseProps,
            isDismissable: true,
            onDismiss,
        };

        const {getByTestId} = render(
            <AlertBanner {...props}/>,
        );

        fireEvent.press(getByTestId('test-banner-dismiss'));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should call onPress when banner is pressed', () => {
        const onPress = jest.fn();
        const props = {
            ...baseProps,
            onPress,
        };

        const {getByTestId} = render(
            <AlertBanner {...props}/>,
        );

        fireEvent.press(getByTestId('test-banner').children[0]);
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should render with warning type', () => {
        const props = {
            ...baseProps,
            type: 'warning' as const,
        };

        const {getByTestId} = render(
            <AlertBanner {...props}/>,
        );

        expect(getByTestId('test-banner')).toBeTruthy();
    });

    it('should render with error type', () => {
        const props = {
            ...baseProps,
            type: 'error' as const,
        };

        const {getByTestId} = render(
            <AlertBanner {...props}/>,
        );

        expect(getByTestId('test-banner')).toBeTruthy();
    });
});
