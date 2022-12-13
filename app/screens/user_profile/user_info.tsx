// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {useIntl} from 'react-intl';

import {UserModel} from '@database/models/server';
import {getUserCustomStatus} from '@utils/user';

import UserProfileCustomStatus from './custom_status';
import UserProfileLabel from './label';

type Props = {
    localTime?: string;
    override: boolean;
    showCustomStatus: boolean;
    user: UserModel;
}

const UserInfo = ({localTime, override, showCustomStatus, user}: Props) => {
    const {formatMessage} = useIntl();
    const customStatus = getUserCustomStatus(user);

    return (
        <>
            {showCustomStatus && <UserProfileCustomStatus customStatus={customStatus!}/> }
            {Boolean(user.nickname) && !override && !user.isBot &&
                <UserProfileLabel
                    description={user.nickname}
                    testID='user_profile.nickname'
                    title={formatMessage({id: 'channel_info.nickname', defaultMessage: 'Nickname'})}
                />
            }
            {Boolean(user.position) && !override && !user.isBot &&
                <UserProfileLabel
                    description={user.position}
                    testID='user_profile.position'
                    title={formatMessage({id: 'channel_info.position', defaultMessage: 'Position'})}
                />
            }
            {Boolean(localTime) && !override && !user.isBot &&
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
