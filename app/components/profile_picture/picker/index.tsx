// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Platform, StyleSheet} from 'react-native';

import CompassIcon from '@components/compass_icon';
import ProfilePictureUtils from '@components/profile_picture/picker/utils';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server_url';
import {useTheme} from '@context/theme';
import {bottomSheet} from '@screens/navigation';
import UserModel from '@typings/database/models/servers/user';
import {changeOpacity} from '@utils/theme';

import type {File} from '@typings/screens/edit_profile';

type ProfilePictureButtonProps = {
    browseFileType?: string;
    canBrowseFiles?: boolean;
    canBrowsePhotoLibrary?: boolean;
    canTakePhoto?: boolean;
    children?: React.ReactNode;
    user: UserModel;
    maxFileSize: number;
    onShowFileSizeWarning: (fileName: string) => void;
    onShowUnsupportedMimeTypeWarning: () => void;
    onRemoveProfileImage: () => void;
    uploadFiles: (files: File[]) => void;
    wrapper: boolean;
};

const style = StyleSheet.create({
    attachIcon: {
        marginTop: Platform.select({
            ios: 2,
            android: -5,
        }),
    },
    buttonContainer: {
        height: Platform.select({
            ios: 34,
            android: 36,
        }),
        width: 45,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

//fixme: replace anonymous function with callback function
const ImagePicker = ({
    browseFileType,
    canBrowseFiles = true,
    canBrowsePhotoLibrary = true,
    canTakePhoto = true,
    children,
    user,
    maxFileSize,
    onShowFileSizeWarning,
    onShowUnsupportedMimeTypeWarning,
    onRemoveProfileImage,
    uploadFiles,
    wrapper,
}: ProfilePictureButtonProps) => {
    const intl = useIntl();
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const pictureUtils = useMemo(
        () =>
            new ProfilePictureUtils(
                intl,
                maxFileSize,
                onShowFileSizeWarning,
                onShowUnsupportedMimeTypeWarning,
                uploadFiles,
            ),
        [],
    );

    const showFileAttachmentOptions = () => {
        const removeImageOption = pictureUtils.getRemoveProfileImageOption(user, serverUrl, onRemoveProfileImage);

        const renderContent = () => {
            const onBrowsePhotoLibrary = async () => pictureUtils.attachFileFromLibrary;
            const onTakePhoto = async () => pictureUtils.attachFileFromCamera;

            return (
                <>
                    {canTakePhoto && (
                        <SlideUpPanelItem
                            icon='camera-outline'
                            onPress={onTakePhoto}
                            testID='attachment.canTakePhoto'
                            text={intl.formatMessage({
                                id: 'mobile.file_upload.camera_photo',
                                defaultMessage: 'Take Photo',
                            })}
                        />
                    )}

                    {canBrowsePhotoLibrary && (
                        <SlideUpPanelItem
                            icon='file-generic-outline'
                            onPress={onBrowsePhotoLibrary}
                            testID='attachment.canBrowsePhotoLibrary'
                            text={intl.formatMessage({
                                id: 'mobile.file_upload.library',
                                defaultMessage: 'Photo Library',
                            })}
                        />
                    )}

                    {canBrowseFiles && (
                        <SlideUpPanelItem
                            icon='file-multiple-outline'
                            onPress={() => pictureUtils.attachFileFromFiles(intl, browseFileType)}
                            testID='attachment.canBrowseFiles'
                            text={intl.formatMessage({
                                id: 'mobile.file_upload.browse',
                                defaultMessage: 'Browse Files',
                            })}
                        />
                    )}

                    {removeImageOption && (
                        <SlideUpPanelItem
                            destructive={true}
                            icon={removeImageOption.icon}
                            onPress={removeImageOption.action}
                            testID='attachment.removeImage'
                            text={intl.formatMessage({
                                id: removeImageOption.text.id,
                                defaultMessage: removeImageOption.text.defaultMessage,
                            })}
                        />
                    )}
                </>
            );
        };

        return bottomSheet({
            closeButtonId: 'close-edit-profile',
            renderContent,
            snapPoints: [(5 * ITEM_HEIGHT) + 10, 10],
            title: '',
            theme,
        });
    };

    if (wrapper) {
        return (
            <TouchableWithFeedback
                onPress={showFileAttachmentOptions}
                type={'opacity'}
            >
                {children}
            </TouchableWithFeedback>
        );
    }

    return (
        <TouchableWithFeedback
            onPress={showFileAttachmentOptions}
            style={style.buttonContainer}
            type={'opacity'}
        >
            <CompassIcon
                size={30}
                style={style.attachIcon}
                color={changeOpacity(theme.centerChannelColor, 0.9)}
                name='plus'
            />
        </TouchableWithFeedback>
    );
};

export default ImagePicker;
