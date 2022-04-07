// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Row from './row';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    currentUserId: string;
    teammateNameDisplay: string;
    theme: Theme;
    users: UserModel[];
}

const UsersList = ({currentUserId, teammateNameDisplay, theme, users}: Props) => {
    return (
        <>
            {users.map((user) => (
                <Row
                    currentUserId={currentUserId}
                    key={user.id}
                    teammateNameDisplay={teammateNameDisplay}
                    theme={theme}
                    user={user}
                />
            ))}
        </>
    );
};

export default UsersList;
