// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {usePreventDoubleTap} from '@hooks/utils';
import {goToScreen} from '@screens/navigation';

type Props = {
    channelId: string;
}

const ChannelSettings = ({channelId}: Props) => {
    const {formatMessage} = useIntl();
    const title = formatMessage({id: 'channel_info.channel_settings', defaultMessage: 'Channel Settings'});

    const goToChannelSettings = usePreventDoubleTap(useCallback(async () => {
        goToScreen(Screens.CHANNEL_SETTINGS, title, {channelId});
    }, [channelId, title]));

    return (
        <OptionItem
            action={goToChannelSettings}
            label={title}
            icon='settings-outline'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            testID='channel_info.options.channel_settings.option'
        />
    );
};

export default ChannelSettings;

