// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ChannelSettingsScreen from '@screens/channel_settings';

type ChannelSettingsProps = {
    channelId: string;
    subtitle: string;
}

export default function ChannelSettingsRoute() {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const {channelId, subtitle} = usePropsFromParams<ChannelSettingsProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({id: 'channel_info.channel_settings', defaultMessage: 'Channel Settings'})}
                    subtitle={subtitle}
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return (
        <ChannelSettingsScreen
            channelId={channelId}
            serverUrl={serverUrl}
        />
    );
}
