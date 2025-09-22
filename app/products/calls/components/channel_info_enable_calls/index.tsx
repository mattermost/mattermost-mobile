// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import {enableChannelCalls} from '@calls/actions';
import {useTryCallsFunction} from '@calls/hooks';
import {getCallsConfig} from '@calls/state';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {usePreventDoubleTap} from '@hooks/utils';

interface Props {
    channelId: string;
    enabled: boolean;
}

const ChannelInfoEnableCalls = ({channelId, enabled}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();

    const toggleCalls = useCallback(async () => {
        enableChannelCalls(serverUrl, channelId, !enabled);
    }, [serverUrl, channelId, enabled]);

    const [tryOnPress, msgPostfix] = useTryCallsFunction(toggleCalls);

    const disableText = formatMessage({id: 'mobile.calls_disable', defaultMessage: 'Disable calls'});
    const enableText = formatMessage({id: 'mobile.calls_enable', defaultMessage: 'Enable calls'});

    const config = getCallsConfig(serverUrl);
    if (!config.pluginEnabled) {
        return null;
    }

    const onPress = usePreventDoubleTap(tryOnPress);

    return (
        <OptionItem
            action={onPress}
            label={(enabled ? disableText : enableText) + msgPostfix}
            icon='phone'
            type='default'
            testID='channel_info.options.enable_disable_calls.option'
        />
    );
};

export default ChannelInfoEnableCalls;
