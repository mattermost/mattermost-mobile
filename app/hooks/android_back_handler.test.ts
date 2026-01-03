// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {BackHandler} from 'react-native';

import {Screens} from '@constants';
import {useCurrentScreen} from '@store/navigation_store';

import useAndroidHardwareBackHandler from './android_back_handler';

jest.mock('@store/navigation_store', () => ({
    useCurrentScreen: jest.fn(),
}));

describe('useAndroidHardwareBackHandler', () => {
    afterAll(() => {
        jest.resetAllMocks();
    });

    test('useAndroidHardwareBackHandler - calls callback when visible screen matches componentId', () => {
        const componentId = Screens.ABOUT;
        const callback = jest.fn();
        const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');

        jest.mocked(useCurrentScreen).mockReturnValue(componentId);
        renderHook(() => useAndroidHardwareBackHandler(componentId, callback));

        const hardwareBackPressHandler = addEventListenerSpy.mock.calls[0][1];
        hardwareBackPressHandler();

        expect(callback).toHaveBeenCalled();
    });

    test('useAndroidHardwareBackHandler - does not call callback when visible screen does not match componentId', () => {
        const componentId = Screens.ABOUT;
        const callback = jest.fn();
        const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');
        jest.mocked(useCurrentScreen).mockReturnValue(Screens.CHANNEL);

        renderHook(() => useAndroidHardwareBackHandler(componentId, callback));

        const hardwareBackPressHandler = addEventListenerSpy.mock.calls[0][1];
        hardwareBackPressHandler();

        expect(callback).not.toHaveBeenCalled();
    });

    test('useAndroidHardwareBackHandler - removes event listener on unmount', () => {
        const componentId = Screens.ABOUT;
        const callback = jest.fn();
        const remove = jest.fn();
        const addEventListenerSpy = jest.spyOn(BackHandler, 'addEventListener');
        addEventListenerSpy.mockReturnValue({remove});

        const {unmount} = renderHook(() => useAndroidHardwareBackHandler(componentId, callback));

        unmount();

        expect(remove).toHaveBeenCalled();
    });
});
