// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import {View as ViewConstants} from '@constants';

type Props = {
    theme: Theme;
}

const SystemAvatar = ({theme}: Props) => {
    return (
        <CompassIcon
            name='mattermost'
            color={theme.centerChannelColor}
            size={ViewConstants.PROFILE_PICTURE_SIZE}
        />
    );
};

export default SystemAvatar;
