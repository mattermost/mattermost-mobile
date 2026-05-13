// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ConvertGMToChannelScreen from '@screens/convert_gm_to_channel';

type ConvertGMToChannelProps = {
    channelId: string;
}

export default function ConvertGMToChannelRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const {channelId} = usePropsFromParams<ConvertGMToChannelProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: intl.formatMessage({id: 'channel_info.convert_gm_to_channel.screen_title', defaultMessage: 'Convert to Private Channel'}),
            ...getHeaderOptions(theme),
        },
    });

    return <ConvertGMToChannelScreen channelId={channelId}/>;
}
