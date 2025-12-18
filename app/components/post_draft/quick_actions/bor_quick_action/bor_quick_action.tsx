// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useState} from 'react';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {changeOpacity} from '@utils/theme';

import {style} from '../post_priority_action';

type Props = {
    testId?: string;
    updatePostBoRStatus: (config: PostBoRConfig) => void;
    borConfig: PostBoRConfig;
}

export default function BoRAction({testId, borConfig, updatePostBoRStatus}: Props) {
    const theme = useTheme();
    const iconColor = changeOpacity(theme.centerChannelColor, 0.64);

    const [config, setConfig] = useState<PostBoRConfig>(borConfig);

    const toggleEnabled = useCallback(() => {
        const newConfig = {
            ...config,
            enabled: !config.enabled,
        };

        console.log({newConfig});

        setConfig(newConfig);
        updatePostBoRStatus(newConfig);
    }, [config, updatePostBoRStatus]);

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
