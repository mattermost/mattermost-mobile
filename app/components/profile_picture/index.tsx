// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase} from '@nozbe/watermelondb/DatabaseProvider';
import withObservables from '@nozbe/with-observables';
import React, {useEffect, useState} from 'react';
import {Platform, StyleProp, View, ViewProps, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';

//fixme: do not use Client4
import {Client4} from '@client/rest';
import CompassIcon from '@components/compass_icon';
import UserStatus from '@components/user_status';
import {MM_TABLES} from '@constants/database';
import useDidUpdate from '@hooks/did_update';
import {useTheme} from '@contexts/theme_provider';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {queryCurrentUserId} from '@queries/servers/system';

import type {Database} from '@nozbe/watermelondb';
import type SystemModel from '@typings/database/models/servers/system';
import type UserModel from '@typings/database/models/servers/user';

type ProfilePictureInputProps = {
    profileImageRemove?: boolean; // fixme: is that one really needed ?
    showStatus?: boolean;
    size: number;
    statusSize: number;
    statusStyle?: StyleProp<ViewProps> | any;
    testID?: string;
    userId?: string;
}

type ProfilePictureProps = ProfilePictureInputProps & {
    currentUserIdRecord: SystemModel;
    edit: boolean;
    iconSize?: number;
    imageUri?: string;
    profileImageUri?: string;
    user? : UserModel;
    database: Database;
};

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2,
});

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

const ConnectedProfilePicture = ({currentUserIdRecord, edit = false, iconSize, imageUri, profileImageRemove, profileImageUri, showStatus = true, size = 128, statusSize = 14, statusStyle, testID, user}: ProfilePictureProps) => {
    const [pictureUrl, setPictureUrl] = useState<string | undefined>();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const buffer = STATUS_BUFFER || 0;
    const isCurrentUser = user?.id === currentUserIdRecord.value;
    const status = user?.status;
    const clearProfileImageUri = () => {
        if (isCurrentUser && profileImageUri !== '') {
            //fixme:  what do we do here ?
            // setProfileImageUri('');
        }
    };

    useEffect(() => {
        if (!status && user) {
            //fixme:  what do we do here ?
            // getStatusForId(user.id);
        }

        if (profileImageUri) {
            setPictureUrl(profileImageUri);
        } else if (edit && imageUri) {
            setPictureUrl(imageUri);
        } else if (user) {
            const uri = Client4.getProfilePictureUrl(user.id, user.lastPictureUpdate);
            setPictureUrl(uri);
            clearProfileImageUri();
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
        const url = user ? Client4.getProfilePictureUrl(user.id, user.lastPictureUpdate) : undefined;
        if (url !== pictureUrl) {
            setPictureUrl(url);
        }
    }, [user]);

    let statusIcon;
    let profileStatusStyle = statusStyle;
    let containerStyle: StyleProp<ViewStyle> = {
        width: size + buffer,
        height: size + buffer,
    };

    if (edit) {
        const iconColor = changeOpacity(theme.centerChannelColor, 0.6);
        profileStatusStyle = {
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
        if (
            Platform.OS === 'android' &&
            !pictureUrl.startsWith('content://') &&
            !pictureUrl.startsWith('http://') &&
            !pictureUrl.startsWith('https://')
        ) {
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
            {(showStatus || edit) && !user?.isBot && (
                <View
                    style={[
                        style.statusWrapper,
                        profileStatusStyle,
                        {borderRadius: statusSize / 2},
                    ]}
                >
                    {statusIcon}
                </View>
            )}
        </View>
    );
};

const ProfilePicture: React.FunctionComponent<ProfilePictureInputProps> = withDatabase(withObservables(['userId'], ({userId, database}: {userId: string, database: Database}) => ({
    currentUserIdRecord: queryCurrentUserId(database),
    ...(userId && {user: database.collections.get(MM_TABLES.SERVER.USER).findAndObserve(userId)}),
}))(ConnectedProfilePicture));

export default ProfilePicture;
