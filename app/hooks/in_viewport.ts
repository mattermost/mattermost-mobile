// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useEffect, useState} from 'react';
import {DeviceEventEmitter} from 'react-native';

import {Events} from '@constants';
import EphemeralStore from '@store/ephemeral_store';

/**
 * ITEM_IN_VIEWPORT is fire-and-forget, so a subtree that mounts after the emit — a late-hydrating
 * permalink preview, a placeholder that appears once its post is verified — would never learn it is
 * visible. Hence the seed from the emitters' cached map rather than false-until-next-scroll.
 *
 * Once true it stays true: callers use it to trigger one-time work, and scrolling away should not
 * undo that.
 */
export const useIsInViewPort = (location: string, postId: string) => {
    const key = `${location}-${postId}`;
    const [inViewPort, setInViewPort] = useState(() => EphemeralStore.isItemInViewPort(key));

    useEffect(() => {
        if (inViewPort) {
            return undefined;
        }

        const subscription = DeviceEventEmitter.addListener(Events.ITEM_IN_VIEWPORT, (viewableItems: Record<string, boolean>) => {
            if (viewableItems[key]) {
                setInViewPort(true);
            }
        });

        return () => subscription.remove();
    }, [key, inViewPort]);

    return inViewPort;
};

/**
 * Drops the list's cached viewable items when it unmounts, so a later mount at the same location
 * doesn't seed visibility from posts that were on screen in a list that no longer exists.
 */
export const useClearViewableItemsOnUnmount = (location: string) => {
    useEffect(() => () => EphemeralStore.removeViewableItems(location), [location]);
};
