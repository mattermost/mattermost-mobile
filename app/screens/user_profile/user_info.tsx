// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';

import {getUserCustomStatus} from '@utils/user';

import UserProfileCustomStatus from './custom_status';
import UserProfileLabel from './label';

import type {UserModel} from '@database/models/server';

type Props = {
    localTime?: string;
    showCustomStatus: boolean;
    showLocalTime: boolean;
    showNickname: boolean;
    showPosition: boolean;
    user: UserModel;
}

const UserInfo = ({localTime, showCustomStatus, showLocalTime, showNickname, showPosition, user}: Props) => {
    const {formatMessage} = useIntl();
    const customStatus = getUserCustomStatus(user);

    return (
        <>
            {showCustomStatus && <UserProfileCustomStatus customStatus={customStatus!}/> }
            {showNickname &&
                <UserProfileLabel
                    description={user.nickname}
                    testID='user_profile.nickname'
                    title={formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'})}
                />
            }
            {showPosition &&
                <UserProfileLabel
                    description={user.position}
                    testID='user_profile.position'
                    title={formatMessage({id: 'channel_info.position', defaultMessage: 'Position'})}
                />
            }
            {showLocalTime &&
                <UserProfileLabel
                    description={localTime!}
                    testID='user_profile.local_time'
                    title={formatMessage({id: 'channel_info.local_time', defaultMessage: 'Local Time'})}
                />
            }
        </>
    );
};

export default UserInfo;
