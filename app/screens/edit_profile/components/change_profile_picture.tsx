// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Platform, View} from 'react-native';
import DocumentPicker from 'react-native-document-picker';

import {Client} from '@client/rest';
import ImagePicker from '@components/image_picker';
import ProfileImage from '@components/profile_picture';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useDidUpdate from '@hooks/did_update';
import NetworkManager from '@init/network_manager';
import UserModel from '@typings/database/models/servers/user';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type ChangeProfilePictureProps = {
    user: UserModel;
    onUpdatedProfilePicture: (info: { localPath?: string; isRemoved?: boolean }) => void;
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
            bottom: 0,
            right: 0,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: theme.centerChannelBg,
            borderRadius: 36 / 2,
            height: 36,
            width: 36,
        },
    };
});

const ChangeProfilePicture = ({user, onUpdatedProfilePicture}: ChangeProfilePictureProps) => {
    const [pictureUrl, setPictureUrl] = useState<string|undefined>();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const userId = useMemo(() => user.id, [user]);
    const styles = getStyleSheet(theme);
    let client: Client | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        // does nothing
    }

    useEffect(() => {
        // sets initial picture url
        setPictureUrl(client?.getProfilePictureUrl(userId, user.lastPictureUpdate));
    }, []);

    useDidUpdate(() => {
        const url = userId && client ? client.getProfilePictureUrl(userId, user.lastPictureUpdate) : undefined;
        if (url !== pictureUrl) {
            setPictureUrl(url);
        }
    }, [userId, user.lastPictureUpdate]);

    const handleUploadProfileImage = useCallback((images: FileInfo[]) => {
        //fixme: review this part properly
        const newImage = images?.[0]?.localPath;
        if (newImage) {
            setPictureUrl(newImage);
            onUpdatedProfilePicture({isRemoved: false, localPath: newImage});
        }
    }, []);

    const handleRemoveProfileImage = useCallback(() => {
        setPictureUrl(undefined);
        onUpdatedProfilePicture({isRemoved: true, localPath: undefined},
        );
    }, []);

    let source;

    if (pictureUrl) {
        let prefix = '';
        if (Platform.OS === 'android' &&
            !pictureUrl.startsWith('content://') &&
            !pictureUrl.startsWith('http://') &&
            !pictureUrl.startsWith('https://')
        ) {
            prefix = 'file://';
        }

        if (pictureUrl.includes('/api/')) {
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
                {
                    backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
                    height: SIZE,
                    width: SIZE,
                    borderRadius: SIZE / 2,
                },
            ]}
            testID={`${ChangeProfilePicture}.${userId}`}
        >
            {source && (
                <ProfileImage
                    size={SIZE}
                    source={source}
                    author={user}
                    showStatus={false}
                />)
            }
            <View
                style={styles.camera}
            >
                <ImagePicker
                    browseFileType={DocumentPicker.types.images}
                    onRemoveProfileImage={handleRemoveProfileImage}
                    uploadFiles={handleUploadProfileImage}
                    user={user}
                />
            </View>
        </View>
    );
};

export default ChangeProfilePicture;
