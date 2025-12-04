// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-hooks';
import {Platform} from 'react-native';

import {useInputPropagation} from './input';

describe('useInputPropagation', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
        Platform.OS = originalPlatform;
    });

    describe('on Android', () => {
        beforeEach(() => {
            Platform.OS = 'android';
        });

        it('should always process events', () => {
            const {result} = renderHook(() => useInputPropagation());
            const [waitToPropagate, shouldProcessEvent] = result.current;

            act(() => {
                waitToPropagate('test');
            });

            expect(shouldProcessEvent('test')).toBe(true);
            expect(shouldProcessEvent('different')).toBe(true);
        });
    });

    describe('on iOS', () => {
        beforeEach(() => {
            Platform.OS = 'ios';
        });

        it('should process event when no value is waiting', () => {
            const {result} = renderHook(() => useInputPropagation());
            const [, shouldProcessEvent] = result.current;

            expect(shouldProcessEvent('test')).toBe(true);
        });

        it('should not process event when waiting for specific value', () => {
            const {result} = renderHook(() => useInputPropagation());
            const [waitToPropagate, shouldProcessEvent] = result.current;

            act(() => {
                waitToPropagate('expected');
            });

            expect(shouldProcessEvent('different')).toBe(false);
        });

        it('should clear waiting value after matching', () => {
            const {result} = renderHook(() => useInputPropagation());
            const [waitToPropagate, shouldProcessEvent] = result.current;

            act(() => {
                waitToPropagate('test');
            });

            expect(shouldProcessEvent('test')).toBe(false);
            expect(shouldProcessEvent('test')).toBe(true);
        });
    });
});
