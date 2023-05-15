// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, View, type ViewStyle} from 'react-native';

import ProfilePicture from '@components/profile_picture/image';

import type UserModel from '@typings/database/models/servers/user';

export type Props = {
    style: StyleProp<ViewStyle>;
    user: UserModel;
};

const UserAvatar = ({style, user}: Props) => {
    return (
        <View
            key={user.id}
            style={style}
        >
            <ProfilePicture
                author={user}
                size={24}
            />
        </View>
    );
};

export default UserAvatar;
