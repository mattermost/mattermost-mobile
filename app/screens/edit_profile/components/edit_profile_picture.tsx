// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo, useState} from 'react';
import {Platform, View} from 'react-native';

import ProfileImage from '@components/profile_picture';
import {ACCOUNT_OUTLINE_IMAGE} from '@constants/profile';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import NetworkManager from '@managers/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ProfileImagePicker from './profile_image_picker';

import type {Client} from '@client/rest';
import type UserModel from '@typings/database/models/servers/user';

type ChangeProfilePictureProps = {
    user: UserModel;
    onUpdateProfilePicture: (info: { localPath?: string; isRemoved?: boolean }) => void;
};

const SIZE = 128;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            alignItems: 'center',
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            borderRadius: SIZE / 2,
            height: SIZE,
            justifyContent: 'center',
            width: SIZE,
        },
        camera: {
            position: 'absolute',
            overflow: 'hidden',
            height: '100%',
            width: '100%',
        },
    };
});

const EditProfilePicture = ({user, onUpdateProfilePicture}: ChangeProfilePictureProps) => {
    const serverUrl = useServerUrl();
    const theme = useTheme();

    let client: Client | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // does nothing
    }

    const [pictureUrl, setPictureUrl] = useState<string|undefined>(client?.getProfilePictureUrl(user.id, user.lastPictureUpdate));

    const styles = getStyleSheet(theme);

    useDidUpdate(() => {
        const url = user.id && client ? client.getProfilePictureUrl(user.id, user.lastPictureUpdate) : undefined;
        if (url !== pictureUrl) {
            setPictureUrl(url);
        }
    }, [user.id, user.lastPictureUpdate]);

    const handleProfileImage = useCallback((images?: FileInfo[]) => {
        let isRemoved = true;
        let localPath;
        let pUrl = ACCOUNT_OUTLINE_IMAGE;

        const newImage = images?.[0]?.localPath;
        if (newImage) {
            isRemoved = false;
            localPath = newImage;
            pUrl = newImage;
        }

        setPictureUrl(pUrl);
        onUpdateProfilePicture({isRemoved, localPath});
    }, [onUpdateProfilePicture]);

    const pictureSource = useMemo(() => {
        if (pictureUrl === ACCOUNT_OUTLINE_IMAGE) {
            return pictureUrl;
        } else if (pictureUrl) {
            let prefix = '';
            if (pictureUrl.includes('/api/')) {
                prefix = serverUrl;
            } else if (Platform.OS === 'android' && !pictureUrl.startsWith('content://') && !pictureUrl.startsWith('http://') && !pictureUrl.startsWith('https://')) {
                prefix = 'file://';
            }

            return {
                uri: `${prefix}${pictureUrl}`,
            };
        }
        return undefined;
    }, [pictureUrl]);

    return (
        <View
            style={styles.container}
            testID={`edit_profile.${user.id}.profile_picture`}
        >
            <ProfileImage
                size={SIZE}
                source={pictureSource}
                author={user}
                showStatus={false}
            />
            <View
                style={styles.camera}
            >
                <ProfileImagePicker
                    onRemoveProfileImage={handleProfileImage}
                    uploadFiles={handleProfileImage}
                    user={user}
                />
            </View>
        </View>
    );
};

export default EditProfilePicture;
