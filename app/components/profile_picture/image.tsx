// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image as ExpoImage, type ImageSource} from 'expo-image';
import React, {useMemo} from 'react';
import Animated from 'react-native-reanimated';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {buildProfileImageUrlFromUser} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import {ACCOUNT_OUTLINE_IMAGE} from '@constants/profile';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {getLastPictureUpdate} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    author?: UserModel | UserProfile;
    forwardRef?: React.RefObject<any>;
    iconSize?: number;
    size: number;
    source?: ImageSource | string;
    url?: string;
};

const AnimatedImage = Animated.createAnimatedComponent(ExpoImage);

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
    const lastPictureUpdateAt = author ? getLastPictureUpdate(author) : 0;
    const fIStyle = useMemo(() => ({
        borderRadius: size / 2,
        backgroundColor: theme.centerChannelBg,
        height: size,
        width: size,
    }), [size, theme.centerChannelBg]);

    const imgSource = useMemo(() => {
        if (!author || typeof source === 'string') {
            return undefined;
        }

        const pictureUrl = buildProfileImageUrlFromUser(serverUrl, author);
        return source ?? {uri: buildAbsoluteUrl(serverUrl, pictureUrl)};

    // We need to pass the lastPictureUpdateAt, because changes in this
    // value are used internally, and may not be followed by a change
    // in the containing object (author).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [author, serverUrl, source, lastPictureUpdateAt]);

    if (typeof source === 'string') {
        return (
            <CompassIcon
                name={source}
                size={iconSize || size}
                style={style.icon}
            />
        );
    }

    if (imgSource?.uri?.startsWith('file://')) {
        return (
            <AnimatedImage
                key={imgSource.uri}
                ref={forwardRef}
                style={fIStyle}
                source={{uri: imgSource.uri}}
            />
        );
    }

    if (imgSource) {
        return (
            <AnimatedImage
                key={imgSource.uri}
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
