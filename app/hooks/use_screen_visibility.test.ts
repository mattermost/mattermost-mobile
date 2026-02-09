// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {BehaviorSubject} from 'rxjs';

import {Screens} from '@constants';
import NavigationStore from '@store/navigation_store';

import {useIsScreenVisible} from './use_screen_visibility';

const mockSubject = new BehaviorSubject<string | undefined>(undefined);

jest.mock('@store/navigation_store', () => ({
    getVisibleScreen: jest.fn(() => mockSubject.value),
    getSubject: jest.fn(() => mockSubject),
}));

describe('useIsScreenVisible', () => {
    const mockNavigationStore = NavigationStore as jest.Mocked<typeof NavigationStore>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockSubject.next(undefined);
    });

    describe('initialization', () => {
        it('should return false when componentId is undefined', () => {
            const {result} = renderHook(() => useIsScreenVisible(undefined));

            expect(result.current).toBe(false);
        });

        it('should return true when componentId matches visible screen on mount', () => {
            mockSubject.next(Screens.CHANNEL);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.CHANNEL);

            const {result} = renderHook(() => useIsScreenVisible(Screens.CHANNEL));

            expect(result.current).toBe(true);
        });

        it('should return false when componentId does not match visible screen on mount', () => {
            mockSubject.next(Screens.CHANNEL);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.CHANNEL);

            const {result} = renderHook(() => useIsScreenVisible(Screens.THREAD));

            expect(result.current).toBe(false);
        });
    });

    describe('subscription updates', () => {
        it('should update when visible screen changes to match componentId', () => {
            mockSubject.next(Screens.CHANNEL);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.CHANNEL);

            const {result} = renderHook(() => useIsScreenVisible(Screens.THREAD));

            expect(result.current).toBe(false);

            act(() => {
                mockSubject.next(Screens.THREAD);
            });

            expect(result.current).toBe(true);
        });

        it('should update when visible screen changes away from componentId', () => {
            mockSubject.next(Screens.THREAD);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.THREAD);

            const {result} = renderHook(() => useIsScreenVisible(Screens.THREAD));

            expect(result.current).toBe(true);

            act(() => {
                mockSubject.next(Screens.CHANNEL);
            });

            expect(result.current).toBe(false);
        });

        it('should handle multiple screen changes', () => {
            mockSubject.next(Screens.CHANNEL);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.CHANNEL);

            const {result} = renderHook(() => useIsScreenVisible(Screens.THREAD));

            act(() => {
                mockSubject.next(Screens.THREAD);
            });
            expect(result.current).toBe(true);

            act(() => {
                mockSubject.next(Screens.CHANNEL);
            });
            expect(result.current).toBe(false);

            act(() => {
                mockSubject.next(Screens.THREAD);
            });
            expect(result.current).toBe(true);
        });

        it('should handle undefined visible screen', () => {
            mockSubject.next(Screens.THREAD);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.THREAD);

            const {result} = renderHook(() => useIsScreenVisible(Screens.THREAD));

            expect(result.current).toBe(true);

            act(() => {
                mockSubject.next(undefined);
            });

            expect(result.current).toBe(false);
        });
    });

    describe('componentId changes', () => {
        it('should update when componentId changes', () => {
            mockSubject.next(Screens.CHANNEL);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.CHANNEL);

            const {result, rerender} = renderHook(
                ({componentId}: {componentId?: typeof Screens.CHANNEL | typeof Screens.THREAD}) => useIsScreenVisible(componentId),
                {initialProps: {componentId: Screens.CHANNEL}},
            );

            expect(result.current).toBe(true);

            rerender({componentId: Screens.THREAD});

            expect(result.current).toBe(false);
        });

        it('should set to false when componentId changes to undefined', () => {
            mockSubject.next(Screens.CHANNEL);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.CHANNEL);

            const {result, rerender} = renderHook(
                ({componentId}: {componentId?: typeof Screens.CHANNEL}) => useIsScreenVisible(componentId),
                {initialProps: {componentId: Screens.CHANNEL}},
            );

            expect(result.current).toBe(true);

            rerender({componentId: undefined});

            expect(result.current).toBe(false);
        });

        it('should subscribe to new componentId when it changes', () => {
            mockSubject.next(Screens.CHANNEL);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.CHANNEL);

            const {result, rerender} = renderHook(
                ({componentId}: {componentId?: typeof Screens.CHANNEL | typeof Screens.THREAD}) => useIsScreenVisible(componentId),
                {initialProps: {componentId: Screens.CHANNEL}},
            );

            rerender({componentId: Screens.THREAD});

            act(() => {
                mockSubject.next(Screens.THREAD);
            });

            expect(result.current).toBe(true);
        });
    });

    describe('cleanup', () => {
        it('should unsubscribe when component unmounts', () => {
            const unsubscribe = jest.fn();
            const subscribeSpy = jest.spyOn(mockSubject, 'subscribe').mockReturnValue({
                unsubscribe,
            } as unknown as ReturnType<typeof mockSubject.subscribe>);

            const {unmount} = renderHook(() => useIsScreenVisible(Screens.CHANNEL));

            unmount();

            expect(unsubscribe).toHaveBeenCalled();

            subscribeSpy.mockRestore();
        });

        it('should unsubscribe when componentId changes', () => {
            const unsubscribe1 = jest.fn();
            const unsubscribe2 = jest.fn();
            let callCount = 0;
            const subscribeSpy = jest.spyOn(mockSubject, 'subscribe').mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    return {unsubscribe: unsubscribe1} as unknown as ReturnType<typeof mockSubject.subscribe>;
                }
                return {unsubscribe: unsubscribe2} as unknown as ReturnType<typeof mockSubject.subscribe>;
            });

            const {rerender} = renderHook(
                ({componentId}: {componentId?: typeof Screens.CHANNEL | typeof Screens.THREAD}) => useIsScreenVisible(componentId),
                {initialProps: {componentId: Screens.CHANNEL}},
            );

            rerender({componentId: Screens.THREAD as typeof Screens.CHANNEL | typeof Screens.THREAD});

            expect(unsubscribe1).toHaveBeenCalled();

            subscribeSpy.mockRestore();
        });
    });

    describe('edge cases', () => {
        it('should handle rapid screen changes', () => {
            mockSubject.next(Screens.CHANNEL);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.CHANNEL);

            const {result} = renderHook(() => useIsScreenVisible(Screens.THREAD));

            act(() => {
                mockSubject.next(Screens.THREAD);
                mockSubject.next(Screens.CHANNEL);
                mockSubject.next(Screens.THREAD);
            });

            expect(result.current).toBe(true);
        });

        it('should handle same screen being set multiple times', () => {
            mockSubject.next(Screens.CHANNEL);
            mockNavigationStore.getVisibleScreen.mockReturnValue(Screens.CHANNEL);

            const {result} = renderHook(() => useIsScreenVisible(Screens.CHANNEL));

            expect(result.current).toBe(true);

            act(() => {
                mockSubject.next(Screens.CHANNEL);
                mockSubject.next(Screens.CHANNEL);
            });

            expect(result.current).toBe(true);
        });
    });
});

