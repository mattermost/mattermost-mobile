// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchEnabledDevices} from '@e2ee/actions/remote/devices';
import {act, type ComponentProps} from 'react';
import {StyleSheet} from 'react-native';

import {fireEvent, renderWithIntl, waitFor} from '@test/intl-test-helper';

import {DeviceList} from './device_list';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'server-url'),
}));

jest.mock('@queries/app/global', () => ({
    getDeviceToken: jest.fn().mockResolvedValue('current-device-id'),
}));

jest.mock('@e2ee/actions/remote/devices', () => ({
    fetchEnabledDevices: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
    const Reanimated = require('react-native-reanimated/mock');
    const sharedValues: Record<number, { value: number }> = {};
    return {
        ...Reanimated,
        useSharedValue: jest.fn((initial: number) => {
            if (!(initial in sharedValues)) {
                sharedValues[initial] = {value: initial};
            }
            return sharedValues[initial];
        }),
        useAnimatedStyle: jest.fn((fn: () => object) => fn()),
        withTiming: jest.fn((v: number) => v),
    };
});

describe('DeviceList', () => {
    it('provides empty list when no devices registered for e2ee', () => {
        const {getByTestId} = renderWithIntl(
            <DeviceList
                currentUser={null}
                devices={[]}
            />,
        );

        const deviceList = getByTestId('e2ee.device_list.flat_list');
        expect(deviceList).toBeTruthy();

        expect(getByTestId('e2ee.device_list.empty.title')).toBeTruthy();
        expect(getByTestId('e2ee.device_list.empty.paragraph')).toBeTruthy();
    });

    it('calls fetchEnabledDevices when serverUrl is available', async () => {
        jest.mocked(fetchEnabledDevices).mockResolvedValue({devices: []});

        const {getByTestId} = renderWithIntl(
            <DeviceList
                currentUser={null}
                devices={[]}
            />,
        );

        const deviceList = getByTestId('e2ee.device_list.flat_list');
        expect(deviceList).toBeTruthy();

        await waitFor(() => {
            expect(fetchEnabledDevices).toHaveBeenCalledWith('server-url', 'current-device-id');
        });
    });

    it('displays devices in the list', async () => {
        const props = {
            currentUser: null,
            devices: [
                {
                    deviceId: 'device-1',
                    deviceName: 'Device 1',
                    isCurrentDevice: false,
                },
            ],
        } as ComponentProps<typeof DeviceList>;

        const {getByTestId, queryByText} = renderWithIntl(<DeviceList {...props}/>);

        const deviceList = getByTestId('e2ee.device_list.flat_list');
        expect(deviceList).toBeTruthy();

        expect(deviceList.props.data).toHaveLength(1);
        expect(deviceList.props.data[0]).toBe(props.devices[0]);
        expect(queryByText('(this device)')).toBeNull();
    });

    it('shows expanded device information when device is clicked', async () => {
        const props = {
            currentUser: null,
            devices: [
                {
                    deviceId: 'device-1',
                    deviceName: 'Device 1',
                    isCurrentDevice: false,
                    osVersion: '1.0.0',
                    appVersion: '1.0.0',
                    lastActiveAt: new Date('2021-01-01').getTime(),
                    createdAt: new Date('2021-01-01').getTime(),
                    verified: true,
                },
            ],
        } as ComponentProps<typeof DeviceList>;

        const {getByTestId, getByText} = renderWithIntl(<DeviceList {...props}/>);

        const deviceList = getByTestId('e2ee.device_list.flat_list');
        expect(deviceList).toBeTruthy();
        expect(deviceList.props.data).toHaveLength(1);

        // Set height.value via calculator onLayout so expanded state can show height > 0
        await act(async () => {
            fireEvent(
                getByTestId('enabled_devices.device.expanded.calculator.device-1'),
                'onLayout',
                {nativeEvent: {layout: {x: 0, y: 0, width: 100, height: 100}}},
            );
        });

        let expandedWrapper = getByTestId('enabled_devices.device.expanded.device-1');
        expect(StyleSheet.flatten(expandedWrapper.props.style ?? {}).height).toBe(0);

        await act(async () => {
            fireEvent.press(getByText('Device 1'));
        });

        expandedWrapper = getByTestId('enabled_devices.device.expanded.device-1');
        expect(StyleSheet.flatten(expandedWrapper.props.style ?? {}).height).toBeGreaterThan(0);
    });

    it('shows this device text for current device', async () => {
        const props = {
            currentUser: null,
            devices: [
                {
                    deviceId: 'device-1',
                    deviceName: 'Device 1',
                    isCurrentDevice: true,
                },
            ],
        } as ComponentProps<typeof DeviceList>;

        const {getByTestId, getByText} = renderWithIntl(<DeviceList {...props}/>);

        const deviceList = getByTestId('e2ee.device_list.flat_list');
        expect(deviceList).toBeTruthy();
        expect(deviceList.props.data).toHaveLength(1);

        expect(getByText('(this device)')).toBeTruthy();
    });
});
