// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {Platform, StyleProp, View, ViewProps, ViewStyle} from 'react-native';
import FastImage from 'react-native-fast-image';

import {Client4} from '@client/rest';
import CompassIcon from '@components/compass_icon';
import UserStatus from '@components/user_status';
import {useDidUpdate} from '@hooks';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/preferences';
import type {UserProfile} from '@mm-redux/types/users';

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2,
});

type ProfilePictureProps = {
    actions: {
        setProfileImageUri: (imageUri?: string) => void;
        getStatusForId: (id: string) => void;
    };
    edit: boolean;
    iconSize?: number;
    imageUri?: string;
    isCurrentUser: boolean;
    profileImageRemove?: boolean;
    profileImageUri?: string;
    showStatus: boolean;
    size: number;
    status?: string;
    statusSize: number;
    statusStyle?: StyleProp<ViewProps> | any;
    user?: UserProfile;
    userId: string;
    theme: Theme;
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

const ProfilePicture = (props: ProfilePictureProps) => {
    const [pictureUrl, setPictureUrl] = useState<string|undefined>();
    const style = getStyleSheet(props.theme);
    const buffer = STATUS_BUFFER || 0;

    const clearProfileImageUri = () => {
        if (props.isCurrentUser && props.profileImageUri !== '') {
            props.actions.setProfileImageUri('');
        }
    };

    useEffect(() => {
        const {edit, imageUri, profileImageUri, user, status} = props;
        const {getStatusForId} = props.actions;

        if (!status && user) {
            getStatusForId(user.id);
        }

        if (profileImageUri) {
            setPictureUrl(profileImageUri);
        } else if (edit && imageUri) {
            setPictureUrl(imageUri);
        } else if (user) {
            const uri = Client4.getProfilePictureUrl(user.id, user.last_picture_update);

            setPictureUrl(uri);
            clearProfileImageUri();
        }
    }, []);

    useDidUpdate(() => {
        setPictureUrl(undefined);
    }, [props.profileImageRemove]);

    useDidUpdate(() => {
        const {edit, imageUri} = props;
        if (edit && imageUri) {
            setPictureUrl(imageUri);
        }
    }, [props.edit, props.imageUri]);

    useDidUpdate(() => {
        const {profileImageUri} = props;
        if (profileImageUri) {
            setPictureUrl(profileImageUri);
        }
    }, [props.profileImageUri]);

    useDidUpdate(() => {
        const {edit, user} = props;

        const url = user ? Client4.getProfilePictureUrl(user.id, user.last_picture_update) : undefined;
        if (url !== pictureUrl && !edit) {
            setPictureUrl(url);
        }
    }, [props.user, props.edit]);

    let statusIcon;
    let statusStyle = props.statusStyle;
    let containerStyle: StyleProp<ViewStyle> = {
        width: props.size + buffer,
        height: props.size + buffer,
    };

    if (props.edit) {
        const iconColor = changeOpacity(props.theme.centerChannelColor, 0.6);
        statusStyle = {
            width: props.statusSize,
            height: props.statusSize,
            backgroundColor: props.theme.centerChannelBg,
        };
        statusIcon = (
            <CompassIcon
                name='camera-outline'
                size={props.statusSize / 1.7}
                color={iconColor}
            />
        );
    } else if (props.status && !props.edit) {
        statusIcon = (
            <UserStatus
                size={props.statusSize}
                status={props.status}
            />
        );
    }

    let source = null;
    let image;
    if (pictureUrl) {
        let prefix = '';
        if (Platform.OS === 'android' && !pictureUrl.startsWith('content://') &&
            !pictureUrl.startsWith('http://') && !pictureUrl.startsWith('https://')) {
            prefix = 'file://';
        }

        source = {
            uri: `${prefix}${pictureUrl}`,
        };

        image = (
            <FastImage
                key={pictureUrl}
                style={{width: props.size, height: props.size, borderRadius: props.size / 2}}
                source={source}
            />
        );
    } else {
        containerStyle = {
            width: props.size + (buffer - 1),
            height: props.size + (buffer - 1),
            backgroundColor: changeOpacity(props.theme.centerChannelColor, 0.08),
        };
        image = (
            <CompassIcon
                name='account-outline'
                size={props.iconSize || props.size}
                style={style.icon}
            />
        );
    }

    return (
        <View
            style={[style.container, containerStyle]}
            testID={`${props.testID}.${props.user?.id}`}
        >
            {image}
            {(props.showStatus || props.edit) && (!props.user?.is_bot) &&
                <View style={[style.statusWrapper, statusStyle, {borderRadius: props.statusSize / 2}]}>
                    {statusIcon}
                </View>
            }
        </View>
    );
};

ProfilePicture.defaultProps = {
    showStatus: true,
    size: 128,
    statusSize: 14,
    edit: false,
};

export default ProfilePicture;
