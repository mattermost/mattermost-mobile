// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useMemo} from 'react';
import {Platform, StyleProp, View, ViewStyle} from 'react-native';

import {fetchStatusInBatch} from '@actions/remote/user';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

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
    forwardRef?: React.RefObject<any>;
    iconSize?: number;
    showStatus?: boolean;
    size: number;
    statusSize?: number;
    statusStyle?: StyleProp<ViewStyle>;
    testID?: string;
    source?: Source | string;
    url?: string;
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

const ProfilePicture = ({
    author,
    forwardRef,
    iconSize,
    showStatus = true,
    size = 64,
    statusSize = 14,
    statusStyle,
    testID,
    source,
    url,
}: ProfilePictureProps) => {
    const theme = useTheme();
    let serverUrl = useServerUrl();
    serverUrl = url || serverUrl;

    const style = getStyleSheet(theme);
    const buffer = showStatus ? STATUS_BUFFER || 0 : 0;
    const isBot = author && (('isBot' in author) ? author.isBot : author.is_bot);

    useEffect(() => {
        if (!isBot && author && !author.status && showStatus) {
            fetchStatusInBatch(serverUrl, author.id);
        }
    }, []);

    const containerStyle = useMemo(() => {
        if (author) {
            return {
                width: size + (buffer - 1),
                height: size + (buffer - 1),
                borderRadius: (size + buffer) / 2,
            };
        }

        return {
            ...style.container,
            width: size + buffer,
            height: size + buffer,
            borderRadius: (size + buffer) / 2,
        };
    }, [author, size]);

    return (
        <View
            style={containerStyle}
            testID={testID}
        >
            <Image
                author={author}
                forwardRef={forwardRef}
                iconSize={iconSize}
                size={size}
                source={source}
                url={serverUrl}
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
