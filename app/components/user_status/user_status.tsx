// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import {General} from '@mm-redux/constants';
import {changeOpacity} from '@utils/theme';

import type {Theme} from '@mm-redux/types/preferences';

type UserStatusProps = {
    size: number;
    status: string;
    theme: Theme;
};

const UserStatus = ({size, status, theme}: UserStatusProps) => {
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
            testID={`user_status.icon.${status}`}
        />
    );
};

UserStatus.defaultProps = {
    size: 6,
    status: General.OFFLINE,
};

export default UserStatus;
