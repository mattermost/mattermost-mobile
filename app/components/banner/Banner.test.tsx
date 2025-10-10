// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import Banner from './Banner';
import {useBanner} from './hooks/useBanner';

jest.mock('./hooks/useBanner');

jest.mock('react-native-reanimated', () => {
    const {View} = require('react-native');
    return {
        __esModule: true,
        default: {View},
    };
});

jest.mock('react-native-gesture-handler', () => {
    const ReactLib = require('react');
    return {
        GestureDetector: ({children}: {children: React.ReactNode}) => {
            return ReactLib.createElement('View', {testID: 'gesture-detector'}, children);
        },
    };
});

describe('Banner', () => {
    const mockUseBanner = jest.mocked(useBanner);

    beforeEach(() => {
        jest.clearAllMocks();
        mockUseBanner.mockReturnValue({
            animatedStyle: {
                opacity: 1,
                transform: [{translateY: 0}, {translateX: 0}],
            },
            swipeGesture: {} as unknown as ReturnType<typeof useBanner>['swipeGesture'],
        });
    });

    it('renders children and animated view', () => {
        render(
            <Banner>
                <Text testID='banner-content'>{'Test Content'}</Text>
            </Banner>,
        );

        expect(screen.getByTestId('banner-content')).toBeTruthy();
        expect(screen.getByTestId('banner-animated-view')).toBeTruthy();
    });

    it('does not use GestureDetector when not dismissible', () => {
        render(
            <Banner dismissible={false}>
                <Text testID='banner-content'>{'Test Content'}</Text>
            </Banner>,
        );

        expect(screen.queryByTestId('gesture-detector')).toBeNull();
        expect(screen.getByTestId('banner-content')).toBeTruthy();
    });

    it('uses GestureDetector when dismissible', () => {
        render(
            <Banner dismissible={true}>
                <Text testID='banner-content'>{'Test Content'}</Text>
            </Banner>,
        );

        expect(screen.getByTestId('gesture-detector')).toBeTruthy();
        expect(screen.getByTestId('banner-content')).toBeTruthy();
    });

    it('passes correct props to useBanner hook', () => {
        const onDismiss = jest.fn();

        render(
            <Banner
                animationDuration={300}
                dismissible={true}
                onDismiss={onDismiss}
                swipeThreshold={150}
            >
                <Text testID='banner-content'>{'Test Content'}</Text>
            </Banner>,
        );

        expect(mockUseBanner).toHaveBeenCalledWith({
            animationDuration: 300,
            dismissible: true,
            swipeThreshold: 150,
            onDismiss,
        });
    });

    it('uses default prop values when not provided', () => {
        render(
            <Banner>
                <Text testID='banner-content'>{'Test Content'}</Text>
            </Banner>,
        );

        expect(mockUseBanner).toHaveBeenCalledWith({
            animationDuration: 250,
            dismissible: false,
            swipeThreshold: 100,
            onDismiss: undefined,
        });
    });
});
