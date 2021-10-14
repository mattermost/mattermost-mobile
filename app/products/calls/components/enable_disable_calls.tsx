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
    currentChannelId: string;
    enableCalls: (channelId: string) => void;
    disableCalls: (channelId: string) => void;
    canEnableDisableCalls: boolean;
    enabled: boolean;
}

const EnableDisableCalls = (props: Props) => {
    const {testID, canEnableDisableCalls, theme, enableCalls, disableCalls, enabled, currentChannelId} = props;

    const handleEnableDisableCalls = useCallback(preventDoubleTap(() => {
        if (enabled) {
            disableCalls(currentChannelId);
        } else {
            enableCalls(currentChannelId);
        }
    }), [enableCalls, disableCalls, enabled, currentChannelId]);

    if (!canEnableDisableCalls) {
        return null;
    }

    return (
        <>
            <Separator theme={theme}/>
            {enabled &&
                <ChannelInfoRow
                    testID={testID}
                    action={handleEnableDisableCalls}
                    defaultMessage='Disable Calls'
                    icon='phone-outline'
                    textId={t('mobile.channel_info.disable_calls')}
                    theme={theme}
                    rightArrow={false}
                />}
            {!enabled &&
                <ChannelInfoRow
                    testID={testID}
                    action={handleEnableDisableCalls}
                    defaultMessage='Enable Calls'
                    icon='phone-outline'
                    textId={t('mobile.channel_info.enable_calls')}
                    theme={theme}
                    rightArrow={false}
                />}
        </>
    );
};

export default EnableDisableCalls;
