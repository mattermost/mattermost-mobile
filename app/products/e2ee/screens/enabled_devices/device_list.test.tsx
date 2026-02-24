// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchRegisteredDevices, revokeRegisteredDevice} from '@e2ee/actions/remote/devices';
import {act} from 'react';
import {StyleSheet} from 'react-native';

import {fireEvent, renderWithIntl, waitFor} from '@test/intl-test-helper';
import {showRevokeDeviceErrorSnackbar} from '@utils/snack_bar';

import {DeviceList} from './device_list';

jest.mock('@context/server', () => ({
    useServerUrl: jest.fn(() => 'server-url'),
}));

jest.mock('@e2ee/actions/remote/devices', () => ({
    fetchRegisteredDevices: jest.fn(),
    revokeRegisteredDevice: jest.fn(),
}));

jest.mock('@utils/snack_bar', () => ({
    showRevokeDeviceErrorSnackbar: jest.fn(),
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

const expandDevice = async (
    getByTestId: ReturnType<typeof renderWithIntl>['getByTestId'],
    getByText: ReturnType<typeof renderWithIntl>['getByText'],
    deviceId: string,
    deviceName: string,
) => {
    await act(async () => {
        fireEvent(
            getByTestId(`enabled_devices.device.expanded.calculator.${deviceId}`),
            'onLayout',
            {nativeEvent: {layout: {x: 0, y: 0, width: 100, height: 100}}},
        );
    });
    await act(async () => {
        fireEvent.press(getByText(deviceName));
    });
};

const openRemoveDialog = async (
    getByTestId: ReturnType<typeof renderWithIntl>['getByTestId'],
    getAllByTestId: ReturnType<typeof renderWithIntl>['getAllByTestId'],
    getByText: ReturnType<typeof renderWithIntl>['getByText'],
    deviceId: string,
    deviceName: string,
) => {
    await expandDevice(getByTestId, getByText, deviceId, deviceName);
    await act(async () => {
        fireEvent.press(getAllByTestId('enabled_devices.device.remove')[0]);
    });
};

describe('DeviceList', () => {
    beforeEach(() => {
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: []});
        jest.mocked(revokeRegisteredDevice).mockResolvedValue({});
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

    it('should show "Revoke and remove device" button and no verify button when device is verified', async () => {
        const apiDevice = mockDevice({verified: true});
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByTestId, getAllByText, getByText, queryAllByTestId} = renderWithIntl(
            <DeviceList/>,
        );

        await waitFor(() => {
            expect(getByTestId('e2ee.device_list.flat_list').props.data).toHaveLength(1);
        });

        await act(async () => {
            fireEvent(
                getByTestId('enabled_devices.device.expanded.calculator.device-1'),
                'onLayout',
                {nativeEvent: {layout: {x: 0, y: 0, width: 100, height: 100}}},
            );
        });

        await act(async () => {
            fireEvent.press(getByText('Device 1'));
        });

        expect(getAllByText('Revoke and remove device').length).toBeGreaterThan(0);
        expect(queryAllByTestId('enabled_devices.device.verify')).toHaveLength(0);
    });

    it('should show "Remove device" button and verify button when device is unverified', async () => {
        const apiDevice = mockDevice({verified: false});
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByTestId, getAllByTestId, getAllByText, getByText} = renderWithIntl(
            <DeviceList/>,
        );

        await waitFor(() => {
            expect(getByTestId('e2ee.device_list.flat_list').props.data).toHaveLength(1);
        });

        await act(async () => {
            fireEvent(
                getByTestId('enabled_devices.device.expanded.calculator.device-1'),
                'onLayout',
                {nativeEvent: {layout: {x: 0, y: 0, width: 100, height: 100}}},
            );
        });

        await act(async () => {
            fireEvent.press(getByText('Device 1'));
        });

        expect(getAllByText('Remove device').length).toBeGreaterThan(0);
        expect(getAllByTestId('enabled_devices.device.verify').length).toBeGreaterThan(0);
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

    it('should show confirmation dialog when pressing remove button', async () => {
        const apiDevice = mockDevice();
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByTestId, getAllByTestId, getByText} = renderWithIntl(<DeviceList/>);

        await waitFor(() => {
            expect(getByTestId('e2ee.device_list.flat_list').props.data).toHaveLength(1);
        });

        await openRemoveDialog(getByTestId, getAllByTestId, getByText, 'device-1', 'Device 1');

        expect(getByTestId('e2ee.remove_device_confirmation.card')).toBeTruthy();
    });

    it('should dismiss confirmation dialog when cancel is pressed without calling revoke', async () => {
        const apiDevice = mockDevice();
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByTestId, getAllByTestId, getByText, queryByTestId} = renderWithIntl(<DeviceList/>);

        await waitFor(() => {
            expect(getByTestId('e2ee.device_list.flat_list').props.data).toHaveLength(1);
        });

        await openRemoveDialog(getByTestId, getAllByTestId, getByText, 'device-1', 'Device 1');

        await act(async () => {
            fireEvent.press(getByTestId('e2ee.remove_device_confirmation.cancel'));
        });

        expect(queryByTestId('e2ee.remove_device_confirmation.card')).toBeNull();
        expect(revokeRegisteredDevice).not.toHaveBeenCalled();
        expect(getByText('Device 1')).toBeTruthy();
    });

    it('should have remove button disabled when confirmation input is empty or contains wrong word', async () => {
        const apiDevice = mockDevice();
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByTestId, getAllByTestId, getByText} = renderWithIntl(<DeviceList/>);

        await waitFor(() => {
            expect(getByTestId('e2ee.device_list.flat_list').props.data).toHaveLength(1);
        });

        await openRemoveDialog(getByTestId, getAllByTestId, getByText, 'device-1', 'Device 1');

        expect(getByTestId('e2ee.remove_device_confirmation.remove').props.accessibilityState.disabled).toBe(true);

        await act(async () => {
            fireEvent.changeText(getByTestId('e2ee.remove_device_confirmation.input'), 'wrong');
        });

        expect(getByTestId('e2ee.remove_device_confirmation.remove').props.accessibilityState.disabled).toBe(true);
    });

    it('should enable remove button when "remove" is typed and disable it again when input changes', async () => {
        const apiDevice = mockDevice();
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        const {getByTestId, getAllByTestId, getByText} = renderWithIntl(<DeviceList/>);

        await waitFor(() => {
            expect(getByTestId('e2ee.device_list.flat_list').props.data).toHaveLength(1);
        });

        await openRemoveDialog(getByTestId, getAllByTestId, getByText, 'device-1', 'Device 1');

        await act(async () => {
            fireEvent.changeText(getByTestId('e2ee.remove_device_confirmation.input'), 'remove');
        });

        expect(getByTestId('e2ee.remove_device_confirmation.remove').props.accessibilityState.disabled).toBe(false);

        await act(async () => {
            fireEvent.changeText(getByTestId('e2ee.remove_device_confirmation.input'), 'remove1');
        });

        expect(getByTestId('e2ee.remove_device_confirmation.remove').props.accessibilityState.disabled).toBe(true);
    });

    it('should disable remove button while revoking and dismiss dialog on success', async () => {
        const apiDevice = mockDevice();
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});

        let resolveRevoke!: (value: Awaited<ReturnType<typeof revokeRegisteredDevice>>) => void;
        jest.mocked(revokeRegisteredDevice).mockReturnValueOnce(
            new Promise((resolve) => {
                resolveRevoke = resolve;
            }),
        );

        const {getByTestId, getAllByTestId, getByText, queryByTestId} = renderWithIntl(<DeviceList/>);

        await waitFor(() => {
            expect(getByTestId('e2ee.device_list.flat_list').props.data).toHaveLength(1);
        });

        await openRemoveDialog(getByTestId, getAllByTestId, getByText, 'device-1', 'Device 1');

        await act(async () => {
            fireEvent.changeText(getByTestId('e2ee.remove_device_confirmation.input'), 'remove');
        });

        await act(async () => {
            fireEvent.press(getByTestId('e2ee.remove_device_confirmation.remove'));
        });

        expect(getByTestId('e2ee.remove_device_confirmation.remove').props.accessibilityState.disabled).toBe(true);

        await act(async () => {
            resolveRevoke({});
        });

        expect(queryByTestId('e2ee.remove_device_confirmation.card')).toBeNull();
    });

    it('should show error snackbar and dismiss dialog on failed revoke', async () => {
        const apiDevice = mockDevice();
        jest.mocked(fetchRegisteredDevices).mockResolvedValue({devices: [apiDevice]});
        jest.mocked(revokeRegisteredDevice).mockResolvedValueOnce({error: new Error('failed')});

        const {getByTestId, getAllByTestId, getByText, queryByTestId} = renderWithIntl(<DeviceList/>);

        await waitFor(() => {
            expect(getByTestId('e2ee.device_list.flat_list').props.data).toHaveLength(1);
        });

        await openRemoveDialog(getByTestId, getAllByTestId, getByText, 'device-1', 'Device 1');

        await act(async () => {
            fireEvent.changeText(getByTestId('e2ee.remove_device_confirmation.input'), 'remove');
        });

        await act(async () => {
            fireEvent.press(getByTestId('e2ee.remove_device_confirmation.remove'));
        });

        expect(showRevokeDeviceErrorSnackbar).toHaveBeenCalled();
        expect(queryByTestId('e2ee.remove_device_confirmation.card')).toBeNull();
        expect(getByText('Device 1')).toBeTruthy();
    });
});
