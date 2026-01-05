// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import {type ImageSource} from 'expo-image';
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {buildAbsoluteUrl} from '@actions/remote/file';
import {buildProfileImageUrlFromUser} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import ExpoImage from '@components/expo_image';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';
import {urlSafeBase64Encode} from '@utils/security';
import {getLastPictureUpdate} from '@utils/user';

import type {WithDatabaseArgs} from '@typings/database/database';
import type UserModel from '@typings/database/models/servers/user';

interface NotificationIconProps {
    author?: UserModel;
    enablePostIconOverride: boolean;
    fromWebhook: boolean;
    overrideIconUrl?: string;
    serverUrl: string;
    useUserIcon: boolean;
}

const IMAGE_SIZE = 36;
const logo = require('@assets/images/icon.png');

const styles = StyleSheet.create({
    icon: {
        borderRadius: (IMAGE_SIZE / 2),
        height: IMAGE_SIZE,
        width: IMAGE_SIZE,
    },
});

const NotificationIcon = ({author, enablePostIconOverride, fromWebhook, overrideIconUrl, serverUrl, useUserIcon}: NotificationIconProps) => {
    let icon;
    if (fromWebhook && !useUserIcon && enablePostIconOverride) {
        if (overrideIconUrl) {
            const source: ImageSource = {uri: buildAbsoluteUrl(serverUrl, overrideIconUrl)};
            icon = (
                <ExpoImage
                    id={`user-override-icon-${urlSafeBase64Encode(overrideIconUrl)}`}
                    source={source}
                    style={styles.icon}
                />
            );
        } else {
            icon = (
                <CompassIcon
                    name='webhook'
                    style={styles.icon}
                />
            );
        }
    } else if (author) {
        const pictureUrl = buildProfileImageUrlFromUser(serverUrl, author);
        const lastPictureUpdateAt = getLastPictureUpdate(author);
        icon = (
            <ExpoImage
                id={`user-${author.id}-${lastPictureUpdateAt}`}
                key={pictureUrl}
                style={{width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: (IMAGE_SIZE / 2)}}
                source={{uri: buildAbsoluteUrl(serverUrl, pictureUrl)}}
            />
        );
    } else {
        icon = (
            <ExpoImage
                cachePolicy='memory'
                source={logo}
                style={styles.icon}
            />
        );
    }

    return (
        <View testID='in_app_notification.icon'>
            {icon}
        </View>
    );
};

const enhanced = withObservables([], ({database, senderId}: WithDatabaseArgs & {senderId: string}) => {
    const author = observeUser(database, senderId);

    return {
        author,
        enablePostIconOverride: observeConfigBooleanValue(database, 'EnablePostIconOverride'),
    };
});

export default enhanced(NotificationIcon);
