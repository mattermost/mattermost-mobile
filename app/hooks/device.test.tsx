// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import React from 'react';
import {AppState, Keyboard} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import {DeviceContext} from '@context/device';

import {
    useAppState,
    useWindowDimensions,
    useIsTablet,
    useKeyboardHeightWithDuration,
    useKeyboardHeight,
    useSplitView,
    useViewPosition,
    useKeyboardOverlap,
    useAvoidKeyboard,
    testSetUtilsEmitter,
} from './device';

jest.mock('react-native/Libraries/Utilities/Platform', () => ({
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
}));

const mockEmitter = {
    addListener: jest.fn((eventType, callback) => {
        if (eventType === 'DimensionsChanged') {
            callback({height: 800, width: 600});
        }
        return {remove: jest.fn()};
    }),
} as any;

jest.mock('@mattermost/rnutils', () => ({
    getWindowDimensions: jest.fn(() => ({height: 800, width: 600})),
    isRunningInSplitView: jest.fn(() => false),
    default: {
        getWindowDimensions: jest.fn(() => ({height: 800, width: 600})),
        isRunningInSplitView: jest.fn(() => false),
    },
}));

describe('device hooks', () => {
    describe('useAppState', () => {
        it('should return current app state', () => {
            const {result} = renderHook(() => useAppState());
            expect(result.current).toBe(AppState.currentState);
        });

        it('should update when app state changes', () => {
            const {result} = renderHook(() => useAppState());

            act(() => {
                const listener = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
                listener('background');
            });

            expect(result.current).toBe('background');
        });
    });

    describe('useWindowDimensions', () => {
        testSetUtilsEmitter(mockEmitter);

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should return initial dimensions', () => {
            const {result} = renderHook(() => useWindowDimensions());
            expect(result.current).toEqual({height: 800, width: 600});
        });

        it('should update dimensions on change', () => {
            const {result} = renderHook(() => useWindowDimensions());

            act(() => {
                mockEmitter.addListener.mock.calls[0][1]({height: 1000, width: 800});
            });

            expect(result.current).toEqual({height: 1000, width: 800});
        });
    });

    describe('useSplitView', () => {
        const wrapper: React.FC<{children: React.ReactNode; isSplit?: boolean}> = ({children, isSplit = false}) => (
            <DeviceContext.Provider value={{isTablet: false, isSplit}}>
                {children}
            </DeviceContext.Provider>
        );

        it('should return split view state', () => {
            const {result} = renderHook(() => useSplitView(), {
                wrapper: ({children}) => wrapper({children, isSplit: true}),
            });
            expect(result.current).toBe(true);
        });
    });

    describe('useIsTablet', () => {
        const wrapper: React.FC<{children: React.ReactNode; isTablet?: boolean; isSplit?: boolean}> = ({children, isTablet = false, isSplit = false}) => (
            <DeviceContext.Provider value={{isTablet, isSplit}}>
                {children}
            </DeviceContext.Provider>
        );

        it('should return true for tablet when not split', () => {
            const {result} = renderHook(() => useIsTablet(), {
                wrapper: ({children}) => wrapper({children, isTablet: true, isSplit: false}),
            });
            expect(result.current).toBe(true);
        });

        it('should return false for tablet when split', () => {
            const {result} = renderHook(() => useIsTablet(), {
                wrapper: ({children}) => wrapper({children, isTablet: true, isSplit: true}),
            });
            expect(result.current).toBe(false);
        });
    });

    describe('useKeyboardHeightWithDuration', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        const wrapper = ({children}: any) => (
            <SafeAreaProvider>
                {children}
            </SafeAreaProvider>
        );

        it('should handle keyboard show event', () => {
            const {result} = renderHook(() => useKeyboardHeightWithDuration(), {wrapper});

            act(() => {
                const showCallback = (Keyboard.addListener as jest.Mock).mock.calls[0][1];
                showCallback({endCoordinates: {height: 300}, duration: 250});
            });

            expect(result.current).toEqual({height: 300, duration: 250});
        });

        it('should handle keyboard hide event', () => {
            const {result} = renderHook(() => useKeyboardHeightWithDuration(), {wrapper});

            act(() => {
                const hideCallback = (Keyboard.addListener as jest.Mock).mock.calls[1][1];
                hideCallback({duration: 200});
            });

            expect(result.current).toEqual({height: 0, duration: 200});
        });
    });

    describe('useKeyboardHeight', () => {
        it('should return only height from useKeyboardHeightWithDuration', () => {
            const {result} = renderHook(() => useKeyboardHeight());

            act(() => {
                const showCallback = (Keyboard.addListener as jest.Mock).mock.calls[0][1];
                showCallback({endCoordinates: {height: 300}, duration: 250});
            });

            act(() => {
                const showCallback = (Keyboard.addListener as jest.Mock).mock.calls[0][1];
                showCallback({endCoordinates: {height: 300}, duration: 250});
            });

            expect(result.current).toBe(300);
        });
    });

    describe('useViewPosition', () => {
        const mockRef = {
            current: {
                measureInWindow: jest.fn((callback) => {
                    callback(0, 100, 0, 0);
                }),
            },
        } as any;

        const wrapper = ({children, isTablet = false}: any) => (
            <DeviceContext.Provider value={{isTablet, isSplit: false}}>
                {children}
            </DeviceContext.Provider>
        );

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should measure position for tablet', () => {
            const {result} = renderHook(() => useViewPosition(mockRef), {
                wrapper: ({children}) => wrapper({children, isTablet: true}),
            });

            expect(result.current).toBe(100);
            expect(mockRef.current.measureInWindow).toHaveBeenCalled();
        });

        it('should not measure position for non-tablet', () => {
            const {result} = renderHook(() => useViewPosition(mockRef), {
                wrapper: ({children}) => wrapper({children, isTablet: false}),
            });

            expect(result.current).toBe(0);
            expect(mockRef.current.measureInWindow).not.toHaveBeenCalled();
        });
    });

    describe('useKeyboardOverlap', () => {
        const mockRef = {
            current: {
                measureInWindow: jest.fn((callback) => callback(0, 100)),
            },
        } as any;

        const wrapper = ({children, isTablet = false}: any) => (
            <SafeAreaProvider
                initialMetrics={{
                    frame: {x: 0, y: 0, width: 0, height: 0},
                    insets: {top: 0, left: 0, right: 0, bottom: 20},
                }}
            >
                <DeviceContext.Provider value={{isTablet, isSplit: false}}>
                    {children}
                </DeviceContext.Provider>
            </SafeAreaProvider>
        );

        it('should calculate overlap for tablet', () => {
            const {result} = renderHook(() => useKeyboardOverlap(mockRef, 400), {
                wrapper: ({children}) => wrapper({children, isTablet: true}),
            });

            expect(result.current).toBe(0);
        });

        it('should use inset bottom for phone', () => {
            const {result} = renderHook(() => useKeyboardOverlap(mockRef, 400), {
                wrapper: ({children}) => wrapper({children, isTablet: false}),
            });

            act(() => {
                const showCallback = (Keyboard.addListener as jest.Mock).mock.calls[0][1];
                showCallback({endCoordinates: {height: 300}, duration: 250});
            });

            expect(result.current).toBe(300);
        });
    });

    describe('useAvoidKeyboard', () => {
        const mockScrollToPosition = jest.fn();
        const mockRef = {
            current: {
                scrollToPosition: mockScrollToPosition,
            },
        } as any;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it('should scroll when keyboard height changes', () => {
            renderHook(() => useAvoidKeyboard(mockRef));

            act(() => {
                const showCallback = (Keyboard.addListener as jest.Mock).mock.calls[0][1];
                showCallback({endCoordinates: {height: 300}, duration: 250});
            });

            expect(mockScrollToPosition).toHaveBeenCalledWith(0, 100);
        });

        it('should not scroll when calculated offset is less than 80', () => {
            renderHook(() => useAvoidKeyboard(mockRef, 5));

            act(() => {
                const showCallback = (Keyboard.addListener as jest.Mock).mock.calls[0][1];
                showCallback({endCoordinates: {height: 300}, duration: 250});
            });

            expect(mockScrollToPosition).toHaveBeenCalledWith(0, 0);
        });
    });
});
