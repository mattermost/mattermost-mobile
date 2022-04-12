// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {ReactNode, useRef} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, StyleSheet, TouchableOpacity, View} from 'react-native';
import FastImage from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {View as ViewConstant} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@managers/network_manager';
import {showModal} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

import type {Client} from '@client/rest';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {ImageSource} from 'react-native-vector-icons/Icon';

type AvatarProps = {
    author: UserModel;
    enablePostIconOverride?: boolean;
    isAutoReponse: boolean;
    post: PostModel;
}

const style = StyleSheet.create({
    buffer: {
        marginRight: Platform.select({android: 2, ios: 3}),
    },
});

const Avatar = ({author, enablePostIconOverride, isAutoReponse, post}: AvatarProps) => {
    const closeButton = useRef<ImageSource>();
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    let client: Client | undefined;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // do nothing, client is not set
    }

    const fromWebHook = post.props?.from_webhook === 'true';
    const iconOverride = enablePostIconOverride && post.props?.use_user_icon !== 'true';
    if (fromWebHook && iconOverride) {
        const isEmoji = Boolean(post.props?.override_icon_emoji);
        const frameSize = ViewConstant.PROFILE_PICTURE_SIZE;
        const pictureSize = isEmoji ? ViewConstant.PROFILE_PICTURE_EMOJI_SIZE : ViewConstant.PROFILE_PICTURE_SIZE;
        const borderRadius = isEmoji ? 0 : ViewConstant.PROFILE_PICTURE_SIZE / 2;
        const overrideIconUrl = client?.getAbsoluteUrl(post.props?.override_icon_url);

        let iconComponent: ReactNode;
        if (overrideIconUrl) {
            const source = {uri: overrideIconUrl};
            iconComponent = (
                <FastImage
                    source={source}
                    style={{
                        height: pictureSize,
                        width: pictureSize,
                    }}
                />
            );
        } else {
            iconComponent = (
                <CompassIcon
                    name='webhook'
                    size={32}
                />
            );
        }

        return (
            <View
                style={[{
                    borderRadius,
                    overflow: 'hidden',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: frameSize,
                    width: frameSize,
                }, style.buffer]}
            >
                {iconComponent}
            </View>
        );
    }

    const onViewUserProfile = preventDoubleTap(() => {
        const screen = 'UserProfile';
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const passProps = {author};

        if (!closeButton.current) {
            closeButton.current = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        }

        const options = {
            topBar: {
                leftButtons: [{
                    id: 'close-settings',
                    icon: closeButton.current,
                    testID: 'close.settings.button',
                }],
            },
        };

        Keyboard.dismiss();
        showModal(screen, title, passProps, options);
    });

    let component = (
        <ProfilePicture
            author={author}
            size={ViewConstant.PROFILE_PICTURE_SIZE}
            iconSize={24}
            showStatus={!isAutoReponse || author.isBot}
            testID='post_profile_picture.profile_picture'
        />
    );

    if (!fromWebHook) {
        component = (
            <TouchableOpacity onPress={onViewUserProfile}>
                {component}
            </TouchableOpacity>
        );
    }

    return component;
};

export default Avatar;
