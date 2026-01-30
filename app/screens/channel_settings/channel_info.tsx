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

const ChannelInfoOption = ({channelId}: Props) => {
    const {formatMessage} = useIntl();
    const title = formatMessage({id: 'screens.channel_info', defaultMessage: 'Channel info'});

    const goToChannelInfo = usePreventDoubleTap(useCallback(async () => {
        goToScreen(Screens.CREATE_OR_EDIT_CHANNEL, title, {channelId});
    }, [channelId, title]));

    return (
        <OptionItem
            action={goToChannelInfo}
            label={title}
            icon='information-outline'
            type={Platform.select({ios: 'arrow', default: 'default'})}
            testID='channel_settings.channel_info.option'
        />
    );
};

export default ChannelInfoOption;
