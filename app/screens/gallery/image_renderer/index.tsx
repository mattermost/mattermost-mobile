// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';

import ImageTransformer, {type ImageTransformerProps} from './transformer';

import type {PagerProps} from '../pager';
import type {RenderPageProps} from '../pager/page';

export interface Handlers {
    onTap?: ImageTransformerProps['onTap'];
    onDoubleTap?: ImageTransformerProps['onDoubleTap'];
    onInteraction?: ImageTransformerProps['onInteraction'];
    onPagerTranslateChange?: (translateX: number) => void;
    onGesture?: PagerProps['onGesture'];
    onPagerEnabledGesture?: PagerProps['onEnabledGesture'];
    shouldPagerHandleGestureEvent?: PagerProps['shouldHandleGestureEvent'];
    onShouldHideControls?: (shouldHide: boolean) => void;
  }

export type ImageRendererProps = RenderPageProps & Handlers

function ImageRenderer({
    height,
    isPageActive,
    isPagerInProgress,
    item,
    onDoubleTap,
    onInteraction,
    onPageStateChange,
    onTap,
    pagerRefs,
    width,
}: ImageRendererProps) {
    const targetDimensions = useMemo(() => ({height, width}), [height, width]);

    return (
        <ImageTransformer
            outerGestureHandlerActive={isPagerInProgress}
            isActive={isPageActive}
            targetDimensions={targetDimensions}
            height={item.height}
            isSvg={item.extension === 'svg'}
            onStateChange={onPageStateChange}
            outerGestureHandlerRefs={pagerRefs}
            source={item.uri}
            width={item.width}
            onDoubleTap={onDoubleTap}
            onTap={onTap}
            onInteraction={onInteraction}
        />
    );
}

export default ImageRenderer;
