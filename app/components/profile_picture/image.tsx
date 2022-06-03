// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import FastImage, {Source} from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import {ACCOUNT_OUTLINE_IMAGE} from '@constants/profile';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Client} from '@client/rest';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel | UserProfile;
    iconSize?: number;
    size: number;
    source?: Source | string;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.48),
        },
    };
});

const Image = ({author, iconSize, size, source}: Props) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);
    const fIStyle = useMemo(() => ({
        borderRadius: size / 2,
        height: size,
        width: size,
    }), [size]);

    if (typeof source === 'string') {
        return (
            <CompassIcon
                name={source}
                size={iconSize || size}
                style={style.icon}
            />
        );
    }

    let client: Client | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // handle below that the client is not set
    }

    if (author && client) {
        let lastPictureUpdate = 0;
        const isBot = ('isBot' in author) ? author.isBot : author.is_bot;
        if (isBot) {
            lastPictureUpdate = ('isBot' in author) ? author.props?.bot_last_icon_update : author.bot_last_icon_update || 0;
        } else {
            lastPictureUpdate = ('lastPictureUpdate' in author) ? author.lastPictureUpdate : author.last_picture_update;
        }

        const pictureUrl = client.getProfilePictureUrl(author.id, lastPictureUpdate);
        const imgSource = source ?? {uri: `${serverUrl}${pictureUrl}`};
        return (
            <FastImage
                key={pictureUrl}
                style={fIStyle}
                source={imgSource}
            />
        );
    }
    return (
        <CompassIcon
            name={ACCOUNT_OUTLINE_IMAGE}
            size={iconSize || size}
            style={style.icon}
        />
    );
};

export default Image;
