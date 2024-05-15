// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {useIntl} from 'react-intl';
import {Keyboard, Platform, StyleSheet, TouchableOpacity, View} from 'react-native';
import FastImage from 'react-native-fast-image';

import {buildAbsoluteUrl} from '@actions/remote/file';
import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {Screens, View as ViewConstant} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {openAsBottomSheet} from '@screens/navigation';
import {preventDoubleTap} from '@utils/tap';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type AvatarProps = {
    author?: UserModel;
    enablePostIconOverride?: boolean;
    isAutoReponse: boolean;
    location: string;
    post: PostModel;
}

const style = StyleSheet.create({
    buffer: {
        marginRight: Platform.select({android: 2, ios: 3}),
    },
});

const Avatar = ({author, enablePostIconOverride, isAutoReponse, location, post}: AvatarProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const fromWebHook = post.props?.from_webhook === 'true';
    const iconOverride = enablePostIconOverride && post.props?.use_user_icon !== 'true';
    if (fromWebHook && iconOverride) {
        const isEmoji = Boolean(post.props?.override_icon_emoji);
        const frameSize = ViewConstant.PROFILE_PICTURE_SIZE;
        const pictureSize = isEmoji ? ViewConstant.PROFILE_PICTURE_EMOJI_SIZE : ViewConstant.PROFILE_PICTURE_SIZE;
        const borderRadius = isEmoji ? 0 : ViewConstant.PROFILE_PICTURE_SIZE / 2;
        const overrideIconUrl = buildAbsoluteUrl(serverUrl, post.props?.override_icon_url);

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

    const openUserProfile = preventDoubleTap(() => {
        if (!author) {
            return;
        }
        const screen = Screens.USER_PROFILE;
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const closeButtonId = 'close-user-profile';
        const props = {
            closeButtonId,
            userId: author.id,
            channelId: post.channelId,
            location,
            userIconOverride: post.props?.override_username,
            usernameOverride: post.props?.override_icon_url,
        };

        Keyboard.dismiss();
        openAsBottomSheet({screen, title, theme, closeButtonId, props});
    });

    let component = (
        <ProfilePicture
            author={author}
            size={ViewConstant.PROFILE_PICTURE_SIZE}
            iconSize={24}
            showStatus={!isAutoReponse || author?.isBot}
            testID={`post_avatar.${author?.id}.profile_picture`}
        />
    );

    if (!fromWebHook) {
        component = (
            <TouchableOpacity onPress={openUserProfile}>
                {component}
            </TouchableOpacity>
        );
    }

    return component;
};

export default Avatar;
