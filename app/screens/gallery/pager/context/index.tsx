// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';

import type {DerivedValue, SharedValue} from 'react-native-reanimated';

export type PagerSharedValues = {
    sharedWidth: SharedValue<number>;
    gutterWidthToUse: number;
    isActive: SharedValue<boolean>;
    velocity: SharedValue<number>;
    index: SharedValue<number>;
    length: SharedValue<number>;
    pagerX: SharedValue<number>;
    toValueAnimation: SharedValue<number>;
    offsetX: DerivedValue<number>;
    totalWidth: DerivedValue<number>;
    isPagerInProgress: DerivedValue<boolean>;
    getPageTranslate: (i: number, w?: number) => number;
    activeIndex: number;
    onIndexChange: (index: number) => void;
};

const PagerContext = React.createContext<PagerSharedValues | null>(null);

export const PagerProvider: React.FC<{sharedValues: PagerSharedValues; children: React.ReactNode}> = ({children, sharedValues}) => {
    return (
        <PagerContext.Provider value={sharedValues}>
            {children}
        </PagerContext.Provider>
    );
};

export const usePagerSharedValues = () => {
    const context = useContext(PagerContext);
    if (!context) {
        throw new Error('usePagerSharedValues must be used within a PagerProvider');
    }

    const {
        sharedWidth,
        gutterWidthToUse,
        isActive,
        offsetX,
        index,
        length,
        getPageTranslate,
    } = context;

    function onPageStateChange(value: boolean) {
        'worklet';

        isActive.value = value;
    }

    function getCanSwipe(currentTranslate = 0) {
        'worklet';

        const nextTranslate = offsetX.value + currentTranslate;

        if (nextTranslate > 0) {
            return false;
        }

        const totalTranslate = (sharedWidth.value * (length.value - 1)) + (gutterWidthToUse * (length.value - 1));

        if (Math.abs(nextTranslate) >= totalTranslate) {
            return false;
        }

        return true;
    }

    const getNextIndex = (v: number) => {
        'worklet';

        const currentTranslate = Math.abs(getPageTranslate(index.value));
        const currentIndex = index.value;
        const currentOffset = Math.abs(offsetX.value);

        const nextIndex = v < 0 ? currentIndex + 1 : currentIndex - 1;

        if (nextIndex < currentIndex && currentOffset > currentTranslate) {
            return currentIndex;
        }

        if (nextIndex > currentIndex && currentOffset < currentTranslate) {
            return currentIndex;
        }

        if (nextIndex > length.value - 1 || nextIndex < 0) {
            return currentIndex;
        }

        return nextIndex;
    };

    return {
        ...context,
        onPageStateChange,
        getCanSwipe,
        getNextIndex,
    };
};
