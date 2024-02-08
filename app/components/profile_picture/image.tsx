// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Image as RNImage} from 'react-native';
import FastImage, {type Source} from 'react-native-fast-image';
import Animated from 'react-native-reanimated';

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
    forwardRef?: React.RefObject<any>;
    iconSize?: number;
    size: number;
    source?: Source | string;
    url?: string;
};

// @ts-expect-error FastImage does work with Animated.createAnimatedComponent
const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);
const AnimatedImage = Animated.createAnimatedComponent(RNImage);

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.48),
        },
    };
});

const Image = ({author, forwardRef, iconSize, size, source, url}: Props) => {
    const theme = useTheme();
    let serverUrl = useServerUrl();
    serverUrl = url || serverUrl;

    const style = getStyleSheet(theme);
    const fIStyle = useMemo(() => ({
        borderRadius: size / 2,
        backgroundColor: theme.centerChannelBg,
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
            lastPictureUpdate = ('lastPictureUpdate' in author) ? author.lastPictureUpdate : author.last_picture_update || 0;
        }

        const pictureUrl = client.getProfilePictureUrl(author.id, lastPictureUpdate);
        const imgSource = source ?? {uri: `${serverUrl}${pictureUrl}`};
        if (imgSource.uri?.startsWith('file://')) {
            return (
                <AnimatedImage
                    key={pictureUrl}
                    ref={forwardRef}
                    style={fIStyle}
                    source={{uri: imgSource.uri}}
                />
            );
        }
        return (
            <AnimatedFastImage
                key={pictureUrl}

                // @ts-expect-error TS expects old type ref
                ref={forwardRef}
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
