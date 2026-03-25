// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Platform} from 'react-native';

import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {goToScreen} from '@screens/navigation';
import {changeOpacity} from '@utils/theme';

type Props = {
    channelId: string;
    channelDisplayName: string;
}

const ChannelConfigurationOption = ({channelId, channelDisplayName}: Props) => {
    const {formatMessage} = useIntl();
    const theme = useTheme();

    const goToConfiguration = usePreventDoubleTap(useCallback(() => {
        const title = formatMessage({
            id: 'channel_settings.configuration',
            defaultMessage: 'Configuration',
        });
        goToScreen(Screens.CHANNEL_CONFIGURATION, title, {channelId}, {topBar: {subtitle: {
            text: channelDisplayName,
            color: changeOpacity(theme.sidebarHeaderTextColor, 0.72),
        }}});
    }, [channelId, channelDisplayName, formatMessage, theme.sidebarHeaderTextColor]));

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
