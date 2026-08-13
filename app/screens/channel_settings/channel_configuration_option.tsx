// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {usePreventDoubleTap} from '@hooks/utils';
import {navigateToChannelInfoScreen} from '@screens/navigation';

type Props = {
    channelId: string;
    channelDisplayName: string;
}

const ChannelConfigurationOption = ({channelId, channelDisplayName}: Props) => {
    const {formatMessage} = useIntl();

    const goToConfiguration = usePreventDoubleTap(useCallback(() => {
        navigateToChannelInfoScreen(Screens.CHANNEL_CONFIGURATION, {channelId, subtitle: channelDisplayName});
    }, [channelId, channelDisplayName]));

    return (
        <OptionItem
            action={goToConfiguration}
            label={formatMessage({
                id: 'channel_settings.configuration',
                defaultMessage: 'Configuration',
            })}
            icon='tune'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            testID='channel_settings.configuration.option'
        />
    );
};

export default ChannelConfigurationOption;
