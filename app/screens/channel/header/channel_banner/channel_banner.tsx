// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';

type Props = {
    bannerInfo?: ChannelBannerInfo;
}

export function ChannelBanner({bannerInfo}: Props) {
    return (
        <View>
            <Text>{'Channel Banner'}</Text>
        </View>
    );
}
