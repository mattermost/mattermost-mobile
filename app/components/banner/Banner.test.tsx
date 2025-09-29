// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import Banner from './Banner';

// Mock the hooks - we test them separately
jest.mock('./hooks/useBannerPosition', () => ({
    useBannerPosition: () => ({positionStyle: {}}),
}));

jest.mock('./hooks/useBannerAnimation', () => ({
    useBannerAnimation: () => ({
        opacity: {value: 1},
        translateX: {value: 0},
        isDismissed: {value: false},
        animatedStyle: {},
    }),
}));

jest.mock('./hooks/useBannerGesture', () => ({
    useBannerGesture: () => ({swipeGesture: {}}),
}));

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
    beforeEach(() => {
        jest.clearAllMocks();
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
});
