// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image} from 'expo-image';
import React, {useCallback, type ReactNode} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StyleSheet, TouchableOpacity, View} from 'react-native';

import {buildAbsoluteUrl} from '@actions/remote/file';
import CompassIcon from '@components/compass_icon';
import ProfilePicture from '@components/profile_picture';
import {View as ViewConstant} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {openUserProfileModal} from '@screens/navigation';
import {ensureString} from '@utils/types';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';
import type {AvailableScreens} from '@typings/screens/navigation';

type AvatarProps = {
    author?: UserModel;
    enablePostIconOverride?: boolean;
    isAutoReponse: boolean;
    location: AvailableScreens;
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
    const propsIconUrl = ensureString(post.props?.override_icon_url);
    const propsUsername = ensureString(post.props?.override_username);

    if (fromWebHook && iconOverride) {
        const isEmoji = Boolean(post.props?.override_icon_emoji);
        const frameSize = ViewConstant.PROFILE_PICTURE_SIZE;
        const pictureSize = isEmoji ? ViewConstant.PROFILE_PICTURE_EMOJI_SIZE : ViewConstant.PROFILE_PICTURE_SIZE;
        const borderRadius = isEmoji ? 0 : ViewConstant.PROFILE_PICTURE_SIZE / 2;
        const overrideIconUrl = buildAbsoluteUrl(serverUrl, propsIconUrl);

        let iconComponent: ReactNode;
        if (overrideIconUrl) {
            const source = {uri: overrideIconUrl};
            iconComponent = (
                <Image
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

    const openUserProfile = usePreventDoubleTap(useCallback(() => {
        if (!author) {
            return;
        }
        openUserProfileModal(intl, theme, {
            location,
            userId: author.id,
            channelId: post.channelId,
            userIconOverride: propsIconUrl,
            usernameOverride: propsUsername,
        });
    }, [author, intl, location, post.channelId, propsIconUrl, propsUsername, theme]));

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
