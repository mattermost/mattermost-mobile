// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {StyleSheet} from 'react-native';

import UserItem from '@components/user_item';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    user?: UserModel;
}

const style = StyleSheet.create({
    container: {
        paddingVertical: 0,
        paddingHorizontal: 0,
        paddingTop: 0,
        marginBottom: 8,
    },
});

const Reactor = ({user}: Props) => {
    return (
        <UserItem
            containerStyle={style.container}
            user={user}
        />
    );
};

export default Reactor;
