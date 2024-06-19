// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import React, {useContext} from 'react';
import {NativeEventEmitter, Text, View} from 'react-native';

import DeviceInfoProvider, {DeviceContext} from '@context/device';
import {act, render} from '@test/intl-test-helper';

const emitter = new NativeEventEmitter(RNUtils);

const TestComponent = () => {
    const {isSplit, isTablet} = useContext(DeviceContext);

    return (
        <View>
            <Text testID='isSplit'>{isSplit}</Text>
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
        const isSplitView = getByTestId('isSplit');
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
            emitter.emit('SplitViewChanged', {isTablet: true, isSplit: true});
        });

        const isTablet = getByTestId('isTablet');
        const isSplitView = getByTestId('isSplit');
        expect(isTablet.props.children).toBe(true);
        expect(isSplitView.props.children).toBe(true);
    });
});
