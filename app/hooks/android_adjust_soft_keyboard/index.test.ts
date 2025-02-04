// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import RNUtils from '@mattermost/rnutils';
import {renderHook} from '@testing-library/react-hooks';
import {Keyboard} from 'react-native';
import {Navigation} from 'react-native-navigation';

import {useAndroidAdjustSoftKeyboard} from '.'; // Update with the correct path

jest.mock('react-native', () => ({
    Keyboard: {
        isVisible: jest.fn(),
        dismiss: jest.fn(),
    },
    Platform: {
        OS: 'android',
        select: jest.fn((options) => options.android ?? options.default),
    },
}));

jest.mock('react-native-navigation', () => {
    const registerComponentListenerMock = jest.fn();
    return {
        Navigation: {
            events: jest.fn(() => ({
                registerComponentListener: registerComponentListenerMock,
            })),
        },
    };
});

jest.mock('@mattermost/rnutils', () => ({
    setSoftKeyboardToAdjustNothing: jest.fn(),
    setSoftKeyboardToAdjustResize: jest.fn(),
}));

describe('useAndroidAdjustSoftKeyboard', () => {
    let registerComponentListenerMock: jest.SpyInstance;
    const unsubscribeMock = {remove: jest.fn()};

    beforeEach(() => {
        jest.useFakeTimers();
        const events = Navigation.events();
        registerComponentListenerMock = jest.spyOn(events, 'registerComponentListener');
        registerComponentListenerMock.mockReturnValue(unsubscribeMock);
    });

    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    it('should register component listener and handle lifecycle events', () => {
        renderHook(() => useAndroidAdjustSoftKeyboard('Channel'));

        expect(registerComponentListenerMock).toHaveBeenCalledWith(
            expect.objectContaining({
                componentDidAppear: expect.any(Function),
                componentDidDisappear: expect.any(Function),
            }),
            'Channel',
        );

        const listener = registerComponentListenerMock.mock.calls[0][0];

        jest.mocked(Keyboard.isVisible).mockReturnValue(true);
        listener.componentDidAppear();

        expect(Keyboard.dismiss).toHaveBeenCalled();

        jest.runAllTimers();
        expect(RNUtils.setSoftKeyboardToAdjustNothing).toHaveBeenCalled();

        listener.componentDidDisappear();
        expect(RNUtils.setSoftKeyboardToAdjustResize).toHaveBeenCalled();
    });

    it('should register component listener and handle lifecycle events when the screen is undefined', () => {
        renderHook(() => useAndroidAdjustSoftKeyboard(undefined));

        expect(registerComponentListenerMock).not.toHaveBeenCalledWith(
            expect.objectContaining({
                componentDidAppear: expect.any(Function),
                componentDidDisappear: expect.any(Function),
            }),
            undefined,
        );
    });

    it('should clean up on unmount', () => {
        const {unmount} = renderHook(() => useAndroidAdjustSoftKeyboard('Channel'));

        unmount();

        expect(unsubscribeMock.remove).toHaveBeenCalled();
    });
});
