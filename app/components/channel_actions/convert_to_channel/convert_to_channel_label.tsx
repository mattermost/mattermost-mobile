// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';

import OptionItem from '@app/components/option_item';
import {Screens} from '@app/constants';
import {dismissBottomSheet, goToScreen} from '@app/screens/navigation';
import {preventDoubleTap} from '@app/utils/tap';

type Props = {
    channelId: string;
}

const ConvertToChannelLabel = (props: Props) => {
    const goToConvertToPrivateChannl = preventDoubleTap(async () => {
        await dismissBottomSheet();

        const title = 'Convert to Private Channel';
        goToScreen(Screens.CONVERT_GM_TO_CHANNEL, title, {channelId: props.channelId});
    });

    const {formatMessage} = useIntl();
    const label = formatMessage({id: 'channel_info.convert_gm_to_channel', defaultMessage: 'Convert to a Private Channel'});

    return (
        <OptionItem
            action={goToConvertToPrivateChannl}
            icon='lock-outline'
            label={label}
            type='default'
        />
    );
};

export default ConvertToChannelLabel;
