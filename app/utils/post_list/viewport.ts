// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter, type ViewToken} from 'react-native';

import {Events} from '@constants';
import EphemeralStore from '@store/ephemeral_store';

/**
 * Builds the viewable-items map for a post list, caches it so subtrees that mount after the
 * emit can still tell they are on screen, and notifies the current listeners.
 *
 * @param location the list's location, used to namespace both the item keys and the cache entry
 * @param viewableItems the items reported by the list
 * @returns the emitted map
 */
export function emitPostsInViewport(location: string, viewableItems: ViewToken[]) {
    const viewableItemsMap = viewableItems.reduce((acc: Record<string, boolean>, {item, isViewable}) => {
        if (isViewable && item.type === 'post') {
            acc[`${location}-${item.value.currentPost.id}`] = true;
        }
        return acc;
    }, {});

    EphemeralStore.setViewableItems(location, viewableItemsMap);
    DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, viewableItemsMap);

    return viewableItemsMap;
}

/**
 * Single-post emit, for subtrees whose visibility comes from a parent post — the post embedded in a
 * permalink preview. Caches through EphemeralStore so a component mounting later can still seed.
 */
export function emitPostInViewport(location: string, postId: string) {
    const key = `${location}-${postId}`;
    EphemeralStore.addViewableItem(location, key);
    DeviceEventEmitter.emit(Events.ITEM_IN_VIEWPORT, {[key]: true});
}
