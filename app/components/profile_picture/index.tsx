// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useEffect, useState} from 'react';
import {Platform, StyleProp, View, ViewProps, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import UserStatus from '@components/user_status';
import {MM_TABLES} from '@constants/database';
import useDidUpdate from '@hooks/did_update';
import NetworkManager from '@init/network_manager';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Database} from '@nozbe/watermelondb';

import type UserModel from '@typings/database/models/servers/user';

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2,
});

const {SERVER: {USER}} = MM_TABLES;

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

const ConnectedProfilePicture = ({iconSize, showStatus = true, size = 128, statusSize = 14, testID, user}: ProfilePictureProps) => {
    const [pictureUrl, setPictureUrl] = useState<string | undefined>();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const client = NetworkManager.getClient(serverUrl);

    const style = getStyleSheet(theme);
    const buffer = STATUS_BUFFER || 0;
    const status = user?.status;

    useEffect(() => {
        try {
            if (user) {
                const uri = client.getProfilePictureUrl(user.id, user.lastPictureUpdate);
                setPictureUrl(uri);
            }
        } catch (e) {
            // do nothing
        }
    }, []);

    useDidUpdate(() => {
        try {
            const url = user ? client.getProfilePictureUrl(user.id, user.lastPictureUpdate) : undefined;
            if (url !== pictureUrl) {
                setPictureUrl(url);
            }
        } catch (e) {
            // do nothing
        }
    }, [user]);

    let statusIcon;

    let containerStyle: StyleProp<ViewStyle> = {
        width: size + buffer,
        height: size + buffer,
    };

    if (status) {
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

        source = {
            uri: `${prefix}${pictureUrl}`,
        };

        image = (
            <FastImage
                key={pictureUrl}
                style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                }}
                source={source}
            />
        );
    } else {
        containerStyle = {
            width: size + (buffer - 1),
            height: size + (buffer - 1),
            backgroundColor: changeOpacity(
                theme.centerChannelColor,
                0.08,
            ),
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
            testID={`${testID}.${user?.id}`}
        >
            {image}
            {showStatus && !user?.isBot && (
                <View
                    style={[
                        style.statusWrapper,
                        {borderRadius: statusSize / 2},
                    ]}
                >
                    {statusIcon}
                </View>
            )}
        </View>
    );
};

type ProfilePictureInputProps = {
    iconSize?: number;
    showStatus?: boolean;
    size?: number;
    statusSize?: number;
    statusStyle?: StyleProp<ViewProps> | any;
    testID?: string;
    userId?: string;
}

type ProfilePictureProps = ProfilePictureInputProps & {
    user?: UserModel;
    database: Database;
};

const ProfilePicture: React.FunctionComponent<ProfilePictureInputProps> = withDatabase(withObservables(['userId'], ({userId, database}: {userId: string; database: Database}) => ({
    ...(userId && {user: database.collections.get(USER).findAndObserve(userId)}),
}))(ConnectedProfilePicture));

export default ProfilePicture;
