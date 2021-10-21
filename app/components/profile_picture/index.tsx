// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {Platform, StyleProp, View, ViewProps, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';

import {fetchStatusInBatch} from '@actions/remote/user';
import {Client} from '@client/rest';
import CompassIcon from '@components/compass_icon';
import UserStatus from '@components/user_status';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import NetworkManager from '@init/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2,
});

type ProfilePictureProps = {
    edit: boolean;
    iconSize?: number;
    imageUri?: string;
    profileImageRemove?: boolean;
    profileImageUri?: string;
    showStatus?: boolean;
    size?: number;
    status?: string;
    statusSize?: number;
    statusStyle?: StyleProp<ViewProps> | any;
    author: UserModel;
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

const ProfilePicture = ({author, showStatus = true, edit = false, iconSize, imageUri, profileImageRemove, profileImageUri, size = 128, status, statusSize = 14, statusStyle: defaultStatusStyle, testID}: ProfilePictureProps) => {
    const [pictureUrl, setPictureUrl] = useState<string|undefined>();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const style = getStyleSheet(theme);
    const buffer = showStatus ? (STATUS_BUFFER || 0) : 0;

    let client: Client | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // does nothing
    }

    useEffect(() => {
        if (author && !author.status && showStatus) {
            fetchStatusInBatch(serverUrl, author.id);
        }
    }, []);

    useEffect(() => {
        if (profileImageUri) {
            setPictureUrl(profileImageUri);
        } else if (edit && imageUri) {
            setPictureUrl(imageUri);
        } else if (author && client) {
            const uri = client.getProfilePictureUrl(author.id, author.lastPictureUpdate);
            setPictureUrl(uri);
        }
    }, []);

    useDidUpdate(() => {
        setPictureUrl(undefined);
    }, [profileImageRemove]);

    useDidUpdate(() => {
        if (edit && imageUri) {
            setPictureUrl(imageUri);
        }
    }, [edit, imageUri]);

    useDidUpdate(() => {
        if (profileImageUri) {
            setPictureUrl(profileImageUri);
        }
    }, [profileImageUri]);

    useDidUpdate(() => {
        const url = author && client ? client.getProfilePictureUrl(author.id, author.lastPictureUpdate) : undefined;
        if (url !== pictureUrl && !edit) {
            setPictureUrl(url);
        }
    }, [author, edit]);

    let statusIcon;
    let statusStyle = defaultStatusStyle;
    let containerStyle: StyleProp<ViewStyle> = {
        width: size + buffer,
        height: size + buffer,
    };

    if (edit) {
        const iconColor = changeOpacity(theme.centerChannelColor, 0.6);
        statusStyle = {
            width: statusSize,
            height: statusSize,
            backgroundColor: theme.centerChannelBg,
        };
        statusIcon = (
            <CompassIcon
                name='camera-outline'
                size={statusSize / 1.7}
                color={iconColor}
            />
        );
    } else if (status && !edit) {
        statusIcon = (
            <UserStatus
                size={statusSize}
                status={status}
            />
        );
    }

    let source = null;
    let image;
    if (pictureUrl) {
        let prefix = '';
        if (Platform.OS === 'android' && !pictureUrl.startsWith('content://') && !pictureUrl.startsWith('http://') && !pictureUrl.startsWith('https://')) {
            prefix = 'file://';
        }

        if (pictureUrl.includes('api')) {
            prefix = serverUrl;
        }

        source = {
            uri: `${prefix}${pictureUrl}`,
        };

        image = (
            <FastImage
                key={pictureUrl}
                style={{width: size, height: size, borderRadius: size / 2}}
                source={source}
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
            {(showStatus || edit) && (!author?.isBot) &&
            <View style={[style.statusWrapper, statusStyle, {borderRadius: statusSize / 2}]}>
                {statusIcon}
            </View>
            }
        </View>
    );
};

export default ProfilePicture;
