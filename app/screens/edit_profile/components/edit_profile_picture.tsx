// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';
import {DeviceEventEmitter, Platform, View} from 'react-native';

import {Client} from '@client/rest';
import ProfileImage from '@components/profile_picture';
import {Navigation} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import NetworkManager from '@init/network_manager';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import ImagePicker from './image_picker';

import type UserModel from '@typings/database/models/servers/user';

type ChangeProfilePictureProps = {
    user: UserModel;
    onUpdateProfilePicture: (info: { localPath?: string; isRemoved?: boolean }) => void;
};

const SIZE = 128;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            justifyContent: 'center',
            alignItems: 'center',
        },
        camera: {
            position: 'absolute',
            overflow: 'hidden',
            height: '100%',
            width: '100%',
        },
        subContainer: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
            height: SIZE,
            width: SIZE,
            borderRadius: SIZE / 2,
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
        let pUrl = 'account-outline';

        const newImage = images?.[0]?.localPath;
        if (newImage) {
            isRemoved = false;
            localPath = newImage;
            pUrl = newImage;
        } else {
            DeviceEventEmitter.emit(Navigation.NAVIGATION_CLOSE_MODAL);
        }

        setPictureUrl(pUrl);
        onUpdateProfilePicture({isRemoved, localPath});
    }, [onUpdateProfilePicture]);

    let source;

    if (pictureUrl === 'account-outline') {
        source = pictureUrl;
    } else if (pictureUrl) {
        let prefix = '';
        if (Platform.OS === 'android' && !pictureUrl.startsWith('content://') && !pictureUrl.startsWith('http://') && !pictureUrl.startsWith('https://')) {
            prefix = 'file://';
        } else if (pictureUrl.includes('/api/')) {
            prefix = serverUrl;
        }

        source = {
            uri: `${prefix}${pictureUrl}`,
        };
    }

    return (
        <View
            style={[
                styles.container,
                styles.subContainer,
            ]}
            testID={`${EditProfilePicture}.${user.id}`}
        >
            <ProfileImage
                size={SIZE}
                source={source}
                author={user}
                showStatus={false}
            />
            <View
                style={styles.camera}
            >
                <ImagePicker
                    onRemoveProfileImage={handleProfileImage}
                    uploadFiles={handleProfileImage}
                    user={user}
                />
            </View>
        </View>
    );
};

export default EditProfilePicture;
