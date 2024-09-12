// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {runOnJS} from 'react-native-reanimated';

import ImageRenderer, {type Handlers, type ImageRendererProps} from '../image_renderer';
import Pager from '../pager';

import type {InteractionType} from '../image_renderer/transformer';
import type {RenderPageProps} from '../pager/page';
import type {GalleryItemType} from '@typings/screens/gallery';

export interface GalleryViewerProps extends Handlers {
    gutterWidth?: number;
    height: number;
    initialIndex?: number;
    items: GalleryItemType[];
    keyExtractor?: (item: GalleryItemType, index: number) => string;
    numToRender?: number;
    onIndexChange?: (nextIndex: number) => void;
    renderPage?: (props: ImageRendererProps, index: number) => JSX.Element | null;
    width: number;
}

const GalleryViewer = ({
    gutterWidth, height, initialIndex, items, keyExtractor, numToRender,
    onDoubleTap, onGesture, onIndexChange, onInteraction, onPagerEnabledGesture,
    onShouldHideControls, onTap, renderPage, shouldPagerHandleGestureEvent, width,
}: GalleryViewerProps) => {
    const controlsHidden = useRef(false);
    const tempIndex = useRef<number>(initialIndex || 0);

    const setTempIndex = (nextIndex: number) => {
        tempIndex.current = nextIndex;
    };

    const extractKey = useCallback((item: GalleryItemType, index: number) => {
        if (typeof keyExtractor === 'function') {
            return keyExtractor(item, index);
        }

        return item.id;
    }, [items]);

    const onIndexChangeWorklet = useCallback((nextIndex: number) => {
        'worklet';

        runOnJS(setTempIndex)(nextIndex);

        if (onIndexChange) {
            onIndexChange(nextIndex);
        }
    }, []);

    const pageToRender = useCallback((pagerProps: RenderPageProps, index: number) => {
        const shouldHideControls = (isScaled?: boolean | InteractionType) => {
            let shouldHide = true;

            if (typeof isScaled === 'boolean') {
                shouldHide = !isScaled;
            } else if (typeof isScaled === 'string') {
                shouldHide = true;
            } else {
                shouldHide = !controlsHidden.current;
            }

            controlsHidden.current = shouldHide;

            if (onShouldHideControls) {
                onShouldHideControls(shouldHide);
            }
        };

        const doubleTap = (isScaled: boolean) => {
            'worklet';

            if (onDoubleTap) {
                onDoubleTap(isScaled);
            }

            runOnJS(shouldHideControls)(isScaled);
        };

        const tap = (isScaled: boolean) => {
            'worklet';

            if (onTap) {
                onTap(isScaled);
            }

            runOnJS(shouldHideControls)();
        };

        const interaction = (type: InteractionType) => {
            'worklet';

            if (onInteraction) {
                onInteraction(type);
            }

            runOnJS(shouldHideControls)(type);
        };

        const props: ImageRendererProps = {
            ...pagerProps,
            width,
            height,
            onDoubleTap: doubleTap,
            onTap: tap,
            onInteraction: interaction,
        };

        if (
            props.item.type !== 'image' &&
            props.item.type !== 'avatar' &&
            typeof renderPage === 'function'
        ) {
            return renderPage(props, index);
        }

        return (<ImageRenderer {...props}/>);
    }, [items, width, height]);

    return (
        <Pager
            totalCount={items.length}
            keyExtractor={extractKey}
            initialIndex={tempIndex.current}
            pages={items}
            width={width}
            height={height}
            gutterWidth={gutterWidth}
            onIndexChange={onIndexChangeWorklet}
            shouldHandleGestureEvent={shouldPagerHandleGestureEvent}
            onGesture={onGesture}
            onEnabledGesture={onPagerEnabledGesture}
            renderPage={pageToRender}
            numToRender={numToRender}
        />
    );
};

export default GalleryViewer;
