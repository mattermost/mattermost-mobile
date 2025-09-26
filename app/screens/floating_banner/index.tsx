// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';

import FloatingBanner from '@components/floating_banner/floating_banner';

import type {BannerConfig} from '@components/floating_banner/types';

type FloatingBannerScreenProps = {
    banners: BannerConfig[];
    onDismiss: (id: string) => void;
};

const FloatingBannerScreen: React.FC<FloatingBannerScreenProps> = (props) => {
    return (
        <SafeAreaProvider>
            <FloatingBanner {...props}/>
        </SafeAreaProvider>
    );
};

export default FloatingBannerScreen;
