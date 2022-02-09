// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity} from 'react-native';

import {Client} from '@client/rest';
import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import NetworkManager from '@init/network_manager';
import PanelItem from '@screens/edit_profile/components/panel_item';
import {bottomSheet} from '@screens/navigation';
import PickerUtil from '@utils/file/file_picker';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

const hitSlop = {top: 100, bottom: 20, right: 20, left: 100};
const ACTION_HEIGHT = 55;

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        touchable: {
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.centerChannelBg,
            borderRadius: 18,
            height: 36,
            width: 36,
            position: 'absolute',
            bottom: 0,
            right: 0,
            backgroundColor: theme.centerChannelBg,
        },
    };
});

type ImagePickerProps = {
    onRemoveProfileImage: UploadExtractedFile;
    uploadFiles: UploadExtractedFile;
    user: UserModel;
};

const hasPictureUrl = (user: UserModel, serverUrl: string) => {
    const {id, lastPictureUpdate} = user;

    let client: Client | undefined;
    let profileImageUrl: string | undefined;

    try {
        client = NetworkManager.getClient(serverUrl);
        profileImageUrl = client.getProfilePictureUrl(id, lastPictureUpdate);
    } catch {
        return false;
    }

    // Check if image url includes query string for timestamp. If so,
    // it means the image has been updated from the default, i.e. '.../image?_=1544159746868'
    return Boolean(profileImageUrl?.includes('image?_'));
};

const ProfileImagePicker = ({
    onRemoveProfileImage,
    uploadFiles,
    user,
}: ImagePickerProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const pictureUtils = useMemo(() => new PickerUtil(intl, uploadFiles), [uploadFiles, intl]);
    const canRemovePicture = hasPictureUrl(user, serverUrl);
    const styles = getStyleSheet(theme);

    const showFileAttachmentOptions = useCallback(preventDoubleTap(() => {
        const renderContent = () => {
            return (
                <>
                    <PanelItem
                        pickerAction='takePhoto'
                        pictureUtils={pictureUtils}
                    />
                    <PanelItem
                        pickerAction='browsePhotoLibrary'
                        pictureUtils={pictureUtils}
                    />
                    <PanelItem
                        pickerAction='browseFiles'
                        pictureUtils={pictureUtils}

                    />
                    {canRemovePicture && (
                        <PanelItem
                            pickerAction='removeProfilePicture'
                            onRemoveProfileImage={onRemoveProfileImage}
                        />
                    )}
                </>
            );
        };

        const snapPoints = canRemovePicture ? 5 : 4;

        return bottomSheet({
            closeButtonId: 'close-edit-profile',
            renderContent,
            snapPoints: [(snapPoints * ACTION_HEIGHT), 10],
            title: '',
            theme,
        });
    }), [canRemovePicture, onRemoveProfileImage, pictureUtils, theme]);

    return (
        <TouchableOpacity
            onPress={showFileAttachmentOptions}
            hitSlop={hitSlop}
            style={styles.touchable}
        >
            <CompassIcon
                name='camera-outline'
                size={24}
                color={changeOpacity(theme.centerChannelColor, 0.6)}
            />
        </TouchableOpacity>

    );
};

export default ProfileImagePicker;
