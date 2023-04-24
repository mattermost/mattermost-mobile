// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {type SharedValue, useDerivedValue} from 'react-native-reanimated';

import {typedMemo} from '@utils/gallery';

import Gutter from './gutter';

import type {GalleryItemType} from '@typings/screens/gallery';
import type {PanGestureHandler, TapGestureHandler} from 'react-native-gesture-handler';

export type PageRefs = [
    React.Ref<TapGestureHandler>,
    React.Ref<PanGestureHandler>,
];

export interface RenderPageProps {
    index: number;
    pagerRefs: PageRefs;
    onPageStateChange: (value: boolean) => void;
    item: GalleryItemType;
    width: number;
    height: number;
    isPageActive: SharedValue<boolean>;
    isPagerInProgress: SharedValue<boolean>;
}

interface PageProps {
    item: GalleryItemType;
    pagerRefs: PageRefs;
    onPageStateChange: (value: boolean) => void;
    gutterWidth: number;
    index: number;
    length: number;
    renderPage: (props: RenderPageProps, index: number) => JSX.Element | null;
    shouldRenderGutter: boolean;
    getPageTranslate: (index: number, width?: number) => number;
    width: number;
    height: number;
    currentIndex: SharedValue<number>;
    isPagerInProgress: SharedValue<boolean>;
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
        onPageStateChange, pagerRefs, renderPage, shouldRenderGutter, width, height,
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
                            pagerRefs,
                            height,
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
