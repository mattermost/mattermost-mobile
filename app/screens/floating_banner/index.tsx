// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import FloatingBanner from '@components/floating_banner/floating_banner';

import type {FloatingBannerConfig} from '@components/floating_banner/types';

type FloatingBannerScreenProps = {
    banners: FloatingBannerConfig[];
    onDismiss: (id: string) => void;
};

const styles = StyleSheet.create({
    gestureRoot: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'box-none',
    },
});

const FloatingBannerScreen: React.FC<FloatingBannerScreenProps> = (props) => {
    return (
        <GestureHandlerRootView style={styles.gestureRoot}>
            <FloatingBanner {...props}/>
        </GestureHandlerRootView>
    );
};

export default FloatingBannerScreen;
