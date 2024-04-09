// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity} from 'react-native';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

type Props = {
    collapse: () => void;
};

const hitSlop = {top: 10, bottom: 10, left: 10, right: 10};

const CloseButton = ({collapse}: Props) => {
    const theme = useTheme();
    return (
        <TouchableOpacity
            hitSlop={hitSlop}
            onPress={collapse}
        >
            <CompassIcon
                name='close'
                size={24}
                color={changeOpacity(theme.centerChannelColor, 0.56)}
            />
        </TouchableOpacity>
    );
};

export default CloseButton;
