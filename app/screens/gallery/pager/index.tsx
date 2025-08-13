// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {runOnJS, useDerivedValue, useSharedValue, withSpring} from 'react-native-reanimated';

import {pagerSpringVelocityConfig} from '../animation_config/spring';

import {PagerProvider, type PagerSharedValues} from './context';
import {PagerContent, type PagerContentProps} from './pager';

export interface PagerProps extends PagerContentProps {
    gutterWidth?: number;
    initialIndex: number;
    onIndexChange?: (nextIndex: number) => void;
}

const GUTTER_WIDTH = 10;

const Pager = ({
    gutterWidth = GUTTER_WIDTH, initialIndex,
    numToRender = 2, onIndexChange, pages, renderPage,
    shouldRenderGutter = false, totalCount, width, height, hideHeaderAndFooter,
}: PagerProps) => {
    const gutterWidthToUse = shouldRenderGutter ? gutterWidth : 0;
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const sharedWidth = useSharedValue(width);
    const velocity = useSharedValue(0);
    const isActive = useSharedValue(true);
    const index = useSharedValue(initialIndex);
    const length = useSharedValue(totalCount);
    const pagerX = useSharedValue(0);
    const skipAnimation = useSharedValue(false);

    const getPageTranslate = (i: number, w?: number) => {
        'worklet';

        const t = i * (w || sharedWidth.value);
        const g = gutterWidthToUse * i;
        return -(t + g);
    };

    const toValueAnimation = useSharedValue(getPageTranslate(initialIndex, width));

    const totalWidth = useDerivedValue(() => ((length.value * width) + ((gutterWidthToUse * length.value) - 2)), [width, gutterWidthToUse]);

    const offsetX = useDerivedValue(() => {
        if (skipAnimation.value) {
            return toValueAnimation.value;
        }

        const config = pagerSpringVelocityConfig(velocity.value);
        return withSpring(
            toValueAnimation.value,
            config,
            (isCanceled) => {
                'worklet';

                if (!isCanceled) {
                    velocity.value = 0;
                }
            },
        );
    }, []);

    const isPagerInProgress = useDerivedValue(() => {
        return Math.floor(Math.abs(getPageTranslate(index.value))) !== Math.floor(Math.abs(offsetX.value + pagerX.value));
    }, []);

    const updateIndex = (nextIndex: number) => {
        setActiveIndex(nextIndex);
    };

    const onIndexChangeCb = useCallback((nextIndex: number) => {
        'worklet';

        if (onIndexChange) {
            onIndexChange(nextIndex);
        }

        runOnJS(updateIndex)(nextIndex);
    }, []);

    const sharedValues: PagerSharedValues = useMemo(() => ({
        sharedWidth,
        gutterWidthToUse,
        isActive,
        velocity,
        index,
        length,
        offsetX,
        pagerX,
        toValueAnimation,
        totalWidth,
        activeIndex,
        onIndexChange: onIndexChangeCb,
        getPageTranslate,
        isPagerInProgress,

    // the rest of the values are shared values,
    // so they don't need to be included in the deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [gutterWidthToUse, activeIndex, onIndexChangeCb]);

    useEffect(() => {
        skipAnimation.value = true;
        sharedWidth.value = width;
        const timer = setTimeout(() => {
            skipAnimation.value = false;
        }, 100);

        return () => {
            clearTimeout(timer);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width]);

    useEffect(() => {
        index.value = initialIndex;
        onIndexChangeCb(initialIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialIndex]);

    return (
        <PagerProvider sharedValues={sharedValues}>
            <PagerContent
                totalCount={totalCount}
                pages={pages}
                renderPage={renderPage}
                numToRender={numToRender}
                shouldRenderGutter={shouldRenderGutter}
                width={width}
                height={height}
                hideHeaderAndFooter={hideHeaderAndFooter}
            />
        </PagerProvider>
    );
};

export default React.memo(Pager);
