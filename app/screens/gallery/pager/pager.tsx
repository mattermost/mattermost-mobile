// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo, useState} from 'react';
import {StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {useAnimatedReaction, useAnimatedStyle} from 'react-native-reanimated';

import {getShouldRender} from '@utils/gallery';

import {usePagerSharedValues} from './context';
import useLightboxPanGesture from './gestures/useLightboxPanGesture';
import usePagerPanGesture from './gestures/usePagerPanGesture';
import usePagerTapGesture from './gestures/usePagerTapGesture';
import Page from './page';

import type {GalleryItemType, GalleryPagerItem} from '@typings/screens/gallery';

export type PagerContentProps = {
    totalCount: number;
    pages: GalleryItemType[];
    renderPage: (props: GalleryPagerItem, index: number) => JSX.Element | null;
    shouldRenderGutter: boolean;
    width: number;
    height: number;
    numToRender?: number;
    hideHeaderAndFooter: (hidden?: boolean) => void;
};

const styles = StyleSheet.create({
    pager: {
        flex: 1,
        flexDirection: 'row',
    },
});

export function PagerContent({
    totalCount, pages, renderPage, shouldRenderGutter,
    width, height, numToRender = 2, hideHeaderAndFooter,
}: PagerContentProps) {
    const sharedValues = usePagerSharedValues();
    const [diffValue, setDiffValue] = useState(0);

    const {
        pagerX, offsetX, sharedWidth,
        totalWidth, getPageTranslate, toValueAnimation,
        index, activeIndex, onPageStateChange,
        gutterWidthToUse, isPagerInProgress,
    } = sharedValues;

    const panGesture = usePagerPanGesture();
    const lightboxPanGesture = useLightboxPanGesture();
    const tapGesture = usePagerTapGesture(pages, hideHeaderAndFooter);

    useEffect(() => {
        setDiffValue(numToRender);
    }, [numToRender]);

    useAnimatedReaction(() => sharedWidth.value, (current, previous) => {
        if (current !== previous) {
            toValueAnimation.value = (getPageTranslate(index.value));
        }
    });

    const pagerStyles = useAnimatedStyle(() => {
        const translateX = pagerX.value + offsetX.value;

        return {
            width: totalWidth.value,
            transform: [
                {
                    translateX,
                },
            ],
        };
    });

    const pagesToRender = useMemo(() => {
        const temp = [];

        for (let i = 0; i < totalCount; i += 1) {
            let itemToUse;

            if (Array.isArray(pages)) {
                itemToUse = pages[i];
            } else {
                return null;
            }

            const shouldRender = getShouldRender(i, activeIndex, diffValue);

            if (shouldRender) {
                temp.push(
                    <Page
                        key={itemToUse.id}
                        item={itemToUse}
                        currentIndex={index}
                        onPageStateChange={onPageStateChange}
                        index={i}
                        length={totalCount}
                        gutterWidth={gutterWidthToUse}
                        renderPage={renderPage}
                        getPageTranslate={getPageTranslate}
                        width={width}
                        height={height}
                        isPagerInProgress={isPagerInProgress}
                        shouldRenderGutter={shouldRenderGutter}
                        pagerPanGesture={panGesture}
                        pagerTapGesture={tapGesture}
                        lightboxPanGesture={lightboxPanGesture}
                    />,
                );
            } else {
                temp.push(null);
            }
        }

        return temp;

        // The missing dependencies are intentional as they are SharedValues or DerivedValues
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        totalCount, pages, activeIndex, diffValue, onPageStateChange,
        gutterWidthToUse, renderPage, getPageTranslate,
        width, height, shouldRenderGutter, panGesture, tapGesture, lightboxPanGesture,
    ]);

    return (
        <View style={StyleSheet.absoluteFill}>
            <GestureDetector gesture={Gesture.Simultaneous(panGesture, lightboxPanGesture, tapGesture)}>
                <Animated.View style={[styles.pager, pagerStyles]}>
                    {pagesToRender}
                </Animated.View>
            </GestureDetector>
        </View>
    );
}
