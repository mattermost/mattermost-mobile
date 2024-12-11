// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {useIntl} from 'react-intl';
import {TouchableOpacity} from 'react-native';

import {buildProfileImageUrlFromUser} from '@actions/remote/user';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import PanelItem from '@screens/edit_profile/components/panel_item';
import {bottomSheet} from '@screens/navigation';
import PickerUtil from '@utils/file/file_picker';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {preventDoubleTap} from '@utils/tap';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type UserModel from '@typings/database/models/servers/user';

const hitSlop = {top: 100, bottom: 20, right: 20, left: 100};

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
        title: {
            ...typography('Heading', 600, 'SemiBold'),
            color: theme.centerChannelColor,
            marginBottom: 8,
        },
    };
});

type ImagePickerProps = {
    onRemoveProfileImage: UploadExtractedFile;
    uploadFiles: UploadExtractedFile;
    user: UserModel;
};

const hasPictureUrl = (user: UserModel, serverUrl: string) => {
    // Check if image url includes query string for timestamp. If so,
    // it means the image has been updated from the default, i.e. '.../image?_=1544159746868'
    return buildProfileImageUrlFromUser(serverUrl, user).includes('image?_');
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
    const isTablet = useIsTablet();

    const showFileAttachmentOptions = useCallback(preventDoubleTap(() => {
        const renderContent = () => {
            return (
                <>
                    {!isTablet &&
                        <FormattedText
                            id='user.edit_profile.profile_photo.change_photo'
                            defaultMessage='Change profile photo'
                            style={styles.title}
                        />
                    }
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

        const snapPoint = bottomSheetSnapPoint(4, ITEM_HEIGHT) + TITLE_HEIGHT;

        return bottomSheet({
            closeButtonId: 'close-edit-profile',
            renderContent,
            snapPoints: [1, snapPoint],
            title: 'Change profile photo',
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
