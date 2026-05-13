// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@components/option_item';
import {Screens} from '@constants';
import {usePreventDoubleTap} from '@hooks/utils';
import {dismissBottomSheet, navigateToChannelInfoScreen} from '@screens/navigation';

type Props = {
    channelId: string;
}

const ConvertToChannelLabel = ({channelId}: Props) => {
    const {formatMessage} = useIntl();

    const goToConvertToPrivateChannel = usePreventDoubleTap(useCallback(async () => {
        await dismissBottomSheet();
        navigateToChannelInfoScreen(Screens.CONVERT_GM_TO_CHANNEL, {channelId});
    }, [channelId]));

    return (
        <OptionItem
            action={goToConvertToPrivateChannel}
            icon='lock-outline'
            label={formatMessage({id: 'channel_info.convert_gm_to_channel', defaultMessage: 'Convert to a Private Channel'})}
            type='default'
        />
    );
};

export default ConvertToChannelLabel;
