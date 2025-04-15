// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {BackHandler} from 'react-native';

import NavigationStore from '@store/navigation_store';

import useAndroidHardwareBackHandler from './android_back_handler';

jest.mock('react-native', () => ({
    BackHandler: {
        addEventListener: jest.fn(),
    },
}));

jest.mock('@store/navigation_store', () => ({
    getVisibleScreen: jest.fn(),
}));

test('useAndroidHardwareBackHandler - calls callback when visible screen matches componentId', () => {
    const componentId = 'About';
    const callback = jest.fn();

    (NavigationStore.getVisibleScreen as jest.Mock).mockReturnValue(componentId);

    renderHook(() => useAndroidHardwareBackHandler(componentId, callback));

    const hardwareBackPressHandler = (BackHandler.addEventListener as jest.Mock).mock.calls[0][1];
    hardwareBackPressHandler();

    expect(callback).toHaveBeenCalled();
});

test('useAndroidHardwareBackHandler - does not call callback when visible screen does not match componentId', () => {
    const componentId = 'About';
    const callback = jest.fn();

    (NavigationStore.getVisibleScreen as jest.Mock).mockReturnValue('otherScreen');

    renderHook(() => useAndroidHardwareBackHandler(componentId, callback));

    const hardwareBackPressHandler = (BackHandler.addEventListener as jest.Mock).mock.calls[0][1];
    hardwareBackPressHandler();

    expect(callback).not.toHaveBeenCalled();
});

test('useAndroidHardwareBackHandler - removes event listener on unmount', () => {
    const componentId = 'About';
    const callback = jest.fn();
    const remove = jest.fn();
    (BackHandler.addEventListener as jest.Mock).mockReturnValue({remove});

    const {unmount} = renderHook(() => useAndroidHardwareBackHandler(componentId, callback));

    unmount();

    expect(remove).toHaveBeenCalled();
});
