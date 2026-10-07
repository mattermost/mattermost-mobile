// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, type ViewToken} from 'react-native';

import {Events} from '@constants';
import EphemeralStore from '@store/ephemeral_store';

import {emitPostInViewport, emitPostsInViewport} from './viewport';

const token = (id: string, isViewable = true, type = 'post') => ({item: {type, value: {currentPost: {id}}}, isViewable} as unknown as ViewToken);

describe('viewport emitters', () => {
    afterEach(() => {
        EphemeralStore.clearViewableItems();
    });

    it('should emit and cache only the viewable posts of a list', () => {
        const listener = jest.fn();
        const subscription = DeviceEventEmitter.addListener(Events.ITEM_IN_VIEWPORT, listener);

        emitPostsInViewport('Channel', [token('a'), token('b', false), token('c', true, 'date')]);
        subscription.remove();

        expect(listener).toHaveBeenCalledWith({'Channel-a': true});
        expect(EphemeralStore.isItemInViewPort('Channel-a')).toBe(true);
        expect(EphemeralStore.isItemInViewPort('Channel-b')).toBe(false);
    });

    it('should add a single embedded post without erasing its siblings', () => {
        // Each permalink preview emits for itself; replacing the location's map would hide the others.
        emitPostInViewport('permalink_preview', 'first');
        emitPostInViewport('permalink_preview', 'second');

        expect(EphemeralStore.isItemInViewPort('permalink_preview-first')).toBe(true);
        expect(EphemeralStore.isItemInViewPort('permalink_preview-second')).toBe(true);
    });
});
