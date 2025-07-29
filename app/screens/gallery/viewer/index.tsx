// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useRef} from 'react';
import {runOnJS} from 'react-native-reanimated';

import Pager from '../pager';
import ImageRenderer from '../renderers/image';

import type {GalleryItemType, GalleryPagerItem} from '@typings/screens/gallery';

export interface GalleryViewerProps {
    gutterWidth?: number;
    height: number;
    initialIndex?: number;
    items: GalleryItemType[];
    numToRender?: number;
    onIndexChange?: (nextIndex: number) => void;
    renderPage?: (props: GalleryPagerItem, index: number) => JSX.Element | null;
    width: number;
    hideHeaderAndFooter: (hide: boolean) => void;
}

const GalleryViewer = ({
    gutterWidth, height, initialIndex, items, numToRender,
    onIndexChange, renderPage, width, hideHeaderAndFooter,
}: GalleryViewerProps) => {
    const tempIndex = useRef<number>(initialIndex || 0);

    const setTempIndex = (nextIndex: number) => {
        tempIndex.current = nextIndex;
    };

    const onIndexChangeWorklet = useCallback((nextIndex: number) => {
        'worklet';

        runOnJS(setTempIndex)(nextIndex);

        if (onIndexChange) {
            onIndexChange(nextIndex);
        }
    }, [onIndexChange]);

    const pageToRender = useCallback((pagerProps: GalleryPagerItem, index: number) => {
        const props: GalleryPagerItem = {
            ...pagerProps,
            width,
            height,
        };

        if (
            pagerProps.item.type !== 'image' &&
            pagerProps.item.type !== 'avatar' &&
            typeof renderPage === 'function'
        ) {
            return renderPage(props, index);
        }

        return (<ImageRenderer {...props}/>);
    }, [width, height, renderPage]);

    return (
        <Pager
            totalCount={items.length}
            initialIndex={tempIndex.current}
            pages={items}
            width={width}
            height={height}
            gutterWidth={gutterWidth}
            onIndexChange={onIndexChangeWorklet}
            renderPage={pageToRender}
            numToRender={numToRender}
            hideHeaderAndFooter={hideHeaderAndFooter}
            shouldRenderGutter={true}
        />
    );
};

export default GalleryViewer;
