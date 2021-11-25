// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {memo, useEffect} from 'react';
import {StyleProp, View, ViewProps} from 'react-native';
import FastImage from 'react-native-fast-image';

import {fetchStatusInBatch} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import UserStatus from '@components/user_status';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Client} from '@client/rest';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'flex-start',
        },
        icon: {
            color: changeOpacity(theme.centerChannelColor, 0.48),
        },
        statusWrapper: {
            position: 'absolute',
            overflow: 'hidden',
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: theme.centerChannelBg,
            right: 0,
            bottom: 0,
        },
    };
});

type ProfileImageProps = {
    isBot?: boolean;
    isEditing?: boolean;
    lastPictureUpdate: number;
    size?: number;
    source?: { uri: string };
    statusSize?: number;
    statusStyle?: StyleProp<ViewProps>;
    containerStyle?: StyleProp<ViewProps>;
    testID?: string;
    userId?: string;
    userStatus?: string;
};

const ProfileImage = ({
    containerStyle,
    isBot,
    isEditing = false,
    lastPictureUpdate,
    size = 64,
    source,
    statusSize = 14,
    statusStyle,
    testID,
    userId,
    userStatus,
}: ProfileImageProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const styles = getStyleSheet(theme);

    useEffect(() => {
        if (userId) {
            fetchStatusInBatch(serverUrl, userId);
        }
    }, [userStatus, serverUrl]);

    let client: Client | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // does nothing
    }

    let image;
    if (userId && client) {
        const defaultSource = {
            uri: `${serverUrl}${client.getProfilePictureUrl(userId, lastPictureUpdate)}`,
        };
        if (source === undefined && isEditing) {
            image = (
                <CompassIcon
                    name='account-outline'
                    size={size * 0.78}
                    style={styles.icon}
                />
            );
        } else {
            image = (
                <FastImage
                    style={{width: size, height: size, borderRadius: size / 2}}
                    source={source ?? defaultSource}
                />
            );
        }
    } else {
        image = (
            <CompassIcon
                name='account-outline'
                size={size * 0.78}
                style={styles.icon}
            />
        );
    }

    return (
        <>
            <View
                style={[styles.container, containerStyle]}
                testID={`${testID}.${userId}`}
            >
                {image}
                {Boolean(userStatus) && !isBot && (
                    <View
                        style={[
                            styles.statusWrapper,
                            statusStyle,
                            {
                                borderRadius: statusSize / 2,
                                width: statusSize,
                                height: statusSize,
                            },
                        ]}
                    >
                        <UserStatus
                            size={statusSize}
                            status={userStatus}
                        />
                    </View>
                )}
            </View>

        </>
    );
};

export default memo(ProfileImage);
