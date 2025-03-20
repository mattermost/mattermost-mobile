// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Text, View} from 'react-native';
import banner from '@react-native-community/cli/build/commands/init/banner';

type Props = {
    bannerInfo?: ChannelBannerInfo;
}

export function ChannelBanner({bannerInfo}: Props) {
    console.log('$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$', {message: bannerInfo?.text, color: bannerInfo?.background_color});

    return (
        <View>
            <Text>{'Channel Banner'}</Text>
        </View>
    );
}
