// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View} from 'react-native';
import DocumentPicker from 'react-native-document-picker';

import ProfilePictureButton from '@components/profile_picture_button';
import ProfilePicture from '@components/your_picture';
import {useTheme} from '@context/theme';
import {MAX_SIZE, VALID_MIME_TYPES} from '@screens/edit_profile/constants';
import UserModel from '@typings/database/models/servers/user';
import {makeStyleSheetFromTheme} from '@utils/theme';

type UserProfilePictureProps = {
    currentUser: UserModel;
    profilePictureDisabled: boolean;
    profileImage: any;
    profileImageRemove: boolean;
}

//fixme: the ProfilePicture component is not 100% ported.
const UserProfilePicture = ({currentUser, profilePictureDisabled, profileImage, profileImageRemove}: UserProfilePictureProps) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);

    const profilePicture = (
        <ProfilePicture
            author={currentUser}
            iconSize={104}
            size={153}
            statusSize={36}
            testID='edit_profile.profile_picture'

            // edit={!profilePictureDisabled} // to port again
            // imageUri={profileImage ? profileImage.uri : null}
            // isProfileImageRemoved={isProfileImageRemoved}
            // statusBorderWidth={6}

        />
    );

    if (profilePictureDisabled) {
        return (
            <View style={style.top}>
                {profilePicture}
            </View>
        );
    }

    return (
        <View style={style.top}>
            <ProfilePictureButton
                currentUser={currentUser}
                theme={theme}
                browseFileTypes={DocumentPicker.types.images}
                canTakeVideo={false}
                canBrowseVideoLibrary={false}
                maxFileSize={MAX_SIZE}
                wrapper={true}
                uploadFiles={this.handleUploadProfileImage}
                removeProfileImage={this.handleRemoveProfileImage}
                onShowFileSizeWarning={this.onShowFileSizeWarning}
                onShowUnsupportedMimeTypeWarning={this.onShowUnsupportedMimeTypeWarning}
                validMimeTypes={VALID_MIME_TYPES}
            >
                {profilePicture}
            </ProfilePictureButton>
        </View>
    );
};

const getStyleSheet = makeStyleSheetFromTheme(() => {
    return {
        top: {
            padding: 25,
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});

export default UserProfilePicture;
