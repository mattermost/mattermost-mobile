// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import FastImage from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Client} from '@client/rest';
import type UserModel from '@typings/database/models/servers/user';

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
    author?: UserModel;
    size: number;
    testID?: string;
};

const UserProfileImage = ({
    author,
    size = 64,
    testID,
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
    if (author && client) {
        const pictureUrl = client.getProfilePictureUrl(author.id, author.lastPictureUpdate);

        image = (
            <FastImage
                key={pictureUrl}
                style={{width: size, height: size, borderRadius: (size / 2)}}
                source={{uri: `${serverUrl}${pictureUrl}`}}
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
            testID={`${testID}.${author?.id}`}
        >
            {image}
        </View>
    );
};

export default UserProfileImage;
