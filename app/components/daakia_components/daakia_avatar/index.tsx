// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React from 'react';
import {View} from 'react-native';
import tinyColor from 'tinycolor2';

import {View as ViewConstants} from '@constants';

type Props = {
    theme: Theme;
    size?: number;
}

const DaakiaAvatar = ({theme, size = ViewConstants.PROFILE_PICTURE_SIZE}: Props) => {
    const isLightTheme = tinyColor(theme.centerChannelBg).isLight();
    const backgroundColor = isLightTheme ? 'transparent' : '#FFFFFF';

    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor,
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <Image
                source={require('../../../../assets/base/images/daakiaDlogoCircle.png')}
                style={{
                    width: size - 4,
                    height: size - 4,
                    borderRadius: (size - 4) / 2,
                }}
            />
        </View>
    );
};

export default DaakiaAvatar;
