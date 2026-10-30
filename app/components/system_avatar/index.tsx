// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Image} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {View as ViewConstants} from '@constants';
import {isEncmaApp} from '@utils/branding';

type Props = {
    theme: Theme;
}

const SystemAvatar = ({theme}: Props) => {
    if (isEncmaApp) {
        return (
            <Image
                resizeMode='contain'
                source={require('@assets/images/encma-icon.png')}
                style={{
                    height: ViewConstants.PROFILE_PICTURE_SIZE,
                    width: ViewConstants.PROFILE_PICTURE_SIZE,
                }}
                testID='system_avatar.encma_logo'
            />
        );
    }

    return (
        <CompassIcon
            name='mattermost'
            color={theme.centerChannelColor}
            size={ViewConstants.PROFILE_PICTURE_SIZE}
            testID='system_avatar.mattermost_logo'
        />
    );
};

export default SystemAvatar;
