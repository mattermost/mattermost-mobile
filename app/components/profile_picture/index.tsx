// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {Platform, StyleProp, View, ViewProps, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';

import {fetchStatusInBatch} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import UserStatus from '@components/user_status';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Client} from '@client/rest';
import type UserModel from '@typings/database/models/servers/user';

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2,
});

type ProfilePictureProps = {
    author?: UserModel;
    iconSize?: number;
    showStatus?: boolean;
    size: number;
    statusSize?: number;
    statusStyle?: StyleProp<ViewProps>;
    testID?: string;
};

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
        statusWrapper: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: theme.centerChannelBg,
        },
        status: {
            color: theme.centerChannelBg,
        },
    };
});

const ProfilePicture = ({author, iconSize, showStatus = true, size = 64, statusSize = 14, statusStyle, testID}: ProfilePictureProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const style = getStyleSheet(theme);
    const buffer = showStatus ? (STATUS_BUFFER || 0) : 0;
    let client: Client | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // handle below that the client is not set
    }

    useEffect(() => {
        if (author && !author.status && showStatus) {
            fetchStatusInBatch(serverUrl, author.id);
        }
    }, []);

    let statusIcon;
    let containerStyle: StyleProp<ViewStyle> = {
        width: size + buffer,
        height: size + buffer,
    };

    if (author?.status && !author.isBot && showStatus) {
        statusIcon = (
            <View style={[style.statusWrapper, statusStyle, {borderRadius: statusSize / 2}]}>
                <UserStatus
                    size={statusSize}
                    status={author.status}
                />
            </View>
        );
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
        containerStyle = {
            width: size + (buffer - 1),
            height: size + (buffer - 1),
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        };
        image = (
            <CompassIcon
                name='account-outline'
                size={iconSize || size}
                style={style.icon}
            />
        );
    }

    return (
        <View
            style={[style.container, containerStyle]}
            testID={`${testID}.${author?.id}`}
        >
            {image}
            {statusIcon}
        </View>
    );
};

export default ProfilePicture;
