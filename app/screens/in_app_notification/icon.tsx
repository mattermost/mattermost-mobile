// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withObservables} from '@nozbe/watermelondb/react';
import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import FastImage, {type Source} from 'react-native-fast-image';

import CompassIcon from '@components/compass_icon';
import NetworkManager from '@managers/network_manager';
import {observeConfigBooleanValue} from '@queries/servers/system';
import {observeUser} from '@queries/servers/user';

import type {Client} from '@client/rest';
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
    let client: Client | undefined;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // do nothing, client is not set
    }

    let icon;
    if (client && fromWebhook && !useUserIcon && enablePostIconOverride) {
        if (overrideIconUrl) {
            const source: Source = {uri: client.getAbsoluteUrl(overrideIconUrl)};
            icon = (
                <FastImage
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
    } else if (author && client) {
        const pictureUrl = client.getProfilePictureUrl(author.id, author.lastPictureUpdate);
        icon = (
            <FastImage
                key={pictureUrl}
                style={{width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: (IMAGE_SIZE / 2)}}
                source={{uri: `${serverUrl}${pictureUrl}`}}
            />
        );
    } else {
        icon = (
            <Image
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
