// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, renderHook} from '@testing-library/react-native';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import EphemeralStore from '@store/ephemeral_store';

import {useIsInViewPort} from './in_viewport';

describe('useIsInViewPort', () => {
    afterEach(() => {
        EphemeralStore.clearViewableItems();
    });

    it('should seed from the cached map when mounting after the emit', () => {
        // ITEM_IN_VIEWPORT is fire-and-forget; a late subtree would otherwise wait for the next scroll.
        EphemeralStore.setViewableItems('Channel', {'Channel-post1': true});

        const {result} = renderHook(() => useIsInViewPort('Channel', 'post1'));

        expect(result.current).toBe(true);
    });

    it('should turn visible on a later emit and stay visible afterwards', () => {
        const {result} = renderHook(() => useIsInViewPort('Channel', 'post1'));
        expect(result.current).toBe(false);

        act(() => {
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, {'Channel-post1': true});
        });
        act(() => {
            DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, {'Channel-other': true});
        });

        expect(result.current).toBe(true);
    });
});
