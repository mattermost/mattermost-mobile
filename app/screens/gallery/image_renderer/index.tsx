// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {PagerProps} from '../pager';
import {RenderPageProps} from '../pager/page';

import ImageTransformer, {ImageTransformerProps} from './transformer';

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
    return (
        <ImageTransformer
            outerGestureHandlerActive={isPagerInProgress}
            isActive={isPageActive}
            targetDimensions={{width, height}}
            height={item.height}
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
