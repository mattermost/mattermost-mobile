// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {Navigation} from 'react-native-navigation';

import useNavButtonPressed from './navigation_button_pressed';

jest.mock('react-native-navigation', () => ({
    Navigation: {
        events: jest.fn().mockReturnValue({
            registerComponentListener: jest.fn(),
        }),
    },
}));

describe('hooks/useNavButtonPressed', () => {
    const componentId = 'test-component-id';
    const buttonId = 'test-button-id';
    let callback: jest.Mock;
    let unsubscribeMock: jest.Mock;

    beforeEach(() => {
        callback = jest.fn();
        unsubscribeMock = jest.fn();
        (Navigation.events().registerComponentListener as jest.Mock).mockReturnValue({
            remove: unsubscribeMock,
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should register navigation button listener', () => {
        renderHook(() => useNavButtonPressed(buttonId, componentId, callback));

        expect(Navigation.events().registerComponentListener).toHaveBeenCalledWith(
            expect.any(Object),
            componentId,
        );
    });

    it('should call callback when matching button is pressed', () => {
        renderHook(() => useNavButtonPressed(buttonId, componentId, callback));

        const listener = (Navigation.events().registerComponentListener as jest.Mock).mock.calls[0][0];
        listener.navigationButtonPressed({buttonId});

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should not call callback when different button is pressed', () => {
        renderHook(() => useNavButtonPressed(buttonId, componentId, callback));

        const listener = (Navigation.events().registerComponentListener as jest.Mock).mock.calls[0][0];
        listener.navigationButtonPressed({buttonId: 'different-button'});

        expect(callback).not.toHaveBeenCalled();
    });

    it('should unsubscribe listener on unmount', () => {
        const {unmount} = renderHook(() => useNavButtonPressed(buttonId, componentId, callback));

        unmount();

        expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    });

    it('should re-register listener when deps change', () => {
        const {rerender} = renderHook(
            ({dep}) => useNavButtonPressed(buttonId, componentId, callback, [dep]),
            {initialProps: {dep: 1}},
        );

        rerender({dep: 2});

        expect(Navigation.events().registerComponentListener).toHaveBeenCalledTimes(2);
        expect(unsubscribeMock).toHaveBeenCalledTimes(1);
    });
});
