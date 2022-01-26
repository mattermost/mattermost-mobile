// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import PanelItem from '@screens/edit_profile/components/panel_item';
import {bottomSheet} from '@screens/navigation';
import {hasPictureUrl} from '@utils/file';
import PickerUtil from '@utils/file/file_picker';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';
import type {UploadExtractedFile} from '@typings/utils/file';

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

const ImagePicker = ({
    onRemoveProfileImage,
    uploadFiles,
    user,
}: ImagePickerProps) => {
    const theme = useTheme();
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const pictureUtils = useMemo(() => new PickerUtil(intl, uploadFiles), [uploadFiles]);

    const styles = getStyleSheet(theme);

    const showFileAttachmentOptions = preventDoubleTap(() => {
        const canRemovePicture = hasPictureUrl(user, serverUrl);

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
    });

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

export default ImagePicker;
