// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import UserItem from '@components/user_item';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    users: UserModel[];
};

const style = StyleSheet.create({
    container: {
        paddingLeft: 0,
    },
});

const UsersList = ({users}: Props) => {
    return (
        <>
            {users.map((user) => (
                <UserItem
                    key={user.id}
                    user={user}
                    containerStyle={style.container}
                />
            ))}
        </>
    );
};

export default UsersList;
