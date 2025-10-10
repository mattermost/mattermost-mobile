// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FloatingBanner from '@components/floating_banner/floating_banner';

import type {FloatingBannerConfig} from '@components/floating_banner/types';

type FloatingBannerScreenProps = {
    banners: FloatingBannerConfig[];
    onDismiss: (id: string) => void;
};

const FloatingBannerScreen: React.FC<FloatingBannerScreenProps> = (props) => {
    return <FloatingBanner {...props}/>;
};

export default FloatingBannerScreen;
