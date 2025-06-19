// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react';

import type {GalleryItemType} from '@typings/screens/gallery';
import type {ImageSize} from 'react-native';
import type {SharedValue} from 'react-native-reanimated';

export type LightboxSharedValues = {
    headerAndFooterHidden: SharedValue<boolean>;
    animationProgress: SharedValue<number>;
    childrenOpacity: SharedValue<number>;
    childTranslateY: SharedValue<number>;
    imageOpacity: SharedValue<number>;
    opacity: SharedValue<number>;
    scale: SharedValue<number>;
    target: GalleryItemType;
    targetDimensions: ImageSize;
    translateX: SharedValue<number>;
    translateY: SharedValue<number>;
    allowsOtherGestures: () => boolean;
    isVisibleImage: () => boolean;
    onAnimationFinished: () => void;
    onSwipeActive: (translateY: number) => void;
    onSwipeFailure: () => void;
};

const LightboxContext = React.createContext<LightboxSharedValues | null>(null);

export const LightboxProvider: React.FC<{sharedValues: LightboxSharedValues; children: React.ReactNode}> = ({children, sharedValues}) => {
    return (
        <LightboxContext.Provider value={sharedValues}>
            {children}
        </LightboxContext.Provider>
    );
};

export const useLightboxSharedValues = () => {
    const context = useContext(LightboxContext);
    if (!context) {
        throw new Error('useLightboxSharedValues must be used within a LightboxProvider');
    }

    return context;
};
