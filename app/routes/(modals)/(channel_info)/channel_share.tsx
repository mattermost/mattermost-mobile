// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useIntl} from 'react-intl';

import NavigationHeaderTitle from '@components/navigation_header_title';
import {useTheme} from '@context/theme';
import {getHeaderOptions, useNavigationHeader} from '@hooks/navigation_header';
import {usePropsFromParams} from '@hooks/props_from_params';
import ChannelShareScreen from '@screens/channel_share';

type ChannelShareProps = {
    channelId: string;
    subtitle: string;
}

export default function ChannelShareRoute() {
    const theme = useTheme();
    const intl = useIntl();
    const {channelId, subtitle} = usePropsFromParams<ChannelShareProps>();

    useNavigationHeader({
        showWhenPushed: true,
        headerOptions: {
            headerTitle: () => (
                <NavigationHeaderTitle
                    title={intl.formatMessage({
                        id: 'channel_settings.share_with_connected_workspaces',
                        defaultMessage: 'Share with connected workspaces',
                    })}
                    subtitle={subtitle}
                />
            ),
            ...getHeaderOptions(theme),
        },
    });

    return (
        <ChannelShareScreen channelId={channelId}/>
    );
}
