// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import {enableChannelCalls} from '@calls/actions';
import {useCallsEnabled, useTryCallsFunction} from '@calls/hooks';
import OptionItem from '@components/option_item';
import {useServerUrl} from '@context/server';
import {preventDoubleTap} from '@utils/tap';

interface Props {
    channelId: string;
}

const EnableDisableCallsOption = ({channelId}: Props) => {
    const {formatMessage} = useIntl();
    const serverUrl = useServerUrl();
    const enabled = useCallsEnabled(channelId);

    const toggleCalls = async () => {
        enableChannelCalls(serverUrl, channelId, !enabled);
    };

    const [tryOnPress, msgPostfix] = useTryCallsFunction(toggleCalls);

    const disableText = formatMessage({id: 'mobile.calls_disable', defaultMessage: 'Disable Calls'});
    const enableText = formatMessage({id: 'mobile.calls_enable', defaultMessage: 'Enable Calls'});

    return (
        <OptionItem
            action={preventDoubleTap(tryOnPress)}
            label={(enabled ? disableText : enableText) + msgPostfix}
            icon='phone-outline'
            type='default'
            testID='channel_info.options.enable_disable_calls.option'
        />
    );
};

export default EnableDisableCallsOption;
