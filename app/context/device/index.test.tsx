// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';
import {NativeEventEmitter, NativeModules, Text, View} from 'react-native';

import DeviceInfoProvider, {DeviceContext} from '@context/device';
import {act, render} from '@test/intl-test-helper';

const {SplitView} = NativeModules;
const emitter = new NativeEventEmitter(SplitView);

const TestComponent = () => {
    const {isSplitView, isTablet} = useContext(DeviceContext);

    return (
        <View>
            <Text testID='isSplitView'>{isSplitView}</Text>
            <Text testID='isTablet'>{isTablet}</Text>
        </View>
    );
};

describe('<DeviceInfoProvider/>', () => {
    it('should match the initial value of the context', () => {
        const {getByTestId} = render(
            <DeviceInfoProvider>
                <TestComponent/>
            </DeviceInfoProvider>,
        );

        const isTablet = getByTestId('isTablet');
        const isSplitView = getByTestId('isSplitView');
        expect(isTablet.props.children).toBe(false);
        expect(isSplitView.props.children).toBe(false);
    });

    it('should match the value emitted of the context', () => {
        const {getByTestId} = render(
            <DeviceInfoProvider>
                <TestComponent/>
            </DeviceInfoProvider>,
        );

        act(() => {
            emitter.emit('SplitViewChanged', {isTablet: true, isSplitView: true});
        });

        const isTablet = getByTestId('isTablet');
        const isSplitView = getByTestId('isSplitView');
        expect(isTablet.props.children).toBe(true);
        expect(isSplitView.props.children).toBe(true);
    });
});
