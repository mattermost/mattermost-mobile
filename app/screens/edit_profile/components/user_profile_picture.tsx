// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import ProfilePicture from '@components/profile_picture';
import {NewProfileImage} from '@typings/screens/edit_profile';

import EditProfilePicture from './edit_profile_picture';

import type UserModel from '@typings/database/models/servers/user';

const PROFILE_PICTURE_SIZE = 153;

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
                size={PROFILE_PICTURE_SIZE}
                showStatus={false}
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
