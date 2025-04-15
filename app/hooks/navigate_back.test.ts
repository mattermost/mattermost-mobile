// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-hooks';
import {Navigation} from 'react-native-navigation';

import useBackNavigation from './navigate_back';

jest.mock('react-native-navigation', () => ({
    Navigation: {
        events: jest.fn().mockReturnValue({
            registerNavigationButtonPressedListener: jest.fn(),
        }),
    },
}));

describe('hooks/useBackNavigation', () => {
    let mockRemove: jest.Mock;
    let mockRegisterListener: jest.Mock;

    beforeEach(() => {
        mockRemove = jest.fn();
        mockRegisterListener = jest.fn().mockReturnValue({remove: mockRemove});
        (Navigation.events as jest.Mock)().registerNavigationButtonPressedListener = mockRegisterListener;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should register navigation button listener on mount', () => {
        renderHook(() => useBackNavigation(jest.fn()));
        expect(mockRegisterListener).toHaveBeenCalled();
    });

    it('should remove listener on unmount', () => {
        const {unmount} = renderHook(() => useBackNavigation(jest.fn()));
        unmount();
        expect(mockRemove).toHaveBeenCalled();
    });

    it('should call callback when back button is pressed', () => {
        const callback = jest.fn();
        renderHook(() => useBackNavigation(callback));

        const listener = mockRegisterListener.mock.calls[0][0];
        listener({buttonId: 'RNN.back'});

        expect(callback).toHaveBeenCalled();
    });

    it('should not call callback when different button is pressed', () => {
        const callback = jest.fn();
        renderHook(() => useBackNavigation(callback));

        const listener = mockRegisterListener.mock.calls[0][0];
        listener({buttonId: 'other.button'});

        expect(callback).not.toHaveBeenCalled();
    });

    it('should update listener when callback changes', () => {
        const initialCallback = jest.fn();
        const {rerender} = renderHook(({cb}) => useBackNavigation(cb), {
            initialProps: {cb: initialCallback},
        });

        expect(mockRegisterListener).toHaveBeenCalledTimes(1);

        const newCallback = jest.fn();
        rerender({cb: newCallback});

        expect(mockRemove).toHaveBeenCalled();
        expect(mockRegisterListener).toHaveBeenCalledTimes(2);
    });
});
