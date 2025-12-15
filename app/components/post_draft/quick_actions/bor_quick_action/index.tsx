// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

import {style} from '../post_priority_action';

type Props = {
    testId?: string;
}

export default function BoRAction({testId}: Props) {
    const theme = useTheme();
    const iconColor = changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={testId}
            style={style.icon}
            type='opacity'
        >
            <CompassIcon
                name={'fire'}
                size={ICON_SIZE}
                color={iconColor}
            />
        </TouchableWithFeedback>
    );
}
