// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react';
import {Platform, View} from 'react-native';

import {Client} from '@client/rest';
import UserProfileImage from '@components/user_profile_picture/image';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import NetworkManager from '@init/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type ProfilePictureProps = {
    edit: boolean;
    imageUri?: string;
    profileImageRemove?: boolean;
    profileImageUri?: string;
    size?: number;
    author: UserModel;
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

const ProfilePicture = ({
    author,
    edit = false,
    imageUri,
    profileImageRemove,
    profileImageUri,
    size = 128,
    testID,
}: ProfilePictureProps) => {
    const [pictureUrl, setPictureUrl] = useState<string|undefined>();
    const theme = useTheme();
    const serverUrl = useServerUrl();

    const style = getStyleSheet(theme);
    let client: Client | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // does nothing
    }

    useEffect(() => {
        if (profileImageUri) {
            setPictureUrl(profileImageUri);
        } else if (edit && imageUri) {
            setPictureUrl(imageUri);
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
        const url = author && client ? client.getProfilePictureUrl(author.id, author.lastPictureUpdate) : undefined;
        if (url !== pictureUrl && !edit) {
            setPictureUrl(url);
        }
    }, [author, edit]);

    let source = null;
    if (pictureUrl) {
        let prefix = '';
        if (Platform.OS === 'android' &&
            !pictureUrl.startsWith('content://') &&
            !pictureUrl.startsWith('http://') &&
            !pictureUrl.startsWith('https://')
        ) {
            prefix = 'file://';
        }

        if (pictureUrl.includes('api')) {
            prefix = serverUrl;
        }

        source = {
            uri: `${prefix}${pictureUrl}`,
        };
    }

    return (
        <View
            style={[
                style.container,
                {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                    height: size,
                    width: size,
                },
            ]}
            testID={`${testID}.${author?.id}`}
        >
            <UserProfileImage
                imageUrl={pictureUrl}
                lastPictureUpdate={author.lastPictureUpdate}
                size={size}
                source={source || undefined}
                userId={author.id}
            />
        </View>
    );
};

export default ProfilePicture;
