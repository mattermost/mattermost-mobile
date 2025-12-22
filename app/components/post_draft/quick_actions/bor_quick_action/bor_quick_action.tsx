// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

import {style} from '../post_priority_action';

type Props = {
    testId?: string;
    postBoRConfig?: PostBoRConfig;
    updatePostBoRStatus: (config: PostBoRConfig) => void;
    defaultBorConfig: PostBoRConfig;
}

export default function BoRQuickAction({testId, defaultBorConfig, postBoRConfig, updatePostBoRStatus}: Props) {
    const theme = useTheme();
    const iconColor = changeOpacity(theme.centerChannelColor, 0.64);

    const toggleEnabled = useCallback(() => {
        const config = {...(postBoRConfig || defaultBorConfig)};
        config.enabled = !config.enabled;
        updatePostBoRStatus(config);
    }, [defaultBorConfig, postBoRConfig, updatePostBoRStatus]);

    return (
        <TouchableWithFeedback
            testID={testId}
            style={style.icon}
            type='opacity'
            onPress={toggleEnabled}
        >
            <CompassIcon
                name={'fire'}
                size={ICON_SIZE}
                color={iconColor}
            />
        </TouchableWithFeedback>
    );
}
