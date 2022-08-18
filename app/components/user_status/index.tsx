// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import {General} from '@constants';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

type UserStatusProps = {
    size?: number;
    status?: string;
};

const UserStatus = ({size = 6, status = General.OFFLINE}: UserStatusProps) => {
    const theme = useTheme();
    let iconName;
    let iconColor;
    switch (status) {
        case General.AWAY:
            iconName = 'clock';
            iconColor = theme.awayIndicator;
            break;
        case General.DND:
            iconName = 'minus-circle';
            iconColor = theme.dndIndicator;
            break;
        case General.ONLINE:
            iconName = 'check-circle';
            iconColor = theme.onlineIndicator;
            break;
        default:
            iconName = 'circle-outline';
            iconColor = changeOpacity('#B8B8B8', 0.64);
            break;
    }

    return (
        <CompassIcon
            name={iconName}
            style={{fontSize: size, color: iconColor}}
            testID={`user_status.indicator.${status}`}
        />
    );
};

export default UserStatus;
