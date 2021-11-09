// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo} from 'react';
import {View} from 'react-native';
import FastImage from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Client} from '@client/rest';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 80,
        },
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.48),
        },
    };
});

type UserProfileImageProps = {
    imageUrl?: string;
    lastPictureUpdate: number;
    size: number;
    source?: { uri: string };
    testID?: string;
    userId?: string;
};

const UserProfileImage = ({
    imageUrl,
    lastPictureUpdate,
    size = 64,
    source,
    testID,
    userId,
}: UserProfileImageProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);

    let client: Client | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // does nothing
    }

    let image;
    if (userId && client) {
        const pictureUrl = imageUrl ?? client.getProfilePictureUrl(userId, lastPictureUpdate);
        const imageSource = source ?? {uri: `${serverUrl}${pictureUrl}`};
        image = (
            <FastImage
                style={{width: size, height: size, borderRadius: (size / 2)}}
                source={imageSource}
            />
        );
    } else {
        image = (
            <CompassIcon
                name='account-outline'
                size={size}
                style={style.icon}
            />
        );
    }

    return (
        <View
            style={[style.container]}
            testID={`${testID}.${userId}`}
        >
            {image}
        </View>
    );
};

export default memo(UserProfileImage);
