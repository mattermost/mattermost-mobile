// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {Platform, StyleProp, View, ViewProps} from 'react-native';
import FastImage, {Source} from 'react-native-fast-image';

import {fetchStatusInBatch} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import UserStatus from '@components/user_status';
import {ACCOUNT_OUTLINE_IMAGE} from '@constants/profile';
import {useServerUrl} from '@context/server';
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
    source?: Source | string;
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

const ProfilePicture = ({
    author,
    iconSize,
    showStatus = true,
    size = 64,
    statusSize = 14,
    statusStyle,
    testID,
    source,
}: ProfilePictureProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const fIStyle = useMemo(() => ({width: size, height: size, borderRadius: (size / 2)}), [size]);

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

    const containerStyle = useMemo(() => {
        if (author) {
            return {
                width: size + (buffer - 1),
                height: size + (buffer - 1),
                backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            };
        }

        return {
            width: size + buffer,
            height: size + buffer,
        };
    }, [author, size]);

    const statusIcon = useMemo(() => {
        if (author?.status && !author.isBot && showStatus) {
            return (
                <View style={[style.statusWrapper, statusStyle, {borderRadius: statusSize / 2}]}>
                    <UserStatus
                        size={statusSize}
                        status={author.status}
                    />
                </View>
            );
        }
        return undefined;
    }, [author?.status, showStatus]);

    const image = useMemo(() => {
        if (author && client) {
            const pictureUrl = client.getProfilePictureUrl(author.id, author.lastPictureUpdate);
            const imgSource = source ?? {uri: `${serverUrl}${pictureUrl}`};

            if (typeof source === 'string') {
                return (
                    <CompassIcon
                        name={source}
                        size={iconSize || size}
                        style={style.icon}
                    />
                );
            }
            return (
                <FastImage
                    key={pictureUrl}
                    style={fIStyle}
                    source={imgSource as Source}
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
    }, [author, client, size, iconSize]);

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
