// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import {Theme} from '@mm-redux/types/theme';
import ChannelInfoRow from '@screens/channel_info/channel_info_row';
import Separator from '@screens/channel_info/separator';
import {t} from '@utils/i18n';
import {preventDoubleTap} from '@utils/tap';

type Props = {
    testID?: string;
    theme: Theme;
    onPress: (channelId: string) => void;
    canEnableDisableCalls: boolean;
    enabled: boolean;
}

const EnableDisableCalls = (props: Props) => {
    const {testID, canEnableDisableCalls, theme, onPress, enabled} = props;

    const handleEnableDisableCalls = useCallback(preventDoubleTap(onPress), [onPress]);

    if (!canEnableDisableCalls) {
        return null;
    }

    return (
        <>
            <Separator theme={theme}/>
            <ChannelInfoRow
                testID={testID}
                action={handleEnableDisableCalls}
                defaultMessage={enabled ? 'Disable Calls' : 'Enable Calls'}
                icon='phone-outline'
                textId={enabled ? t('mobile.channel_info.disable_calls') : t('mobile.channel_info.enable_calls')}
                theme={theme}
                rightArrow={false}
            />
        </>
    );
};

export default EnableDisableCalls;
