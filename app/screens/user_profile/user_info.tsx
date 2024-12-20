// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {getUserCustomStatus} from '@utils/user';

import UserProfileCustomStatus from './custom_status';
import CustomAttributes from './custom_attributes';

import type {UserModel} from '@database/models/server';

type Props = {
    localTime?: string;
    showCustomStatus: boolean;
    showLocalTime: boolean;
    showNickname: boolean;
    showPosition: boolean;
    user: UserModel;
    enableCustomAttributes?: boolean;
}

const UserInfo = ({localTime, showCustomStatus, showLocalTime, showNickname, showPosition, user, enableCustomAttributes}: Props) => {
    const customStatus = getUserCustomStatus(user);

    return (
        <>
            {showCustomStatus && <UserProfileCustomStatus customStatus={customStatus!}/>}
            <CustomAttributes
                nickname={showNickname ? user.nickname : undefined}
                position={showPosition ? user.position : undefined}
                localTime={showLocalTime ? localTime : undefined}
                enableCustomAttributes={enableCustomAttributes}
            />
        </>
    );
};

export default UserInfo;
