// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchRegisteredDevices} from '@e2ee/actions/remote/devices';
import {act} from 'react';
import {StyleSheet} from 'react-native';

import {fireEvent, renderWithIntl, waitFor} from '@test/intl-test-helper';

import {DeviceList} from './device_list';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'server-url'),
}));

jest.mock('@e2ee/actions/remote/devices', () => ({
    fetchRegisteredDevices: jest.fn(),
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

const mockDevice = (overrides: Partial<RegisteredDevice & {is_current_device: boolean; verified: boolean}> = {}) => ({
    device_id: 'device-1',
    device_name: 'Device 1',
    created_at: new Date('2021-01-01').getTime(),
    last_active_at: new Date('2021-01-01').getTime(),
    is_current_device: false,
    verified: false,
    ...overrides,
});

describe('DeviceList', () => {
    beforeEach(() => {
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: []});
    });

    it('should show empty state when no devices are returned from API', async () => {
        const {getByTestId} = renderWithIntl(
            <DeviceList/>,
        );

        await waitFor(() => {
            expect(fetchRegisteredDevices).toHaveBeenCalledWith('server-url');
        });

        expect(getByTestId('e2ee.device_list.empty.title')).toBeTruthy();
        expect(getByTestId('e2ee.device_list.empty.paragraph')).toBeTruthy();
    });

    it('should call fetchRegisteredDevices with serverUrl', async () => {
        renderWithIntl(
            <DeviceList/>,
        );

        await waitFor(() => {
            expect(fetchRegisteredDevices).toHaveBeenCalledWith('server-url');
        });
    });

    it('should display devices returned from API', async () => {
        const apiDevice = mockDevice();
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByTestId} = renderWithIntl(
            <DeviceList/>,
        );

        await waitFor(() => {
            const deviceList = getByTestId('e2ee.device_list.flat_list');
            expect(deviceList.props.data).toHaveLength(1);
        });

        const deviceList = getByTestId('e2ee.device_list.flat_list');
        expect(deviceList.props.data[0]).toBe(apiDevice);
    });

    it('should show expanded device information when device is clicked', async () => {
        const apiDevice = mockDevice({verified: true});
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByTestId, getByText} = renderWithIntl(
            <DeviceList/>,
        );

        await waitFor(() => {
            expect(getByTestId('e2ee.device_list.flat_list').props.data).toHaveLength(1);
        });

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

    it('should show this device text when API returns is_current_device', async () => {
        const apiDevice = mockDevice({is_current_device: true});
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByText} = renderWithIntl(
            <DeviceList/>,
        );

        await waitFor(() => {
            expect(getByText('(this device)')).toBeTruthy();
        });
    });

    it('should show loading indicator while fetch is in progress', async () => {
        let resolveDevices!: (value: Awaited<ReturnType<typeof fetchRegisteredDevices>>) => void;
        jest.mocked(fetchRegisteredDevices).mockReturnValue(
            new Promise((resolve) => {
                resolveDevices = resolve;
            }),
        );

        const {getByTestId, queryByTestId} = renderWithIntl(
            <DeviceList/>,
        );

        expect(getByTestId('e2ee.device_list.loading')).toBeTruthy();

        await act(async () => {
            resolveDevices({devices: []});
        });

        expect(queryByTestId('e2ee.device_list.loading')).toBeNull();
    });

    it('should show verified tag when API returns verified', async () => {
        const apiDevice = mockDevice({verified: true});
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByText} = renderWithIntl(
            <DeviceList/>,
        );

        await waitFor(() => {
            expect(getByText('Verified')).toBeTruthy();
        });
    });
});
