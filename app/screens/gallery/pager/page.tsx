// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {type SharedValue, useDerivedValue} from 'react-native-reanimated';

import {typedMemo} from '@utils/gallery';

import Gutter from './gutter';

import type {GalleryPagerItem} from '@typings/screens/gallery';

interface PageProps extends GalleryPagerItem {
    gutterWidth: number;
    length: number;
    renderPage: (props: GalleryPagerItem, index: number) => JSX.Element | null;
    shouldRenderGutter: boolean;
    getPageTranslate: (index: number, width?: number) => number;
    currentIndex: SharedValue<number>;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'absolute',
        top: 0,
        bottom: 0,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const Page = typedMemo(
    ({
        currentIndex, getPageTranslate, gutterWidth, index, isPagerInProgress, item, length,
        onPageStateChange, renderPage, shouldRenderGutter, width, height, pagerPanGesture, pagerTapGesture, lightboxPanGesture,
    }: PageProps) => {
        const isPageActive = useDerivedValue(() => (currentIndex.value === index), []);
        return (
            <View style={[styles.container, {left: -getPageTranslate(index, width)}]}>
                <View style={[styles.center, {width}]}>
                    {renderPage(
                        {
                            index,
                            onPageStateChange,
                            item,
                            width,
                            isPageActive,
                            isPagerInProgress,
                            height,
                            pagerPanGesture,
                            pagerTapGesture,
                            lightboxPanGesture,
                        },
                        index,
                    )}
                </View>

                {index !== length - 1 && shouldRenderGutter && (
                    <Gutter width={gutterWidth}/>
                )}
            </View>
        );
    },
);

export default Page;
