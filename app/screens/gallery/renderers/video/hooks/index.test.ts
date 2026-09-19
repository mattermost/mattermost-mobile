// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook} from '@testing-library/react-native';
import {makeMutable} from 'react-native-reanimated';
import * as Worklets from 'react-native-worklets';

import {useStateFromSharedValue} from './index';

// Patched here rather than in setup.ts: a globally synchronous scheduleOnUI also makes
// withTiming start immediately, which breaks toHaveAnimatedStyle assertions elsewhere.
// The worklets mock otherwise makes scheduleOnUI a no-op, swallowing the mount-time read.
beforeAll(() => {
    jest.spyOn(Worklets, 'scheduleOnUI').mockImplementation((fn: () => void) => fn());
});

// Reanimated's jest mock never invokes useAnimatedReaction, so the reaction path
// (updates after mount) is not observable here — it is covered by the Detox suite.
describe('useStateFromSharedValue', () => {
    it('should return the default value when the shared value is undefined', () => {
        const {result} = renderHook(() => useStateFromSharedValue(undefined, 'fallback'));

        expect(result.current).toBe('fallback');
    });

    it('should sync the initial shared value on mount', () => {
        const {result} = renderHook(() => useStateFromSharedValue(makeMutable(42), 0));

        expect(result.current).toBe(42);
    });

    it('should sync a falsy initial shared value rather than falling back to the default', () => {
        const {result} = renderHook(() => useStateFromSharedValue(makeMutable(false), true));

        expect(result.current).toBe(false);
    });
});
