// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Gesture} from 'react-native-gesture-handler';
import {cancelAnimation} from 'react-native-reanimated';

import {usePagerSharedValues} from '../context';

import type {GalleryItemType} from '@typings/screens/gallery';

export default function useTransformerPanGesture(pages: GalleryItemType[], hideHeaderAndFooter: (hidden?: boolean) => void) {
    const {
        activeIndex,
        offsetX,
        toValueAnimation,
        index,
        getPageTranslate,
    } = usePagerSharedValues();

    return Gesture.Tap().
        enabled(pages[activeIndex].type === 'image').
        maxDeltaX(10).
        maxDeltaY(10).
        onStart((evt) => {
            if (evt.numberOfPointers === 1) {
                cancelAnimation(offsetX);
            }
        }).
        onEnd((evt) => {
            if (evt.numberOfPointers === 1) {
                toValueAnimation.value = getPageTranslate(index.value);
                hideHeaderAndFooter();
            }
        });
}
