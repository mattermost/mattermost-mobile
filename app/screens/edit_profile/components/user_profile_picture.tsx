// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ProfilePicture from '@components/profile_picture';
import {USER_PROFILE_PICTURE_SIZE} from '@constants/profile';

import EditProfilePicture from './edit_profile_picture';

import type UserModel from '@typings/database/models/servers/user';
import type {NewProfileImage} from '@typings/screens/edit_profile';

type Props = {
    currentUser: UserModel;
    lockedPicture: boolean;
    onUpdateProfilePicture: (newProfileImage: NewProfileImage) => void;
}

const UserProfilePicture = ({currentUser, lockedPicture, onUpdateProfilePicture}: Props) => {
    if (lockedPicture) {
        return (
            <ProfilePicture
                author={currentUser}
                size={USER_PROFILE_PICTURE_SIZE}
                showStatus={false}
                testID={`edit_profile.${currentUser.id}.profile_picture`}
            />
        );
    }

    return (
        <EditProfilePicture
            onUpdateProfilePicture={onUpdateProfilePicture}
            user={currentUser}
        />
    );
};

export default UserProfilePicture;
