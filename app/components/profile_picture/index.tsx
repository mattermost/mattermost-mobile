// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {PixelRatio, Platform, StyleProp, StyleSheet, View, ViewProps} from 'react-native';

import {fetchStatusInBatch} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';

import Image from './image';
import Status from './status';

import type UserModel from '@typings/database/models/servers/user';
import type {Source} from 'react-native-fast-image';

const STATUS_BUFFER = Platform.select({
    ios: 3,
    android: 2,
});

type ProfilePictureProps = {
    author?: UserModel | UserProfile;
    iconSize?: number;
    showStatus?: boolean;
    size: number;
    statusSize?: number;
    statusStyle?: StyleProp<ViewProps>;
    testID?: string;
    source?: Source | string;
    scaleWithText?: boolean;
};

const style = StyleSheet.create({
    container: {
        justifyContent: 'center',
        alignItems: 'center',
    },
});

const ProfilePicture = ({
    author,
    iconSize,
    showStatus = true,
    size = 64,
    statusSize = 14,
    statusStyle,
    testID,
    source,
    scaleWithText,
}: ProfilePictureProps) => {
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const buffer = showStatus ? STATUS_BUFFER || 0 : 0;
    const isBot = author && (('isBot' in author) ? author.isBot : author.is_bot);

    const fontScale = scaleWithText ? PixelRatio.getFontScale() : 1;
    const scaledSize = size * fontScale;
    const scaledIconSize = (iconSize || size) * fontScale;
    const scaledBuffer = buffer * fontScale;

    useEffect(() => {
        if (!isBot && author && !author.status && showStatus) {
            fetchStatusInBatch(serverUrl, author.id);
        }
    }, []);

    const containerStyle = useMemo(() => {
        if (author) {
            return {
                width: scaledSize + (buffer - 1),
                height: scaledSize + (buffer - 1),
                borderRadius: (scaledSize + buffer) / 2,
            };
        }

        return {
            ...style.container,
            width: scaledSize + scaledBuffer,
            height: scaledSize + scaledBuffer,
            borderRadius: (scaledSize + scaledBuffer) / 2,
        };
    }, [author, scaledSize]);

    return (
        <View
            style={containerStyle}
            testID={`${testID}.${author?.id}`}
        >
            <Image
                author={author}
                iconSize={scaledIconSize}
                size={scaledSize}
                source={source}
            />
            {showStatus && !isBot &&
            <Status
                author={author}
                statusSize={statusSize}
                statusStyle={statusStyle}
                theme={theme}
            />
            }
        </View>
    );
};

export default ProfilePicture;
