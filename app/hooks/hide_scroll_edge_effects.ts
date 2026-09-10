// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useNavigation} from 'expo-router';
import {useEffect} from 'react';

import {HIDDEN_SCROLL_EDGE_EFFECTS} from '@constants/platform_ui';

/**
 * RNSScreen applies scrollEdgeEffects once (on prop change / VC attach) via a first-child
 * FlatList walk. Channel delays list mount and Thread's stack header can sit first in the
 * tree — so "hidden" often never reaches the real FlatList. Re-apply after content is ready.
 */
export function useEnsureHiddenScrollEdgeEffects(enabled: boolean, ready = true) {
    const navigation = useNavigation();

    useEffect(() => {
        if (!enabled || !ready) {
            return undefined;
        }

        // Change value first so Fabric commits a real prop update on the follow-up.
        // Only the horizontal edges flip — a vertical post list never renders them, so the
        // intermediate frame is invisible. Toggling top/bottom here flashed the list.
        navigation.setOptions({
            scrollEdgeEffects: {
                ...HIDDEN_SCROLL_EDGE_EFFECTS,
                left: 'soft',
                right: 'soft',
            },
        });

        const frame = requestAnimationFrame(() => {
            navigation.setOptions({
                scrollEdgeEffects: HIDDEN_SCROLL_EDGE_EFFECTS,
            });
        });

        return () => cancelAnimationFrame(frame);
    }, [enabled, ready, navigation]);
}
