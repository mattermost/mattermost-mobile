// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ChannelConfigurationScreen from '@screens/channel_configuration';

type ChannelConfigurationProps = {
    channelId: string;
    subtitle: string;
}

export default function ChannelConfigurationRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const {channelId, subtitle} = usePropsFromParams<ChannelConfigurationProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({id: 'channel_settings.configuration', defaultMessage: 'Configuration'})}
                    subtitle={subtitle}
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return (
        <ChannelConfigurationScreen channelId={channelId}/>
    );
}
