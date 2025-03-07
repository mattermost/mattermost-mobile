// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {render} from '@testing-library/react-native';
import React from 'react';
import {ScrollView, View} from 'react-native';

import {useBottomSheetListsFix} from './bottom_sheet_lists_fix';

const TestComponent = () => {
    const {direction, enabled, panResponder} = useBottomSheetListsFix();

    return (
        <ScrollView
            testID='test-view'
            style={{width: 100, height: 100, backgroundColor: 'gray'}}
            {...panResponder.panHandlers}
        >
            <View
                testID='direction'
                style={{width: 100, height: 100}}
            >{direction}</View>
            <View
                testID='enabled'
                style={{width: 100, height: 100}}
            >{enabled ? 'true' : 'false'}</View>
        </ScrollView>
    );
};

describe('useBottomSheetListsFix', () => {
    test('should initialize with correct default values', () => {
        const {result} = renderHook(() => useBottomSheetListsFix());
        expect(result.current.enabled).toBe(false);
        expect(result.current.direction).toBe('down');
    });

    test('should set direction to "up" when gesture moves up', () => {
        const {getByTestId} = render(<TestComponent/>);
        const testView = getByTestId('test-view');
        const panHandlers = testView.props;

        act(() => {
            panHandlers.onMoveShouldSetResponderCapture({
                touchHistory: {
                    indexOfSingleActiveTouch: 1,
                    mostRecentTimeStamp: 411733262.676947,
                    numberActiveTouches: 1,
                    touchBank: [
                        undefined,
                        {
                            currentPageX: 192,
                            currentPageY: 124,
                            currentTimeStamp: 411733262.676947,
                            previousPageX: 192,
                            previousPageY: 324,
                            previousTimeStamp: 411733234.333552,
                            startPageX: 202.666,
                            startPageY: 647.6666564941406,
                            startTimeStamp: 411731079.78750896,
                            touchActive: true,
                        },
                    ],
                },
            });
        });

        expect(getByTestId('direction').props.children).toBe('up');
        expect(getByTestId('enabled').props.children).toBe('true');
    });

    test('should set direction to "down" when gesture moves down', () => {
        const {getByTestId} = render(<TestComponent/>);
        const testView = getByTestId('test-view');
        const panHandlers = testView.props;

        act(() => {
            panHandlers.onMoveShouldSetResponderCapture({
                touchHistory: {
                    indexOfSingleActiveTouch: 1,
                    mostRecentTimeStamp: 411733292.676947,
                    numberActiveTouches: 1,
                    touchBank: [
                        undefined,
                        {
                            currentPageX: 192, // Keeping the X the same
                            currentPageY: 224, // Lower value than previousPageY (downward movement)
                            currentTimeStamp: 411733292.676947,
                            previousPageX: 192,
                            previousPageY: 124, // The previous position (higher than current)
                            previousTimeStamp: 411733262.676947,
                            startPageX: 202.666,
                            startPageY: 547.6666564941406,
                            startTimeStamp: 411731089.78750896,
                            touchActive: true,
                        },
                    ],
                },
            });
        });

        expect(getByTestId('direction').props.children).toBe('down');
        expect(getByTestId('enabled').props.children).toBe('false');
    });
});
